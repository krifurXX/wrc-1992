/** Chemical composition in weight-%. Elements not listed are treated as 0.
 * N and Cu matter here: the WRC-1992 nickel equivalent includes both. */
export interface Composition {
  C: number
  Mn: number
  Si: number
  Cr: number
  Ni: number
  Mo: number
  Nb: number
  N: number
  Cu: number
}

export interface Material {
  id: string
  /** Common trade name, e.g. "Stainless 304" */
  name: string
  /** EN / AISI / AWS designation */
  designation: string
  /** Typical mid-range composition used for plotting */
  composition: Composition
  /** Standard range, for display (free text per element) */
  range?: Partial<Record<keyof Composition, string>>
  group: 'austenitic' | 'ferritic' | 'martensitic' | 'duplex' | 'unalloyed' | 'custom'
}

/** What the user picked in a material slot: a preset steel or a user-defined composition. */
export type MaterialSelection =
  | { kind: 'preset'; id: string }
  | { kind: 'custom'; composition: Composition }

export const EMPTY_COMPOSITION: Composition = {
  C: 0, Mn: 0, Si: 0, Cr: 0, Ni: 0, Mo: 0, Nb: 0, N: 0, Cu: 0,
}

/** Resolve a selection to a plain Material so everything downstream stays unchanged. */
export function resolveMaterial(sel: MaterialSelection): Material {
  if (sel.kind === 'preset') {
    const m = MATERIALS.find((x) => x.id === sel.id)
    if (!m) throw new Error(`Unknown material id: ${sel.id}`)
    return m
  }
  return {
    id: 'custom',
    name: 'Custom alloy',
    designation: 'user-defined',
    composition: sel.composition,
    group: 'custom',
  }
}

