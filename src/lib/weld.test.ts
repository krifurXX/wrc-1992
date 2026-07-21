/**
 * Mixing / dilution pipeline tests, anchored end-to-end in the worked
 * examples of Kotecki & Siewert (1992) — the paper demonstrates exactly the
 * dilution workflow this app implements.
 */
import { describe, expect, it } from 'vitest'
import { MATERIALS, resolveMaterial, type Composition } from '../data/materials'
import {
  creq,
  estimateFN,
  mixComposition,
  multiPassCompositions,
  nieq,
  weldComposition,
} from './calc'
import { collectWarnings } from './warnings'

const byId = (id: string) => {
  const m = MATERIALS.find((x) => x.id === id)
  if (!m) throw new Error(id)
  return m
}

const ZERO: Composition = { C: 0, Mn: 0, Si: 0, Cr: 0, Ni: 0, Mo: 0, Nb: 0, N: 0, Cu: 0 }

// paper Table 2/3 compositions (all-weld-metal and typical plate)
const AISI_1050: Composition = { ...ZERO, C: 0.5, Mn: 0.3, Si: 0.02, N: 0.004 }
const E312_16: Composition = { ...ZERO, C: 0.06, Mn: 1.2, Si: 0.6, Cr: 29.0, Ni: 8.6, N: 0.06 }
const AISI_304: Composition = { ...ZERO, C: 0.05, Mn: 1.6, Si: 0.4, Cr: 18.75, Ni: 9.9, Mo: 0.08, N: 0.04 }
const ASTM_A36: Composition = { ...ZERO, C: 0.2, Mn: 0.8, Si: 0.2, N: 0.004 }
const E309L_16: Composition = { ...ZERO, C: 0.03, Mn: 1.4, Si: 0.6, Cr: 24.4, Ni: 12.7, Mo: 0.2, N: 0.06 }

describe('paper Example 1 — cladding AISI 1050 with E312-16, 30 % dilution', () => {
  it('reproduces point C = (20.30, 13.60) and FN ≈ 4.6', () => {
    const weld = weldComposition(AISI_1050, E312_16, 0.3)
    expect(creq(weld)).toBeCloseTo(20.3, 1)
    expect(nieq(weld)).toBeCloseTo(13.6, 1)
    const fn = estimateFN(creq(weld), nieq(weld))
    expect(fn).not.toBeNull()
    expect(Math.abs(fn! - 4.6)).toBeLessThanOrEqual(2)
  })

  it('the E312-16 electrode itself predicts ~88 FN', () => {
    expect(creq(E312_16)).toBeCloseTo(29.0, 2)
    expect(nieq(E312_16)).toBeCloseTo(11.9, 2)
    const fn = estimateFN(29.0, 11.9)
    expect(Math.abs(fn! - 88.2)).toBeLessThanOrEqual(4)
  })
})

describe('paper Example 2 — joining 304 to A36 with E309L-16', () => {
  it('reproduces point H = (20.04, 13.39) and FN ≈ 4.3 at 30 % root dilution', () => {
    const baseMix = mixComposition(AISI_304, ASTM_A36, 0.5)
    const weld = weldComposition(baseMix, E309L_16, 0.3)
    expect(creq(weld)).toBeCloseTo(20.04, 1)
    expect(nieq(weld)).toBeCloseTo(13.39, 1)
    const fn = estimateFN(creq(weld), nieq(weld))
    expect(fn).not.toBeNull()
    expect(Math.abs(fn! - 4.3)).toBeLessThanOrEqual(2)
  })
})

describe('mixComposition / weldComposition structure', () => {
  const a = byId('304').composition
  const b = byId('S355').composition
  const f = byId('ER309L').composition

  it('endpoints are exact', () => {
    expect(mixComposition(a, b, 0)).toEqual(a)
    expect(mixComposition(a, b, 1)).toEqual(b)
    expect(weldComposition(mixComposition(a, b, 0.5), f, 0)).toEqual(f)
  })

  it('mixes N and Cu linearly like every other element', () => {
    const mid = mixComposition(a, b, 0.5)
    expect(mid.N).toBeCloseTo((a.N + b.N) / 2, 12)
    expect(mid.Cu).toBeCloseTo((a.Cu + b.Cu) / 2, 12)
  })

  it('multi-pass converges geometrically toward the filler with ratio D_fill', () => {
    const base = mixComposition(a, b, 0.5)
    const Dfill = 0.25
    const comps = multiPassCompositions(base, f, 0.3, Dfill, 6)
    const dist = (c: Composition) => Math.hypot(creq(c) - creq(f), nieq(c) - nieq(f))
    for (let i = 1; i < comps.length; i++) {
      expect(dist(comps[i]) / dist(comps[i - 1])).toBeCloseTo(Dfill, 8)
    }
  })
})

