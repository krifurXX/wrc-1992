#!/usr/bin/env python3
"""Step 4: assemble the digitized geometry, verify it against the numeric
anchors from the original paper, and only then emit src/data/wrc1992.ts.

Anchors: Kotecki & Siewert, Welding Journal 71(5) 1992 — worked Examples 1-2
and Table 1 (calculated FN column). If any anchor fails its tolerance, the
script exits nonzero and no TypeScript is written.
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AXIS = {'crMin': 17, 'crMax': 31, 'niMin': 9, 'niMax': 18}

fn_lines = json.load(open(os.path.join(HERE, 'fn_lines.json')))
dashdot = json.load(open(os.path.join(HERE, 'dashdot.json')))
assert len(fn_lines) == 29 and fn_lines[0]['fn'] == 2 and fn_lines[-1]['fn'] == 100

# identify the three dash-dot curves by height at Creq = 20
def y_at(pts, x):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return np.interp(x, xs, ys)

curves = sorted((c['points'] for c in dashdot), key=lambda p: -y_at(p, 20))
fn0, af_fa, fa_f = curves  # highest → lowest at Creq 20
print('FN0/A-AF   : %s .. %s' % (fn0[0], fn0[-1]))
print('AF/FA      : %s .. %s' % (af_fa[0], af_fa[-1]))
print('FA/F       : %s .. %s' % (fa_f[0], fa_f[-1]))

# ---- FN interpolation (mirror of the TypeScript implementation) ----
# every "line" is a polyline oriented with increasing Creq
ALL = [{'fn': 0, 'pts': fn0}] + [{'fn': l['fn'], 'pts': [l['start'], l['end']]} for l in fn_lines]

def signed_dist(p, pts):
    """Signed perpendicular distance from p to polyline pts.
    Positive = low-FN side (above-left of an up-right oriented line)."""
    best = None
    for a, b in zip(pts, pts[1:]):
        ax, ay = a
        bx, by = b
        vx, vy = bx - ax, by - ay
        L = np.hypot(vx, vy)
        t = ((p[0] - ax) * vx + (p[1] - ay) * vy) / (L * L)
        t = max(0.0, min(1.0, t))
        qx, qy = ax + t * vx, ay + t * vy
        d = np.hypot(p[0] - qx, p[1] - qy)
        cross = vx * (p[1] - ay) - vy * (p[0] - ax)
        s = d if cross > 0 else -d
        if best is None or d < abs(best):
            best = s
    return best

def interp_fn(x, y):
    p = (x, y)
    ds = [signed_dist(p, l['pts']) for l in ALL]
    # ds should go from negative (low-fn lines are on the p's upper-left ->
    # p below them -> cross<0) to positive... find the sign flip
    for i in range(len(ALL) - 1):
        if ds[i] <= 0 <= ds[i + 1]:
            a, b = abs(ds[i]), abs(ds[i + 1])
            return ALL[i]['fn'] + a / (a + b) * (ALL[i + 1]['fn'] - ALL[i]['fn'])
    if ds[0] > 0:
        return 0.0  # above the FN-0 line
    if ds[-1] < 0:
        return None  # beyond FN 100
    return None

# ---- anchors ----
ANCHORS = [
    # (Creq, Nieq, expected FN, tol, source)
    (20.30, 13.60, 4.6, 2, 'Example 1 point C'),
    (29.00, 11.90, 88.2, 4, 'Example 1 E312-16'),
    (24.60, 14.95, 17.4, 2, 'Example 2 E309L-16'),
    (20.04, 13.39, 4.3, 2, 'Example 2 point H'),
    (18.83, 12.45, 3.2, 2, 'Example 2 AISI 304'),
    (28.61, 15.81, 36, 4, 'Table 1 weld 9292-622'),
    (28.14, 14.57, 46, 4, 'Table 1 weld 9276-057'),
    (23.13, 10.81, 40, 4, 'Table 1 weld 9276-854'),
    (25.95, 12.03, 56, 4, 'Table 1 weld 9276-904'),
    (23.72, 10.36, 54, 4, 'Table 1 weld 9276-853'),
    (24.02, 9.81, 69, 4, 'Table 1 weld 9276-817'),
    (28.19, 10.66, 99, 5, 'Table 1 weld 9292-202'),
]
fails = 0
print('\nAnchor check:')
for x, y, exp, tol, src in ANCHORS:
    got = interp_fn(x, y)
    ok = got is not None and abs(got - exp) <= tol
    flag = 'OK ' if ok else 'FAIL'
    print(f'  {flag} ({x:5.2f},{y:5.2f}) expected {exp:5.1f} got {got if got is None else round(got,1)} (tol ±{tol}) [{src}]')
    if not ok:
        fails += 1

# monotonicity sweep along Nieq = 12 inside the fan
prev = -1
for x in np.arange(20.4, 30.0, 0.2):
    v = interp_fn(x, 12.0)
    if v is None:
        continue
    if v < prev - 1e-9:
        print(f'  FAIL monotonicity at x={x:.1f}: {v:.2f} < {prev:.2f}')
        fails += 1
    prev = v

if fails:
    print(f'\n{fails} anchor failures — NOT emitting TypeScript')
    sys.exit(1)
print('\nAll anchors passed.')

# ---- assemble polygons ----
def extend_to(p_from, p_to, x=None, y=None):
    """Linear extension of segment p_from->p_to until x or y is reached."""
    dx, dy = p_to[0] - p_from[0], p_to[1] - p_from[1]
    if x is not None:
        t = (x - p_to[0]) / dx
    else:
        t = (y - p_to[1]) / dy
    return [round(p_to[0] + t * dx, 2), round(p_to[1] + t * dy, 2)]

R = lambda p: [round(p[0], 2), round(p[1], 2)]

# extended boundaries for mode classification (invisible parts included)
fn0_ext = [extend_to(fn0[1], fn0[0], x=17.0)] + [R(p) for p in fn0] + [extend_to(fn0[-2], fn0[-1], y=18.0)]
affa_ext = [extend_to(af_fa[1], af_fa[0], x=17.0)] + [R(p) for p in af_fa] + [extend_to(af_fa[-2], af_fa[-1], y=18.0)]
faf_ext = [extend_to(fa_f[1], fa_f[0], x=17.0)] + [R(p) for p in fa_f] + [extend_to(fa_f[-2], fa_f[-1], y=18.0)]
for name, ext in [('fn0_ext', fn0_ext), ('affa_ext', affa_ext), ('faf_ext', faf_ext)]:
    print(name, ext[0], '...', ext[-1])
    assert 17 <= ext[-1][0] <= 31, f'{name} top exit outside axis: {ext[-1]}'

# mode polygons tile the axis rectangle; boundaries all run left-edge -> top-edge
A_poly = [[17, 18]] + [fn0_ext[-1]] + list(reversed(fn0_ext[1:-1])) + [fn0_ext[0]]
AF_poly = [fn0_ext[0]] + fn0_ext[1:-1] + [fn0_ext[-1], affa_ext[-1]] + list(reversed(affa_ext[1:-1])) + [affa_ext[0]]
FA_poly = [affa_ext[0]] + affa_ext[1:-1] + [affa_ext[-1], faf_ext[-1]] + list(reversed(faf_ext[1:-1])) + [faf_ext[0]]
F_poly = [faf_ext[0]] + faf_ext[1:-1] + [faf_ext[-1], [31, 18], [31, 9], [17, 9]]

# FN validity fan
env_top = []  # upper envelope: FN2 end .. FN100 end (in increasing x)
for l in fn_lines:
    env_top.append(l['end'])
first_line_starts = [l['start'] for l in fn_lines]
fn0_top_y = env_top[0][1]  # ~17.05 — cap FN0 at the solid-line end height
fn0_capped = [p for p in fn0 if p[1] <= fn0_top_y]
fn0_cap_end = [round(float(np.interp(fn0_top_y, [p[1] for p in fn0], [p[0] for p in fn0])), 2), round(fn0_top_y, 2)]
valid = (
    [fn0_capped[0]]
    + [[17.0, round(first_line_starts[0][1], 2)]]
    + [[17.0, 9.05]]
    + [first_line_starts[-1]]
    + [fn_lines[-1]['end']]
    + list(reversed(env_top[:-1]))
    + [fn0_cap_end]
    + list(reversed(fn0_capped[1:]))
)
valid = [R(p) for p in valid]

# ---- emit TypeScript ----
def ts_pts(pts):
    return '[' + ', '.join(f'[{p[0]}, {p[1]}]' for p in pts) + ']'

lines_ts = ',\n'.join(
    f"  {{ fn: {l['fn']}, points: [[{l['start'][0]}, {l['start'][1]}], [{l['end'][0]}, {l['end'][1]}]] }}"
    for l in fn_lines
)
fn0_ts = ts_pts([R(p) for p in fn0])

ts = f"""// GENERATED by scripts/digitize/build_ts.py — DO NOT EDIT BY HAND.
// Digitized from Kotecki & Siewert, "WRC-1992 Constitution Diagram for
// Stainless Steel Weld Metals", Welding Journal 71(5) 1992, Fig. 6 (600 dpi,
// least-squares grid calibration, residuals < 0.02 eq-units), and verified
// against the paper's own worked examples and Table 1 before emission.
// Re-run the digitization pipeline if this file ever needs to change.