export const MATERIALS: Material[] = [
  {
    id: '304',
    name: 'Austenitic stainless 304',
    designation: 'EN 1.4301 / AISI 304',
    composition: { C: 0.04, Mn: 1.5, Si: 0.4, Cr: 18.2, Ni: 8.5, Mo: 0, Nb: 0, N: 0.05, Cu: 0.2 },
    range: { C: '≤ 0.07', Mn: '≤ 2.0', Si: '≤ 1.0', Cr: '17.5–19.5', Ni: '8.0–10.5', N: '≤ 0.11' },
    group: 'austenitic',
  },
  {
    id: '304L',
    name: 'Austenitic stainless 304L',
    designation: 'EN 1.4307 / AISI 304L',
    composition: { C: 0.02, Mn: 1.5, Si: 0.4, Cr: 18.2, Ni: 8.5, Mo: 0, Nb: 0, N: 0.05, Cu: 0.2 },
    range: { C: '≤ 0.030', Mn: '≤ 2.0', Si: '≤ 1.0', Cr: '17.5–19.5', Ni: '8.0–10.5', N: '≤ 0.10' },
    group: 'austenitic',
  },
  {
    id: '316',
    name: 'Acid-resistant stainless 316',
    designation: 'EN 1.4401 / AISI 316',
    composition: { C: 0.04, Mn: 1.5, Si: 0.4, Cr: 17.2, Ni: 11.0, Mo: 2.1, Nb: 0, N: 0.05, Cu: 0.2 },
    range: { C: '≤ 0.07', Mn: '≤ 2.0', Si: '≤ 1.0', Cr: '16.5–18.5', Ni: '10.0–13.0', Mo: '2.0–2.5', N: '≤ 0.11' },
    group: 'austenitic',
  },
  {
    id: '316L',
    name: 'Acid-resistant stainless 316L',
    designation: 'EN 1.4404 / AISI 316L',
    composition: { C: 0.02, Mn: 1.5, Si: 0.4, Cr: 17.2, Ni: 11.0, Mo: 2.1, Nb: 0, N: 0.05, Cu: 0.2 },
    range: { C: '≤ 0.030', Mn: '≤ 2.0', Si: '≤ 1.0', Cr: '16.5–18.5', Ni: '10.0–13.0', Mo: '2.0–2.5', N: '≤ 0.11' },
    group: 'austenitic',
  },
  {
    id: '309S',
    name: 'Heat-resistant stainless 309S',
    designation: 'EN 1.4833 / AISI 309S',
    composition: { C: 0.05, Mn: 1.5, Si: 0.5, Cr: 22.5, Ni: 13.0, Mo: 0, Nb: 0, N: 0.05, Cu: 0.1 },
    range: { C: '≤ 0.08', Mn: '≤ 2.0', Si: '≤ 1.0', Cr: '22.0–24.0', Ni: '12.0–15.0' },
    group: 'austenitic',
  },
  {
    id: '2205',
    name: 'Duplex stainless 2205',
    designation: 'EN 1.4462 / UNS S32205',
    composition: { C: 0.02, Mn: 1.5, Si: 0.4, Cr: 22.4, Ni: 5.7, Mo: 3.2, Nb: 0, N: 0.17, Cu: 0.1 },
    range: { C: '≤ 0.030', Mn: '≤ 2.0', Si: '≤ 1.0', Cr: '22.0–23.0', Ni: '4.5–6.5', Mo: '3.0–3.5', N: '0.14–0.20' },
    group: 'duplex',
  },
  {
    id: '430',
    name: 'Ferritic stainless 430',
    designation: 'EN 1.4016 / AISI 430',
    composition: { C: 0.05, Mn: 0.5, Si: 0.4, Cr: 16.5, Ni: 0.2, Mo: 0, Nb: 0, N: 0.03, Cu: 0.1 },
    range: { C: '≤ 0.08', Mn: '≤ 1.0', Si: '≤ 1.0', Cr: '16.0–18.0' },
    group: 'ferritic',
  },
  {
    id: '410',
    name: 'Martensitic stainless 410',
    designation: 'EN 1.4006 / AISI 410',
    composition: { C: 0.12, Mn: 0.5, Si: 0.3, Cr: 12.5, Ni: 0.3, Mo: 0, Nb: 0, N: 0.02, Cu: 0.1 },
    range: { C: '0.08–0.15', Mn: '≤ 1.5', Si: '≤ 1.0', Cr: '11.5–13.5', Ni: '≤ 0.75' },
    group: 'martensitic',
  },
  {
    id: 'ER309L',
    name: 'Filler ER309L',
    designation: 'EN ISO 14343-A: G 23 12 L',
    composition: { C: 0.02, Mn: 1.8, Si: 0.45, Cr: 23.5, Ni: 13.5, Mo: 0.1, Nb: 0, N: 0.06, Cu: 0.15 },
    range: { C: '≤ 0.03', Mn: '1.0–2.5', Si: '0.30–0.65', Cr: '22.0–25.0', Ni: '12.0–14.0' },
    group: 'austenitic',
  },
  {
    id: 'ER2209',
    name: 'Filler ER2209 (duplex)',
    designation: 'EN ISO 14343-A: G 22 9 3 N L',
    composition: { C: 0.02, Mn: 1.6, Si: 0.5, Cr: 22.9, Ni: 8.6, Mo: 3.1, Nb: 0, N: 0.15, Cu: 0.1 },
    range: { C: '≤ 0.03', Mn: '0.5–2.0', Si: '≤ 0.9', Cr: '21.5–23.5', Ni: '7.5–9.5', Mo: '2.5–3.5', N: '0.08–0.20' },
    group: 'duplex',
  },
  {
    id: 'E312',
    name: 'Filler E312-16',
    designation: 'AWS A5.4 E312-16',
    // all-weld-metal composition from Kotecki & Siewert (1992), Table 2
    composition: { C: 0.06, Mn: 1.2, Si: 0.6, Cr: 29.0, Ni: 8.6, Mo: 0, Nb: 0, N: 0.06, Cu: 0 },
    range: { C: '≤ 0.15', Mn: '0.5–2.5', Si: '≤ 1.0', Cr: '28.0–32.0', Ni: '8.0–10.5' },
    group: 'duplex',
  },
  {
    id: 'S355',
    name: 'Structural steel S355',
    designation: 'EN 10025-2 / S355J2',
    composition: { C: 0.17, Mn: 1.4, Si: 0.4, Cr: 0.05, Ni: 0.04, Mo: 0, Nb: 0, N: 0.008, Cu: 0.2 },
    range: { C: '≤ 0.20', Mn: '≤ 1.60', Si: '≤ 0.55' },
    group: 'unalloyed',
  },
]