describe('multiPassCompositions with a buffer layer', () => {
  const base = mixComposition(byId('304').composition, byId('S355').composition, 0.5)
  const cBuffer = byId('ER309L').composition // the classic buffer alloy
  const cCladding = byId('316L').composition

  it('omitting the buffer param matches the plain five-argument call', () => {
    expect(multiPassCompositions(base, cCladding, 0.3, 0.25, 4, undefined)).toEqual(
      multiPassCompositions(base, cCladding, 0.3, 0.25, 4),
    )
  })

  it('pass 1 uses the buffer filler with D_root against the base mix', () => {
    const buffer = { filler: cBuffer, passes: 2 }
    const [first] = multiPassCompositions(base, cCladding, 0.3, 0.25, 5, buffer)
    expect(first).toEqual(weldComposition(base, cBuffer, 0.3))
  })

  it('a buffer pass after the first uses the buffer filler with D_fill against the previous pass', () => {
    const buffer = { filler: cBuffer, passes: 2 }
    const comps = multiPassCompositions(base, cCladding, 0.3, 0.25, 5, buffer)
    expect(comps[1]).toEqual(weldComposition(comps[0], cBuffer, 0.25))
  })

  it('the switch pass uses the cladding filler against the last buffer pass', () => {
    const buffer = { filler: cBuffer, passes: 2 }
    const comps = multiPassCompositions(base, cCladding, 0.3, 0.25, 5, buffer)
    expect(comps[2]).toEqual(weldComposition(comps[1], cCladding, 0.25))
  })

  it('converges toward the cladding filler with ratio D_fill from the switch onward', () => {
    const Dfill = 0.25
    const buffer = { filler: cBuffer, passes: 2 }
    const comps = multiPassCompositions(base, cCladding, 0.3, Dfill, 6, buffer)
    const dist = (c: Composition) =>
      Math.hypot(creq(c) - creq(cCladding), nieq(c) - nieq(cCladding))
    for (let i = buffer.passes; i < comps.length; i++) {
      expect(dist(comps[i]) / dist(comps[i - 1])).toBeCloseTo(Dfill, 8)
    }
  })

  it('buffer.passes = passes makes the buffer the sole filler', () => {
    const buffer = { filler: cBuffer, passes: 3 }
    expect(multiPassCompositions(base, cCladding, 0.3, 0.25, 3, buffer)).toEqual(
      multiPassCompositions(base, cBuffer, 0.3, 0.25, 3),
    )
  })
})

describe('resolveMaterial', () => {
  it('preset returns the MATERIALS object', () => {
    expect(resolveMaterial({ kind: 'preset', id: '2205' })).toBe(byId('2205'))
  })

  it('custom wraps the composition', () => {
    const m = resolveMaterial({ kind: 'custom', composition: E312_16 })
    expect(m.id).toBe('custom')
    expect(m.composition).toBe(E312_16)
  })
})

describe('collectWarnings — WRC-1992 validity rules', () => {
  it('flags N above the 0.2 % database limit', () => {
    const highN = resolveMaterial({ kind: 'custom', composition: { ...ZERO, Cr: 20, Ni: 10, N: 0.3 } })
    const w = collectWarnings([{ label: 'Material A', material: highN }], [{ x: 20, y: 12 }])
    expect(w.some((x) => x.id === 'limit-N-Material A')).toBe(true)
  })

  it('flags Mn above 10 %', () => {
    const highMn = resolveMaterial({ kind: 'custom', composition: { ...ZERO, Cr: 20, Ni: 10, Mn: 12 } })
    const w = collectWarnings([{ label: 'Filler C', material: highMn }], [{ x: 20, y: 12 }])
    expect(w.some((x) => x.id === 'limit-Mn-Filler C')).toBe(true)
  })

  it('describes off-axes base metals as normal, not as errors', () => {
    const s355 = byId('S355')
    const w = collectWarnings([{ label: 'Material B', material: s355 }], [{ x: 20, y: 13 }])
    const msg = w.find((x) => x.id === 'outside-Material B')
    expect(msg).toBeDefined()
    expect(msg!.text).toContain('normal for unalloyed steels')
  })

  it('adds the high-FN accuracy note above FN 50', () => {
    const w = collectWarnings([], [{ x: 25.95, y: 12.03 }]) // ≈56 FN anchor point
    expect(w.some((x) => x.id === 'high-fn')).toBe(true)
  })

  it('warns when the weld point is outside the iso-FN fan', () => {
    const w = collectWarnings([], [{ x: 28.0, y: 16.9 }])
    expect(w.some((x) => x.id === 'outside-fan')).toBe(true)
  })

  it('warns about martensite in the lower-left corner', () => {
    const w = collectWarnings([], [{ x: 18, y: 10 }])
    expect(w.some((x) => x.id === 'martensite-risk')).toBe(true)
  })
})
