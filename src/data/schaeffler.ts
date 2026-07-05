/**
 * Schaeffler diagram geometry (Schaeffler 1949, Metal Progress 56).
 *
 * Coordinates are consensus values from two independent vector digitizations
 * (dacapo welding handbook PDF and Wikimedia Commons "Diagramme schaeffler.svg"),
 * agreeing within ±0.5 equivalent units. x = Cr_eq, y = Ni_eq.
 */

export type Point = [number, number]

export const AXIS = {
  crMin: 0,
  crMax: 40,
  niMin: 0,
  niMax: 32,
} as const

export type RegionId = 'A' | 'A_M' | 'M' | 'F_M' | 'M_F' | 'A_M_F' | 'A_F' | 'F'

export interface Region {
  id: RegionId
  /** Display label */
  label: string
  /** Short label drawn inside the diagram */
  short: string
  polygon: Point[]
  /** Anchor for the in-diagram label */
  labelAt: Point
}

export const REGIONS: Region[] = [
  {
    id: 'A',
    label: 'Austenite',
    short: 'A',
    polygon: [[0, 25.9], [17.7, 11.7], [36.8, 32], [0, 32]],
    labelAt: [14, 24],
  },
  {
    id: 'A_M',
    label: 'Austenite + martensite',
    short: 'A + M',
    polygon: [[0, 25.9], [0, 19.3], [14.2, 7.9], [17.7, 11.7]],
    labelAt: [7, 16.2],
  },
  {
    id: 'M',
    label: 'Martensite',
    short: 'M',
    polygon: [[0, 19.3], [0, 7.8], [2.7, 0], [6.75, 0], [14.2, 7.9]],
    labelAt: [5.5, 7.5],
  },
  {
    id: 'F_M',
    label: 'Ferrite + martensite',
    short: 'F + M',
    polygon: [[0, 7.8], [0, 0], [2.7, 0]],
    labelAt: [0.9, 2.6],
  },
  {
    id: 'M_F',
    label: 'Martensite + ferrite',
    short: 'M + F',
    polygon: [[6.75, 0], [12.2, 0], [20.6, 2.8], [14.2, 7.9]],
    labelAt: [13, 3.4],
  },
  {
    id: 'A_M_F',
    label: 'Austenite + martensite + ferrite',
    short: 'A + M + F',
    polygon: [[14.2, 7.9], [20.6, 2.8], [26.4, 4.7], [17.7, 11.7]],
    labelAt: [19.7, 6.8],
  },
  {
    id: 'A_F',
    label: 'Austenite + ferrite',
    short: 'A + F',
    polygon: [[17.7, 11.7], [26.4, 4.7], [40, 9.2], [40, 32], [36.8, 32]],
    labelAt: [30, 16],
  },
  {
    id: 'F',
    label: 'Ferrite',
    short: 'F',
    polygon: [[12.2, 0], [40, 0], [40, 9.2]],
    labelAt: [30, 3],
  },
]

export interface FerriteLine {
  pct: number
  start: Point
  end: Point
}

/**
 * Iso-ferrite lines in the A+F / A+M+F fields. The 0 % and 100 % lines span
 * the whole diagram; the 5–80 % lines are drawn only above the M/(A+M) boundary.
 */
export const FERRITE_LINES: FerriteLine[] = [
  { pct: 0, start: [6.75, 0], end: [36.8, 32] },
  { pct: 5, start: [15.0, 7.3], end: [39.7, 32] },
  { pct: 10, start: [15.6, 6.8], end: [40, 28.2] },
  { pct: 20, start: [16.6, 6.0], end: [40, 23.3] },
  { pct: 40, start: [17.6, 5.2], end: [40, 19.8] },
  { pct: 80, start: [18.7, 4.3], end: [40, 14.8] },
  { pct: 100, start: [12.2, 0], end: [40, 9.2] },
]
