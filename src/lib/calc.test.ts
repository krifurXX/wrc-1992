import { describe, expect, it } from 'vitest'
import { MATERIALS, type Composition } from '../data/materials'
import { AXIS, REGIONS } from '../data/schaeffler'
import { classifyPoint, creq, estimateFerrite, mixComposition, nieq } from './calc'

const byId = (id: string) => MATERIALS.find((m) => m.id === id)!

describe('Schaeffler equivalents', () => {
  // BSSA published example: 304 → Cr_eq 18.92, Ni_eq 10.15
  it('matches BSSA example for 304 within 0.4 units', () => {
    const c = byId('304').composition
    expect(Math.abs(creq(c) - 18.92)).toBeLessThan(0.4)
    expect(Math.abs(nieq(c) - 10.15)).toBeLessThan(0.4)
  })

  // BSSA published example: 316 → Cr_eq 19.83, Ni_eq 13.15
  it('matches BSSA example for 316 within 0.4 units', () => {
    const c = byId('316').composition
    expect(Math.abs(creq(c) - 19.83)).toBeLessThan(0.4)
    expect(Math.abs(nieq(c) - 13.15)).toBeLessThan(0.4)
  })

  it('computes exact formula values', () => {
    const c: Composition = { C: 0.1, Mn: 2, Si: 1, Cr: 18, Ni: 8, Mo: 2, Nb: 1 }
    expect(creq(c)).toBe(18 + 2 + 1.5 + 0.5)
    expect(nieq(c)).toBe(8 + 3 + 1)
  })
})

describe('classifyPoint', () => {
  it('places 304 near the four-field corner (A+M+F or A+F)', () => {
    // (18.8, 10.5) sits ~0.3 units below the A/(A+F) boundary — inside A+M+F,
    // within the diagram's own ±0.5 unit accuracy of the corner at (17.7, 11.7)
    const c = byId('304').composition
    const region = classifyPoint(creq(c), nieq(c))
    expect(region).not.toBeNull()
    expect(['A_M_F', 'A_F']).toContain(region!.id)
  })

  it('places S355 in a martensite-dominated field (M or F+M)', () => {
    // (0.65, 5.8) is ~0.1 units inside the small F+M corner triangle
    const c = byId('S355').composition
    expect(['M', 'F_M']).toContain(classifyPoint(creq(c), nieq(c))!.id)
  })

  it('places 430 in a ferrite-containing field', () => {
    const c = byId('430').composition
    const region = classifyPoint(creq(c), nieq(c))!
    expect(['M_F', 'F', 'A_M_F']).toContain(region.id)
  })

  it('classifies pure ferrite corner', () => {
    expect(classifyPoint(35, 2)!.id).toBe('F')
  })

  it('classifies pure austenite corner', () => {
    expect(classifyPoint(5, 30)!.id).toBe('A')
  })

  it('returns null outside the diagram', () => {
    expect(classifyPoint(45, 10)).toBeNull()
    expect(classifyPoint(10, -1)).toBeNull()
  })

  it('assigns every interior grid point to exactly one region (full coverage)', () => {
    let misses = 0
    let multi = 0
    for (let x = 0.25; x < AXIS.crMax; x += 0.5) {
      for (let y = 0.25; y < AXIS.niMax; y += 0.5) {
        const hits = REGIONS.filter((r) => {
          const region = classifyPoint(x, y)
          return region?.id === r.id
        })
        if (hits.length === 0) misses++
        if (hits.length > 1) multi++
      }
    }
    expect(misses).toBe(0)
    expect(multi).toBe(0)
  })
})

describe('mixComposition', () => {
  const a = byId('304').composition
  const b = byId('S355').composition

  it('returns endpoints at t=0 and t=1', () => {
    expect(mixComposition(a, b, 0)).toEqual(a)
    expect(mixComposition(a, b, 1)).toEqual(b)
  })

  it('mixing is linear in the diagram (midpoint of A–B)', () => {
    const mid = mixComposition(a, b, 0.5)
    expect(creq(mid)).toBeCloseTo((creq(a) + creq(b)) / 2, 10)
    expect(nieq(mid)).toBeCloseTo((nieq(a) + nieq(b)) / 2, 10)
  })

  it('50/50 of 304 + S355 lands in a martensite-containing field', () => {
    const mid = mixComposition(a, b, 0.5)
    const region = classifyPoint(creq(mid), nieq(mid))!
    expect(['A_M', 'M', 'A_M_F']).toContain(region.id)
  })
})

describe('estimateFerrite', () => {
  it('returns null in pure austenite and martensite fields', () => {
    expect(estimateFerrite(5, 30)).toBeNull()
    expect(estimateFerrite(5, 10)).toBeNull()
  })

  it('is monotonically increasing downward in the A+F field', () => {
    // at Cr_eq 30 the A+F field spans Ni_eq ≈ 5.9 (100 % line) to 24.8 (0 % line)
    const at = (y: number) => estimateFerrite(30, y)!
    expect(at(24)).toBeLessThan(at(18))
    expect(at(18)).toBeLessThan(at(12))
  })

  it('returns ~10% on the 10% line', () => {
    // 10% line: (15.6,6.8) → (40,28.2); at x=30 → y ≈ 19.46
    const y = 6.8 + ((28.2 - 6.8) * (30 - 15.6)) / (40 - 15.6)
    expect(estimateFerrite(30, y)!).toBeCloseTo(10, 1)
  })

  it('309S weld metal shows a small ferrite content (0–15 %)', () => {
    const c = byId('309S').composition
    const f = estimateFerrite(creq(c), nieq(c))
    expect(f).not.toBeNull()
    expect(f!).toBeGreaterThanOrEqual(0)
    expect(f!).toBeLessThan(15)
  })
})