export type Point = [number, number]

export const AXIS = {{ crMin: 17, crMax: 31, niMin: 9, niMax: 18 }} as const

export type ModeId = 'A' | 'AF' | 'FA' | 'F'

export interface Mode {{
  id: ModeId
  label: string
  short: string
  polygon: Point[]
  labelAt: Point
}}

/** Solidification-mode regions. Polygons tile the whole axis rectangle;
 * boundary segments beyond the drawn dash-dot extents are linear
 * extrapolations used for classification only (not drawn). */
export const MODES: Mode[] = [
  {{
    id: 'A',
    label: 'Fully austenitic solidification (A)',
    short: 'A',
    polygon: {ts_pts(A_poly)},
    labelAt: [18.2, 16],
  }},
  {{
    id: 'AF',
    label: 'Austenitic-ferritic solidification (AF)',
    short: 'AF',
    polygon: {ts_pts(AF_poly)},
    labelAt: [19.6, 14.3],
  }},
  {{
    id: 'FA',
    label: 'Ferritic-austenitic solidification (FA)',
    short: 'FA',
    polygon: {ts_pts(FA_poly)},
    labelAt: [20.0, 12.3],
  }},
  {{
    id: 'F',
    label: 'Fully ferritic solidification (F)',
    short: 'F',
    polygon: {ts_pts(F_poly)},
    labelAt: [22.3, 10.4],
  }},
]

