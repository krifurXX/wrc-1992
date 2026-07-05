import type { Material } from '../data/materials'
import { creq, isInsideDiagram, nieq } from './calc'

export interface Warning {
  id: string
  text: string
}

export interface LabeledMaterial {
  label: string
  material: Material
}

/**
 * Validation rules for the Schaeffler prediction. Thresholds and wording are
 * pedagogical choices — adjust to match course terminology.
 */
const HIGH_CARBON_LIMIT = 0.12 // above this, the 30·C term grows unreliable (carbides)

export function collectWarnings(
  inputs: LabeledMaterial[],
  passPoints: { x: number; y: number }[],
): Warning[] {
  const warnings: Warning[] = []

  for (const { material: m, label } of inputs) {
    if (!isInsideDiagram(creq(m.composition), nieq(m.composition))) {
      warnings.push({
        id: `outside-${label}`,
        text: `${label} (${m.designation}) lies outside the valid area of the diagram — the reading is an extrapolation.`,
      })
    }
    if (m.nitrogenAlloyed) {
      warnings.push({
        id: `nitrogen-${label}`,
        text: `${label} (${m.designation}) is nitrogen-alloyed. The Schaeffler diagram does not account for nitrogen and underestimates the nickel equivalent by about 30·%N units — use the DeLong or WRC-1992 diagram instead.`,
      })
    }
    if (m.composition.C > HIGH_CARBON_LIMIT) {
      warnings.push({
        id: `carbon-${label}`,
        text: `${label} (${m.designation}) has a high carbon content (${m.composition.C.toFixed(2)} %). The 30·%C term becomes unreliable above ${HIGH_CARBON_LIMIT} % C because carbides bind part of the carbon.`,
      })
    }
  }

  const final = passPoints[passPoints.length - 1]
  if (final && !isInsideDiagram(final.x, final.y)) {
    warnings.push({
      id: 'outside-weld',
      text: 'The weld metal point lies outside the valid area of the diagram.',
    })
  } else if (passPoints.slice(0, -1).some((p) => !isInsideDiagram(p.x, p.y))) {
    warnings.push({
      id: 'outside-pass',
      text: 'One or more intermediate pass points lie outside the valid area of the diagram.',
    })
  }

  return warnings
}

/** Always shown below the result — the diagram is an estimate, not a phase fraction. */
export const DISCLAIMER =
  'The Schaeffler diagram applies to weld metal cooled at arc-welding rates and gives an estimate of the microstructure — not exact phase fractions. Schaeffler himself quoted an accuracy of about ±4 % ferrite.'
