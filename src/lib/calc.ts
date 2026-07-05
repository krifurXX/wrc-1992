import type { Composition } from '../data/materials'
import { AXIS, FERRITE_LINES, REGIONS, type Point, type Region } from '../data/schaeffler'

/** Cr_eq = %Cr + %Mo + 1.5·%Si + 0.5·%Nb  (Schaeffler 1949) */
export function creq(c: Composition): number {
  return c.Cr + c.Mo + 1.5 * c.Si + 0.5 * c.Nb
}

/** Ni_eq = %Ni + 30·%C + 0.5·%Mn  (Schaeffler 1949) */
export function nieq(c: Composition): number {
  return c.Ni + 30 * c.C + 0.5 * c.Mn
}

/**
 * Element-wise linear mix: t = fraction of B (0–1).
 * Because creq/nieq are linear in composition, the mixed point also moves
 * linearly along the A–B line in the diagram.
 */
export function mixComposition(a: Composition, b: Composition, t: number): Composition {
  // (1-t)·a + t·b is exact at both endpoints, unlike a + (b-a)·t
  const lerp = (p: number, q: number) => (1 - t) * p + t * q
  return {
    C: lerp(a.C, b.C),
    Mn: lerp(a.Mn, b.Mn),
    Si: lerp(a.Si, b.Si),
    Cr: lerp(a.Cr, b.Cr),
    Ni: lerp(a.Ni, b.Ni),
    Mo: lerp(a.Mo, b.Mo),
    Nb: lerp(a.Nb, b.Nb),
  }
}

/**
 * Weld metal = D·baseMix + (1−D)·filler, where D = dilution
 * (the fraction of the weld metal that is melted base metal).
 */
export function weldComposition(
  baseMix: Composition,
  filler: Composition,
  dilution: number,
): Composition {
  return mixComposition(filler, baseMix, dilution)
}

/**
 * Multi-pass model: the root pass dilutes the filler with the base-metal mix,
 * subsequent passes dilute the filler with the previous pass:
 *   c_1 = (1−D_root)·filler + D_root·baseMix
 *   c_n = (1−D_fill)·filler + D_fill·c_{n−1}   (n ≥ 2)
 * Compositions converge geometrically toward the filler (ratio D_fill per pass).
 * Returns one composition per pass (length = passes).
 */
export function multiPassCompositions(
  baseMix: Composition,
  filler: Composition,
  rootDilution: number,
  fillDilution: number,
  passes: number,
): Composition[] {
  const out: Composition[] = []
  let prev = baseMix
  for (let i = 0; i < passes; i++) {
    prev = weldComposition(prev, filler, i === 0 ? rootDilution : fillDilution)
    out.push(prev)
  }
  return out
}

export function isInsideDiagram(x: number, y: number): boolean {
  return x >= AXIS.crMin && x <= AXIS.crMax && y >= AXIS.niMin && y <= AXIS.niMax
}

/** Ray-casting point-in-polygon, counting points on an edge as inside. */
function inPolygon(x: number, y: number, poly: Point[]): boolean {
  const eps = 1e-9
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    // on-edge check
    const cross = (xj - xi) * (y - yi) - (yj - yi) * (x - xi)
    const dot = (x - xi) * (x - xj) + (y - yi) * (y - yj)
    if (Math.abs(cross) < 1e-6 && dot <= eps) return true
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Returns the phase field containing (Cr_eq, Ni_eq), or null outside the diagram. */
export function classifyPoint(x: number, y: number): Region | null {
  if (!isInsideDiagram(x, y)) return null
  for (const region of REGIONS) {
    if (inPolygon(x, y, region.polygon)) return region
  }
  return null
}

function lineYat(line: { start: Point; end: Point }, x: number): number {
  const [x1, y1] = line.start
  const [x2, y2] = line.end
  return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1)
}

/** Everything the UI needs to know about one composition's diagram point. */
export interface PointAnalysis {
  x: number
  y: number
  region: Region | null
  ferritePct: number | null
}

export function analyzeComposition(c: Composition): PointAnalysis {
  const x = creq(c)
  const y = nieq(c)
  return { x, y, region: classifyPoint(x, y), ferritePct: estimateFerrite(x, y) }
}

/**
 * Estimate ferrite content by interpolating between iso-ferrite lines.
 * Only meaningful in the A+F and A+M+F fields; returns null elsewhere.
 */
export function estimateFerrite(x: number, y: number): number | null {
  const region = classifyPoint(x, y)
  if (!region || (region.id !== 'A_F' && region.id !== 'A_M_F')) return null

  // y-values of all iso-lines at this x, ordered 0% (top) → 100% (bottom)
  const ys = FERRITE_LINES.map((l) => ({ pct: l.pct, y: lineYat(l, x) }))
  if (y >= ys[0].y) return 0
  const last = ys[ys.length - 1]
  if (y <= last.y) return 100
  for (let i = 0; i < ys.length - 1; i++) {
    const hi = ys[i] // lower pct, higher y
    const lo = ys[i + 1]
    if (y <= hi.y && y >= lo.y) {
      const f = (hi.y - y) / (hi.y - lo.y)
      return hi.pct + f * (lo.pct - hi.pct)
    }
  }
  return null
}
