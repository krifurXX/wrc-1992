#!/usr/bin/env python3
"""Step 3: extract the dash-dot curves (FN=0 line + solidification-mode
boundaries). They are thin, dashed and slightly curved, so: mask out grid,
frame and thick iso-FN lines, chain the remaining dash/dot pieces into curves
by proximity, and sample each curve as a polyline. Output: dashdot.json with
one polyline per curve (units), plus a diagnostic PNG.
"""
import json
import os

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
cal = json.load(open(os.path.join(HERE, 'calibration.json')))
AX, BX, AY, BY = cal['ax'], cal['bx'], cal['ay'], cal['by']
f = cal['frame']

def to_units(px, py):
    return ((px - BX) / AX, (py - BY) / AY)

im = cv2.imread(os.path.join(HERE, 'fig6.png'), cv2.IMREAD_GRAYSCALE)
_, ink = cv2.threshold(im, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

inset = 18
mask = np.zeros_like(ink)
mask[int(f['y_top']) + inset : int(f['y_bot']) - inset, int(f['x0']) + inset : int(f['x1']) - inset] = 255
work = cv2.bitwise_and(ink, mask)

# remove straight grid lines
KLEN = 1200
vert = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, KLEN)))
horz = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (KLEN, 1)))
grid = cv2.dilate(cv2.bitwise_or(vert, horz), np.ones((9, 9), np.uint8))
work = cv2.bitwise_and(work, cv2.bitwise_not(grid))

# remove thick iso-FN strokes (same recipe as extract_fn)
ERODE = 11
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ERODE, ERODE))
thick = cv2.dilate(cv2.erode(cv2.bitwise_and(ink, mask), k), k)
thick = cv2.dilate(thick, np.ones((13, 13), np.uint8))
work = cv2.bitwise_and(work, cv2.bitwise_not(thick))

# what remains: dash/dot pieces, text labels, leftover slivers of thick lines
n, labels, stats, cents = cv2.connectedComponentsWithStats(work)
pieces = []
for i in range(1, n):
    x, y, w, h, area = stats[i]
    if area < 40 or area > 4000:
        continue
    if max(w, h) > 220:  # text strokes / long slivers
        continue
    pieces.append({'c': cents[i], 'area': area})
print(f'{len(pieces)} dash/dot candidate pieces')

pts = np.array([p['c'] for p in pieces])

# Direction-aware greedy tracing. The curves run diagonally up-right with
# slopes between ~20 and ~60 deg in pixel space (y decreases with x). Start at
# the leftmost unused piece, then repeatedly link the best next piece to the
# right whose direction stays close to the current heading. Direction gating
# keeps two nearby parallel curves apart even with a generous gap.
GAP = 320
used = [False] * len(pieces)
order = np.argsort(pts[:, 0])
curves = []
for start in order:
    if used[start]:
        continue
    chain = [start]
    used[start] = True
    heading = np.deg2rad(-40)  # initial guess: up-right in image coords
    while True:
        cur = pts[chain[-1]]
        best = None
        for j in np.nonzero(~np.array(used))[0]:
            d = pts[j] - cur
            dist = np.hypot(*d)
            if d[0] <= 10 or dist > GAP:
                continue
            ang = np.arctan2(d[1], d[0])
            dang = abs(np.angle(np.exp(1j * (ang - heading))))
            if dang > np.deg2rad(22):
                continue
            score = dist + 300 * dang
            if best is None or score < best[0]:
                best = (score, j, ang)
        if best is None:
            break
        _, j, ang = best
        chain.append(j)
        used[j] = True
        heading = 0.6 * heading + 0.4 * ang
    if len(chain) >= 5:
        cpts = pts[chain]
        if cpts[:, 0].max() - cpts[:, 0].min() >= 500:
            curves.append(cpts[np.argsort(cpts[:, 0])])
            continue
    # short chain: release pieces so a longer curve from another seed can claim them
    for j in chain:
        used[j] = False
    # but keep the seed consumed to guarantee termination
    used[start] = True

print(f'{len(curves)} chained curves, sizes: {[len(c) for c in curves]}')

# merge chains that continue each other (a curve can be cut where it crosses
# many thick iso-FN lines): A's right end ~lines up with B's left start
def end_dir(c, tail=6):
    seg = c[-tail:] if len(c) >= tail else c
    d = seg[-1] - seg[0]
    return d / max(np.hypot(*d), 1e-9)