/** Dash-dot curves as drawn in Fig. 6 (digitized extents only). The FN = 0
 * line doubles as the A/AF boundary. */
export interface ModeBoundary {{
  between: [ModeId, ModeId]
  points: Point[]
}}
export const MODE_BOUNDARIES: ModeBoundary[] = [
  {{ between: ['A', 'AF'], points: {fn0_ts} }},
  {{ between: ['AF', 'FA'], points: {ts_pts([R(p) for p in af_fa])} }},
  {{ between: ['FA', 'F'], points: {ts_pts([R(p) for p in fa_f])} }},
]

/** Iso-Ferrite-Number lines. FN = 0 is the curved dash-dot polyline; the
 * rest are straight. Points are oriented with increasing Creq. */
export interface FnLine {{
  fn: number
  points: Point[]
}}
export const FN_LINES: FnLine[] = [
  {{ fn: 0, points: {fn0_ts} }},
{lines_ts},
]

/** Fan-shaped region where the iso-FN lines are drawn — FN prediction is
 * only valid inside it (Fig. 6 caption). */
export const FN_VALID_POLYGON: Point[] = {ts_pts(valid)}
"""

out = os.path.join(HERE, '..', '..', 'src', 'data', 'wrc1992.ts')
open(out, 'w').write(ts)
print(f'\nwrote {os.path.normpath(out)}')
