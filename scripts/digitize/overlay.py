#!/usr/bin/env python3
"""Redraw digitized lines in red on top of fig6.png for visual verification."""
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
cal = json.load(open(os.path.join(HERE, 'calibration.json')))
AX, BX, AY, BY = cal['ax'], cal['bx'], cal['ay'], cal['by']

def to_px(x, y):
    return int(round(AX * x + BX)), int(round(AY * y + BY))

im = cv2.cvtColor(cv2.imread(os.path.join(HERE, 'fig6.png'), cv2.IMREAD_GRAYSCALE), cv2.COLOR_GRAY2BGR)

if os.path.exists(os.path.join(HERE, 'fn_lines.json')):
    for line in json.load(open(os.path.join(HERE, 'fn_lines.json'))):
        p1 = to_px(*line['start'])
        p2 = to_px(*line['end'])
        cv2.line(im, p1, p2, (0, 0, 255), 5)
        mid = ((p1[0] + p2[0]) // 2, (p1[1] + p2[1]) // 2 - 30)
        cv2.putText(im, str(line['fn']), mid, cv2.FONT_HERSHEY_SIMPLEX, 2.2, (0, 0, 255), 6)

if os.path.exists(os.path.join(HERE, 'dashdot.json')):
    for b in json.load(open(os.path.join(HERE, 'dashdot.json'))):
        pts = [to_px(*p) for p in b['points']]
        for a, c in zip(pts, pts[1:]):
            cv2.line(im, a, c, (255, 0, 0), 5)

cv2.imwrite(os.path.join(HERE, 'overlay.png'), im)
small = cv2.resize(im, (im.shape[1] // 5, im.shape[0] // 5))
cv2.imwrite(os.path.join(HERE, 'overlay_small.png'), small)
print('wrote overlay.png / overlay_small.png')