changed = True
while changed:
    changed = False
    for a in range(len(curves)):
        for b in range(len(curves)):
            if a == b:
                continue
            A, B = curves[a], curves[b]
            gap = B[0] - A[-1]
            dist = np.hypot(*gap)
            if gap[0] <= 0 or dist > 800:
                continue
            d = end_dir(A)
            ang = abs(np.angle(np.exp(1j * (np.arctan2(gap[1], gap[0]) - np.arctan2(d[1], d[0])))))
            if ang > np.deg2rad(18):
                continue
            curves[a] = np.vstack([A, B])
            del curves[b]
            changed = True
            break
        if changed:
            break

curves = [c for c in curves if c[:, 0].max() - c[:, 0].min() >= 1200]
print(f'{len(curves)} curves after merging, sizes: {[len(c) for c in curves]}')

# The FA/F boundary crosses the densest part of the fan and fragments too much
# for free chaining. Guided pass: collect ALL pieces near a rough seed polyline
# (read off the figure), then fit a quadratic. Seeds in diagram units:
SEED_FAF = [(17.1, 9.45), (19.0, 10.7), (21.0, 12.2), (23.0, 13.9), (24.8, 15.2)]

def units_of(p):
    return ((p[0] - BX) / AX, (p[1] - BY) / AY)

def seed_y(x):
    xs_ = [s[0] for s in SEED_FAF]
    ys_ = [s[1] for s in SEED_FAF]
    return np.interp(x, xs_, ys_)

# the free-traced short fan-crossing chain (if any) is the right half of the
# same FA/F boundary — fold its pieces into the guided fit
faf_seed_chains = [c for c in curves if units_of(c[0])[1] > 11.5 and units_of(c[0])[0] > 20]
curves = [c for c in curves if c is not faf_seed_chains[0]] if faf_seed_chains else curves

taken = set()
for c in curves:
    for p in c:
        taken.add((round(p[0]), round(p[1])))

faf_pts = [p for chain in faf_seed_chains for p in chain]
for p in pts:
    if (round(p[0]), round(p[1])) in taken:
        continue
    ux, uy = units_of(p)
    if ux < 16.9 or ux > 25.3:
        continue
    if abs(uy - seed_y(ux)) <= 0.30:
        faf_pts.append(p)
faf_pts = np.array(faf_pts)
print(f'guided FA/F: {len(faf_pts)} pieces in corridor')
if len(faf_pts) >= 10:
    ux = (faf_pts[:, 0] - BX) / AX
    uy = (faf_pts[:, 1] - BY) / AY
    for _ in range(3):  # robust: drop outliers and refit
        coef = np.polyfit(ux, uy, 2)
        resid = uy - np.polyval(coef, ux)
        keep = np.abs(resid) < max(2 * resid.std(), 0.08)
        if keep.all():
            break
        ux, uy = ux[keep], uy[keep]
    xs_s = np.arange(ux.min(), ux.max() + 0.25, 0.5)
    poly_px = np.array([[AX * x + BX, AY * np.polyval(coef, x) + BY] for x in xs_s])
    curves.append(poly_px)
    print('FA/F quadratic fit: %d pts kept, resid max %.3f units, x range %.2f..%.2f'
          % (len(ux), np.abs(uy - np.polyval(coef, ux)).max(), ux.min(), ux.max()))

# sample each curve as a polyline: moving average over x-windows
out = []
diag = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
colors = [(255, 0, 0), (0, 160, 0), (0, 0, 255), (255, 0, 255), (0, 200, 200)]
for ci, cpts in enumerate(curves):
    xs = cpts[:, 0]
    poly = []
    win = 172  # ~0.5 Creq units
    for xc in np.arange(xs.min(), xs.max() + 1, win):
        sel = cpts[(xs >= xc - win * 0.75) & (xs <= xc + win * 0.75)]
        if len(sel) == 0:
            continue
        poly.append((float(np.median(sel[:, 0])), float(np.median(sel[:, 1]))))
    # dedupe/sort
    poly = sorted(poly)
    upoly = [[round(v, 2) for v in to_units(px, py)] for px, py in poly]
    out.append({'id': f'curve{ci}', 'points': upoly})
    for a, b in zip(poly, poly[1:]):
        cv2.line(diag, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), colors[ci % len(colors)], 5)
    p0 = poly[0]
    cv2.putText(diag, f'c{ci}', (int(p0[0]) - 90, int(p0[1])), cv2.FONT_HERSHEY_SIMPLEX, 2.5, colors[ci % len(colors)], 6)
    print(f'curve{ci}: {len(upoly)} pts, from {upoly[0]} to {upoly[-1]}')

json.dump(out, open(os.path.join(HERE, 'dashdot.json'), 'w'), indent=1)
small = cv2.resize(diag, (diag.shape[1] // 5, diag.shape[0] // 5))
cv2.imwrite(os.path.join(HERE, 'dashdot_diag.png'), small)
print('wrote dashdot.json + dashdot_diag.png')
