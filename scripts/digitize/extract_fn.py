#!/usr/bin/env python3
"""Step 2: extract the 30 thick iso-FN lines from fig6.png.

Method: erode the ink mask so only thick strokes survive (grid, dash-dot mode
boundaries and thin text vanish), take connected components inside the plot
frame, keep elongated ones, merge collinear pieces (labels interrupt lines),
then total-least-squares fit one line per merged cluster. FN values are
assigned by sorted position across the fan. Output: fn_lines.json.
"""
import json
import os

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
cal = json.load(open(os.path.join(HERE, 'calibration.json')))
AX, BX, AY, BY = cal['ax'], cal['bx'], cal['ay'], cal['by']

def to_units(px, py):
    return (px - BX) / AX, (py - BY) / AY

im = cv2.imread(os.path.join(HERE, 'fig6.png'), cv2.IMREAD_GRAYSCALE)
_, ink = cv2.threshold(im, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

# restrict to inside the plot frame with a small inset so the frame itself
# and axis labels are excluded
f = cal['frame']
inset = 18  # frame stroke is thick; stay well inside it
mask = np.zeros_like(ink)
mask[int(f['y_top']) + inset : int(f['y_bot']) - inset, int(f['x0']) + inset : int(f['x1']) - inset] = 255
ink = cv2.bitwise_and(ink, mask)

# erode: grid ~2-4 px, iso-FN strokes much thicker. Try to find a kernel where
# exactly the fan survives; report stroke stats to the console.
ERODE = int(os.environ.get('ERODE', '11'))
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ERODE, ERODE))
thick = cv2.erode(ink, kernel)
thick = cv2.dilate(thick, kernel)  # restore extent of what survived

n, labels, stats, _ = cv2.connectedComponentsWithStats(thick)
print(f'erode={ERODE}: {n - 1} components')

pieces = []
for i in range(1, n):
    x, y, w, h, area = stats[i]
    if area < 2000:  # specks, leftover label bits
        continue
    ys, xs = np.nonzero(labels == i)
    pts = np.column_stack([xs, ys]).astype(float)
    mean = pts.mean(axis=0)
    u, s, vt = np.linalg.svd(pts - mean, full_matrices=False)
    elong = s[0] / max(s[1], 1e-9)
    length = s[0] * 2  # ~2 std along the major axis
    if elong < 8 or length < 250:  # digits/blobs are compact, lines are long
        continue
    d = vt[0]  # unit direction
    pieces.append({'mean': mean, 'dir': d if d[0] > 0 else -d, 'pts': pts, 'len': length})

print(f'{len(pieces)} elongated pieces')

# merge collinear pieces: same angle (within ~1.5 deg) and small perpendicular
# offset between the two fitted lines
def perp_offset(a, b):
    n_ = np.array([-a['dir'][1], a['dir'][0]])
    return abs(np.dot(b['mean'] - a['mean'], n_))

merged = []
used = [False] * len(pieces)
order = sorted(range(len(pieces)), key=lambda i: -pieces[i]['len'])
for i in order:
    if used[i]:
        continue
    cluster = [pieces[i]]
    used[i] = True
    changed = True
    while changed:
        changed = False
        for j in order:
            if used[j]:
                continue
            ref = cluster[0]
            angle = np.degrees(np.arccos(np.clip(abs(np.dot(ref['dir'], pieces[j]['dir'])), 0, 1)))
            if angle < 1.5 and perp_offset(ref, pieces[j]) < 18:
                cluster.append(pieces[j])
                used[j] = True
                changed = True
    allpts = np.vstack([c['pts'] for c in cluster])
    mean = allpts.mean(axis=0)
    _, _, vt = np.linalg.svd(allpts - mean, full_matrices=False)
    d = vt[0]
    if d[0] < 0:
        d = -d
    t = (allpts - mean) @ d
    p1 = mean + t.min() * d
    p2 = mean + t.max() * d
    merged.append({'p1': p1, 'p2': p2, 'npts': len(allpts)})

print(f'{len(merged)} merged lines')

# sort across the fan: x-coordinate where each (infinite) line crosses the
# horizontal midline Nieq = 13.5 increases monotonically with FN.
# FN = 0 is NOT in this set: it is drawn dash-dot (curved) and is digitized by
# extract_dashdot.py together with the solidification-mode boundaries.
FN_VALUES = list(range(2, 31, 2)) + list(range(35, 101, 5))
y_mid = AY * 13.5 + BY
def x_at_mid(m):
    (x1, y1), (x2, y2) = m['p1'], m['p2']
    if abs(y2 - y1) < 1e-9:
        return (x1 + x2) / 2
    t = (y_mid - y1) / (y2 - y1)
    return x1 + t * (x2 - x1)

merged.sort(key=x_at_mid)
for m in merged:
    (x1, y1) = to_units(*m['p1'])
    (x2, y2) = to_units(*m['p2'])
    print('  line: (%.2f, %.2f) -> (%.2f, %.2f)  npts=%d' % (x1, y1, x2, y2, m['npts']))

if len(merged) != len(FN_VALUES):
    print(f'!! expected {len(FN_VALUES)} lines, got {len(merged)} — adjust ERODE or thresholds')
    # dump with index labels for overlay diagnosis
    raw = []
    for i, m in enumerate(merged):
        u1 = to_units(*m['p1'])
        u2 = to_units(*m['p2'])
        raw.append({'fn': f'i{i}', 'start': [round(u1[0], 2), round(u1[1], 2)], 'end': [round(u2[0], 2), round(u2[1], 2)]})
    json.dump(raw, open(os.path.join(HERE, 'fn_lines.json'), 'w'), indent=1)
    raise SystemExit(1)

out = []
for fn, m in zip(FN_VALUES, merged):
    u1 = to_units(*m['p1'])
    u2 = to_units(*m['p2'])
    # normalize orientation: start = lower-Creq endpoint
    if u1[0] > u2[0]:
        u1, u2 = u2, u1
    out.append({'fn': fn, 'start': [round(u1[0], 2), round(u1[1], 2)], 'end': [round(u2[0], 2), round(u2[1], 2)]})

json.dump(out, open(os.path.join(HERE, 'fn_lines.json'), 'w'), indent=1)
print(f'wrote fn_lines.json with {len(out)} lines')
