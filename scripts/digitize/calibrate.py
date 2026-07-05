#!/usr/bin/env python3
"""Step 1: find the plot frame and grid lines in fig6.png, fit px<->(Creq,Nieq).

The grid is 1 unit in both axes: x = 17..31 (15 vertical lines), y = 9..18
(10 horizontal lines), frame included. Outputs calibration.json.
"""
import json
import os

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
im = cv2.imread(os.path.join(HERE, 'fig6.png'), cv2.IMREAD_GRAYSCALE)
print('image:', im.shape)

# ink mask
_, ink = cv2.threshold(im, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

# long straight strokes only (kills diagonal iso-FN lines and text)
KLEN = 1200
vert = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, KLEN)))
horz = cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (KLEN, 1)))

# column/row profiles restricted to the central band to avoid page margins
h, w = ink.shape
colprof = vert[h // 4 : 3 * h // 4, :].sum(axis=0) / 255
rowprof = horz[:, w // 4 : 3 * w // 4].sum(axis=1) / 255


def peaks(profile, min_height, min_dist):
    idx = []
    above = profile > min_height
    i = 0
    n = len(profile)
    while i < n:
        if above[i]:
            j = i
            while j < n and above[j]:
                j += 1
            seg = profile[i:j]
            center = i + int(np.average(np.arange(len(seg)), weights=seg))
            if not idx or center - idx[-1] >= min_dist:
                idx.append(center)
            else:
                # merge: keep the stronger one
                if profile[center] > profile[idx[-1]]:
                    idx[-1] = center
            i = j
        else:
            i += 1
    return idx


xcands = peaks(colprof, min_height=KLEN * 0.6, min_dist=60)
ycands = peaks(rowprof, min_height=KLEN * 0.6, min_dist=60)

# grid lines live inside the plot frame: restrict each axis's candidates to
# the pixel span actually covered by the OTHER axis's long lines (kills page
# banner rules that happen to sit on the grid lattice)
vrows = np.nonzero(vert.sum(axis=1))[0]
hcols = np.nonzero(horz.sum(axis=0))[0]
ycands = [c for c in ycands if vrows.min() - 50 <= c <= vrows.max() + 50]
xcands = [c for c in xcands if hcols.min() - 50 <= c <= hcols.max() + 50]
print('vertical line candidates:', len(xcands), xcands[:20])
print('horizontal line candidates:', len(ycands), ycands[:20])

# Expect vertical lines at Creq 17..31 and horizontal at Nieq 9..18, 1-unit
# spacing. Tolerate missing/broken grid lines: map candidates to integer grid
# indices via the median spacing, then least-squares fit over what was found.
def index_fit(cands, min_found, max_count):
    cands = np.array(cands, dtype=float)
    # keep the longest chain whose consecutive gaps are ~multiples of the step
    diffs = np.diff(cands)
    step = np.median(diffs)  # robust: most gaps are exactly one grid unit
    # anchor on the candidate with the most step-multiple neighbors
    best_axis = None
    for anchor in cands:
        idx = np.round((cands - anchor) / step)
        resid = np.abs(cands - (anchor + idx * step))
        ok = resid < step * 0.2
        if best_axis is None or ok.sum() > best_axis[2].sum():
            best_axis = (anchor, idx, ok)
    anchor, idx, ok = best_axis
    sel, isel = cands[ok], idx[ok]
    isel -= isel.min()
    # page furniture (banner rules) can land on the lattice far from the plot:
    # keep the densest window spanning at most max_count indices
    best_win = None
    for lo in np.unique(isel):
        inwin = (isel >= lo) & (isel < lo + max_count)
        if best_win is None or inwin.sum() > best_win.sum():
            best_win = inwin
    sel, isel = sel[best_win], isel[best_win]
    isel -= isel.min()
    assert isel.max() < max_count, f'grid span too wide: {isel.max()}'
    assert len(sel) >= min_found, f'too few grid lines: {len(sel)}'
    return sel, isel.astype(int)


xs, xi = index_fit(xcands, min_found=12, max_count=15)
ys, yi = index_fit(ycands, min_found=9, max_count=10)
print('grid x lines: %d of 15 at indices %s' % (len(xs), xi.tolist()))
print('grid y lines: %d of 10 at indices %s' % (len(ys), yi.tolist()))

# least-squares linear fits; x index 0 = Creq 17, y index 0 = topmost found row
cr_vals = 17 + xi
ni_vals = 18 - yi  # top row = Nieq 18, increasing index downward
bx = np.polyfit(cr_vals, xs, 1)
by = np.polyfit(ni_vals, ys, 1)
resx = xs - np.polyval(bx, cr_vals)
resy = ys - np.polyval(by, ni_vals)
print('x fit: px = %.4f * Creq + %.2f  | residuals px: max %.2f' % (bx[0], bx[1], np.abs(resx).max()))
print('y fit: px = %.4f * Nieq + %.2f  | residuals px: max %.2f' % (by[0], by[1], np.abs(resy).max()))
print('units: 1 Creq = %.1f px, 1 Nieq = %.1f px' % (bx[0], -by[0]))
print('residuals in units: x %.4f, y %.4f' % (np.abs(resx).max() / bx[0], np.abs(resy).max() / abs(by[0])))

json.dump(
    {
        'ax': bx[0], 'bx': bx[1], 'ay': by[0], 'by': by[1],
        'frame': {
            'x0': float(np.polyval(bx, 17)), 'x1': float(np.polyval(bx, 31)),
            'y_top': float(np.polyval(by, 18)), 'y_bot': float(np.polyval(by, 9)),
        },
    },
    open(os.path.join(HERE, 'calibration.json'), 'w'),
    indent=1,
)
print('wrote calibration.json')
