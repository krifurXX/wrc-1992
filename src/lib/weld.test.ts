import { describe, expect, it } from 'vitest'
import { MATERIALS, resolveMaterial, type Composition } from '../data/materials'
import {
  analyzeComposition,
  classifyPoint,
  creq,
  isInsideDiagram,
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

const c304 = byId('304').composition
const cS355 = byId('S355').composition
const cFiller = byId('ER309L').composition

const ELEMENTS = ['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'Nb'] as const

describe('weldComposition', () => {
  it('D = 1 returns the base mix exactly', () => {
    const base = mixComposition(c304, cS355, 0.5)
    expect(weldComposition(base, cFiller, 1)).toEqual(base)
  })

  it('D = 0 returns the filler exactly', () => {
    const base = mixComposition(c304, cS355, 0.5)
    expect(weldComposition(base, cFiller, 0)).toEqual(cFiller)
  })

  it('is linear in the diagram: creq(weld) = (1−D)·creq(filler) + D·creq(base)', () => {
    const base = mixComposition(c304, cS355, 0.5)
    const D = 0.3
    const weld = weldComposition(base, cFiller, D)
    expect(creq(weld)).toBeCloseTo((1 - D) * creq(cFiller) + D * creq(base), 10)
    expect(nieq(weld)).toBeCloseTo((1 - D) * nieq(cFiller) + D * nieq(base), 10)
  })

  it('two-step mix matches the hand-computed ternary blend', () => {
    const s = 0.3
    const D = 0.4
    const base = mixComposition(c304, cS355, s)
    const weld = weldComposition(base, cFiller, D)
    for (const el of ELEMENTS) {
      const expected = (1 - D) * cFiller[el] + D * ((1 - s) * c304[el] + s * cS355[el])
      expect(weld[el]).toBeCloseTo(expected, 12)
    }
  })
})

describe('multiPassCompositions', () => {
  const base = mixComposition(c304, cS355, 0.5)

  it('returns one composition per pass', () => {
    expect(multiPassCompositions(base, cFiller, 0.4, 0.25, 5)).toHaveLength(5)
  })

  it('pass 1 uses the root dilution against the base mix', () => {
    const [first] = multiPassCompositions(base, cFiller, 0.4, 0.25, 3)
    expect(first).toEqual(weldComposition(base, cFiller, 0.4))
  })

  it('converges geometrically toward the filler with ratio D_fill per pass', () => {
    const Dfill = 0.25
    const comps = multiPassCompositions(base, cFiller, 0.4, Dfill, 6)
    const fx = creq(cFiller)
    const fy = nieq(cFiller)
    const dist = (c: Composition) => Math.hypot(creq(c) - fx, nieq(c) - fy)
    for (let i = 1; i < comps.length; i++) {
      expect(dist(comps[i]) / dist(comps[i - 1])).toBeCloseTo(Dfill, 8)
    }
  })

  it('lands essentially on the filler point after 10 passes at D_fill = 0.25', () => {
    const comps = multiPassCompositions(base, cFiller, 0.4, 0.25, 10)
    const last = comps[comps.length - 1]
    const d = Math.hypot(creq(last) - creq(cFiller), nieq(last) - nieq(cFiller))
    expect(d).toBeLessThan(0.01)
  })

  it('D_fill = 0 makes every pass after the first equal to the filler', () => {
    const comps = multiPassCompositions(base, cFiller, 0.4, 0, 4)
    expect(comps[1]).toEqual(cFiller)
    expect(comps[3]).toEqual(cFiller)
  })
})

describe('resolveMaterial', () => {
  it('preset returns the object from MATERIALS', () => {
    expect(resolveMaterial({ kind: 'preset', id: '304' })).toBe(byId('304'))
  })

  it('custom wraps the composition with id "custom"', () => {
    const comp: Composition = { C: 0.1, Mn: 1, Si: 0.5, Cr: 20, Ni: 10, Mo: 0, Nb: 0 }
    const m = resolveMaterial({ kind: 'custom', composition: comp })
    expect(m.id).toBe('custom')
    expect(m.group).toBe('custom')
    expect(m.composition).toBe(comp)
  })
})

describe('custom composition edge cases', () => {
  it('all-zero composition sits at the diagram origin, inside bounds', () => {
    const zero: Composition = { C: 0, Mn: 0, Si: 0, Cr: 0, Ni: 0, Mo: 0, Nb: 0 }
    expect(creq(zero)).toBe(0)
    expect(nieq(zero)).toBe(0)
    expect(isInsideDiagram(0, 0)).toBe(true)
  })

  it('Creq beyond the axis is classified as outside (null)', () => {
    expect(classifyPoint(41, 10)).toBeNull()
  })

  it('analyzeComposition bundles point, region and ferrite', () => {
    const a = analyzeComposition(c304)
    expect(a.x).toBeCloseTo(creq(c304), 12)
    expect(a.y).toBeCloseTo(nieq(c304), 12)
    expect(a.region).not.toBeNull()
  })
})

describe('collectWarnings (labeled materials + pass points)', () => {
  it('labels the high-carbon warning with the custom material label', () => {
    const highC = resolveMaterial({
      kind: 'custom',
      composition: { C: 0.5, Mn: 1, Si: 0.4, Cr: 5, Ni: 1, Mo: 0, Nb: 0 },
    })
    const warnings = collectWarnings([{ label: 'Material A', material: highC }], [{ x: 10, y: 10 }])
    const w = warnings.find((x) => x.id === 'carbon-Material A')
    expect(w).toBeDefined()
    expect(w!.text).toContain('Material A')
  })

  it('reports the final point outside the diagram as a weld warning', () => {
    const warnings = collectWarnings([], [{ x: 10, y: 10 }, { x: 45, y: 10 }])
    expect(warnings.some((w) => w.id === 'outside-weld')).toBe(true)
    expect(warnings.some((w) => w.id === 'outside-pass')).toBe(false)
  })

  it('reports an intermediate pass outside the diagram separately', () => {
    const warnings = collectWarnings([], [{ x: 45, y: 10 }, { x: 10, y: 10 }])
    expect(warnings.some((w) => w.id === 'outside-pass')).toBe(true)
    expect(warnings.some((w) => w.id === 'outside-weld')).toBe(false)
  })

  it('produces independently labeled warnings for three materials', () => {
    const s355 = byId('S355') // C 0.17 > 0.12 limit
    const warnings = collectWarnings(
      [
        { label: 'Material A', material: s355 },
        { label: 'Material B', material: s355 },
        { label: 'Filler C', material: s355 },
      ],
      [{ x: 10, y: 10 }],
    )
    expect(warnings.filter((w) => w.id.startsWith('carbon-'))).toHaveLength(3)
  })
})
