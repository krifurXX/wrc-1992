import type { Composition } from '../data/materials'
import {
  AXIS,
  FN_LINES,
  FN_VALID_POLYGON,
  MODES,
  type Mode,
  type Point,
} from '../data/wrc1992'

/** Cr_eq = %Cr + %Mo + 0.7·%Nb  (Kotecki & Siewert, WRC-1992) */
export function creq(c: Composition): number {
  return c.Cr + c.Mo + 0.7 * c.Nb
}

/** Ni_eq = %Ni + 35·%C + 20·%N + 0.25·%Cu  (Kotecki & Siewert, WRC-1992) */
export function nieq(c: Composition): number {
  return c.Ni + 35 * c.C + 20 * c.N + 0.25 * c.Cu
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
    N: lerp(a.N, b.N),
    Cu: lerp(a.Cu, b.Cu),
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
export function inPolygon(x: number, y: number, poly: Point[]): boolean {
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

/** Returns the solidification mode containing (Cr_eq, Ni_eq), or null outside the diagram. */
export function classifyPoint(x: number, y: number): Mode | null {
  if (!isInsideDiagram(x, y)) return null
  for (const mode of MODES) {
    if (inPolygon(x, y, mode.polygon)) return mode
  }
  return null
}

/**
 * Signed perpendicular distance from (x, y) to a polyline oriented with
 * increasing Creq. Positive = the low-FN side (above-left of the line).
 */
function signedDistance(x: number, y: number, pts: Point[]): number {
  let best = Infinity
  let bestSigned = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const vx = bx - ax
    const vy = by - ay
    const len2 = vx * vx + vy * vy
    let t = ((x - ax) * vx + (y - ay) * vy) / len2
    t = Math.max(0, Math.min(1, t))
    const qx = ax + t * vx
    const qy = ay + t * vy
    const d = Math.hypot(x - qx, y - qy)
    if (d < best) {
      best = d
      const cross = vx * (y - ay) - vy * (x - ax)
      bestSigned = cross > 0 ? d : -d
    }
  }
  return bestSigned
}

/**
 * Interpolated Ferrite Number.
 * - Inside the iso-FN fan: signed-perpendicular-distance interpolation
 *   between the two bracketing iso-FN lines (handles the non-parallel fan
 *   and the nonuniform FN steps 0,2,…,30,35,…,100).
 * - In the fully austenitic A region: 0 by definition.
 * - Elsewhere (outside the drawn lines): null — the paper warns that
 *   extending the lines "could result in erroneous predictions".
 */
export function estimateFN(x: number, y: number): number | null {
  if (inPolygon(x, y, FN_VALID_POLYGON)) {
    const ds = FN_LINES.map((l) => signedDistance(x, y, l.points))
    for (let i = 0; i < FN_LINES.length - 1; i++) {
      if (ds[i] <= 0 && ds[i + 1] >= 0) {
        const a = Math.abs(ds[i])
        const b = Math.abs(ds[i + 1])
        return FN_LINES[i].fn + (a / (a + b)) * (FN_LINES[i + 1].fn - FN_LINES[i].fn)
      }
    }
    // numerically on the outermost lines
    if (ds[0] > 0) return 0
    if (ds[ds.length - 1] < 0) return 100
    return null
  }
  const mode = classifyPoint(x, y)
  if (mode?.id === 'A') return 0
  return null
}

/** Everything the UI needs to know about one composition's diagram point. */
export interface PointAnalysis {
  x: number
  y: number
  mode: Mode | null
  fn: number | null
}

export function analyzeComposition(c: Composition): PointAnalysis {
  const x = creq(c)
  const y = nieq(c)
  return { x, y, mode: classifyPoint(x, y), fn: estimateFN(x, y) }
}
