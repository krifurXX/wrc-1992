/**
 * Geometry contract for the digitized WRC-1992 data.
 *
 * Anchors come from the original paper (Kotecki & Siewert, Welding Journal
 * 71(5) 1992): the worked Examples 1-2 and the "Calculated FN" column of
 * Table 1. Tolerances: ±2 FN where the expectation is ≤ 30 FN, ±4 FN above
 * (the paper itself flags reduced accuracy at high FN), ±5 for the single
 * anchor at the FN = 100 edge.
 *
 * If these tests fail after touching src/data/wrc1992.ts, re-run the
 * digitization pipeline (scripts/digitize/) — do not tweak the data by hand.
 */
import { describe, expect, it } from 'vitest'
import type { Composition } from '../data/materials'
import { classifyPoint, creq, estimateFN, nieq } from './calc'

describe('WRC-1992 equivalents', () => {
  it('reproduces the paper Table 3 values for AISI 304 exactly', () => {
    // C .05, Mn 1.60, Si .40, Cr 18.75, Ni 9.90, Mo .08, N .04
    const c304: Composition = { C: 0.05, Mn: 1.6, Si: 0.4, Cr: 18.75, Ni: 9.9, Mo: 0.08, Nb: 0, N: 0.04, Cu: 0 }
    expect(creq(c304)).toBeCloseTo(18.83, 2)
    expect(nieq(c304)).toBeCloseTo(12.45, 2)
  })

  it('includes N, Cu and Nb with the 1992 coefficients', () => {
    const c: Composition = { C: 0.1, Mn: 2, Si: 1, Cr: 20, Ni: 10, Mo: 2, Nb: 1, N: 0.1, Cu: 2 }
    expect(creq(c)).toBeCloseTo(20 + 2 + 0.7, 10)
    expect(nieq(c)).toBeCloseTo(10 + 3.5 + 2 + 0.5, 10)
  })
})

describe('estimateFN against the paper anchors', () => {
  const ANCHORS: [number, number, number, number, string][] = [
    [20.30, 13.60, 4.6, 2, 'Example 1 point C'],
    [29.00, 11.90, 88.2, 4, 'Example 1 E312-16'],
    [24.60, 14.95, 17.4, 2, 'Example 2 E309L-16'],
    [20.04, 13.39, 4.3, 2, 'Example 2 point H'],
    [18.83, 12.45, 3.2, 2, 'Example 2 AISI 304'],
    // Table 1 weld 9292-622 sits at (28.61, 15.81), a hair beyond the drawn
    // tip of the FN 35 line (the paper computed its FN from the regression,
    // not the diagram). Probed just inside the fan instead; the exact
    // original point is asserted null in the domain suite below.
    [28.10, 15.50, 36, 4, 'Table 1 weld 9292-622 (probed inside the fan)'],
    [28.14, 14.57, 46, 4, 'Table 1 weld 9276-057'],
    [23.13, 10.81, 40, 4, 'Table 1 weld 9276-854'],
    [25.95, 12.03, 56, 4, 'Table 1 weld 9276-904'],
    [23.72, 10.36, 54, 4, 'Table 1 weld 9276-853'],
    [24.02, 9.81, 69, 4, 'Table 1 weld 9276-817'],
    [28.19, 10.66, 99, 5, 'Table 1 weld 9292-202 (FN 100 edge)'],
  ]
  for (const [x, y, expected, tol, name] of ANCHORS) {
    it(`${name}: (${x}, ${y}) → ${expected} FN`, () => {
      const fn = estimateFN(x, y)
      expect(fn).not.toBeNull()
      expect(Math.abs(fn! - expected)).toBeLessThanOrEqual(tol)
    })
  }

  it('2205 + ER2209 duplex weld pool lands in the Table-1-consistent FN band', () => {
    // A published case study quotes 42.7 FN at ~(25.68, 12.0), but the
    // paper's own Table 1 has weld 9276-904 at (25.95, 12.03) with
    // calculated FN 56 (measured 60) — the paper outranks the blog, so we
    // assert consistency with Table 1: FN 48–60 at this point.
    const fn = estimateFN(25.68, 12.0)
    expect(fn).not.toBeNull()
    expect(fn!).toBeGreaterThanOrEqual(48)
    expect(fn!).toBeLessThanOrEqual(60)
  })
})

describe('estimateFN domain behavior', () => {
  it('returns 0 in the fully austenitic A region', () => {
    expect(estimateFN(18.2, 16)).toBe(0)
  })

  it('returns null beyond the drawn iso-FN fan (paper: do not extrapolate)', () => {
    expect(estimateFN(30.5, 17.5)).toBeNull()
    expect(estimateFN(28.0, 16.9)).toBeNull()
    // Table 1 weld 9292-622 — just past the FN 35 line tip
    expect(estimateFN(28.61, 15.81)).toBeNull()
  })

  it('returns null outside the diagram axes', () => {
    expect(estimateFN(10, 12)).toBeNull()
    expect(estimateFN(25, 20)).toBeNull()
  })

  it('reads ~2 and ~100 on the outermost straight lines', () => {
    // midpoints of the digitized FN 2 and FN 100 lines
    expect(estimateFN((17.04 + 22.15) / 2, (10.9 + 17.08) / 2)!).toBeLessThanOrEqual(3)
    expect(estimateFN((24.89 + 30.7) / 2, (9.05 + 11.8) / 2)!).toBeGreaterThanOrEqual(97)
  })

  it('FN increases monotonically with Creq along a transect', () => {
    let prev = -1
    for (let x = 20.4; x < 30; x += 0.2) {
      const v = estimateFN(x, 12)
      if (v === null) continue
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = v
    }
    expect(prev).toBeGreaterThan(60) // the sweep reached the high-FN side
  })
})

describe('solidification mode classification', () => {
  it('classifies one interior point per mode', () => {
    expect(classifyPoint(18.2, 16)?.id).toBe('A')
    expect(classifyPoint(19.6, 14.3)?.id).toBe('AF')
    expect(classifyPoint(20.0, 12.3)?.id).toBe('FA')
    expect(classifyPoint(22.3, 10.4)?.id).toBe('F')
  })

  it('duplex weld metal solidifies ferritically', () => {
    expect(classifyPoint(25.68, 12.0)?.id).toBe('F')
  })

  it('returns null outside the axes', () => {
    expect(classifyPoint(16, 12)).toBeNull()
    expect(classifyPoint(25, 8)).toBeNull()
  })

  it('every 0.5-unit interior grid point belongs to exactly one mode', () => {
    for (let x = 17.25; x < 31; x += 0.5) {
      for (let y = 9.25; y < 18; y += 0.5) {
        const mode = classifyPoint(x, y)
        expect(mode, `(${x}, ${y})`).not.toBeNull()
      }
    }
  })
})
