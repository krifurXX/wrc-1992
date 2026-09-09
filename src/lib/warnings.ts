import type { Material } from '../data/materials'
import { creq, estimateFN, isInsideDiagram, nieq } from './calc'

export interface Warning {
  id: string
  text: string
}

export interface LabeledMaterial {
  label: string
  material: Material
}

/**
 * Only geometric checks are raised as warnings. Composition limits and
 * accuracy figures from the original research are shown as standing notes
 * (DISCLAIMER_NOTES) instead, as agreed in the expert review (September 2026).
 */
export function collectWarnings(
  inputs: LabeledMaterial[],
  passPoints: { x: number; y: number }[],
): Warning[] {
  const warnings: Warning[] = []

  if (inputs.some(({ material: m }) => !isInsideDiagram(creq(m.composition), nieq(m.composition)))) {
    warnings.push({
      id: 'outside-base',
      text: 'Unalloyed base metals lie outside the diagram axes. The mixing line remains valid as long as the weld metal point lies on the diagram.',
    })
  }

  const final = passPoints[passPoints.length - 1]
  if (final) {
    if (!isInsideDiagram(final.x, final.y)) {
      warnings.push({
        id: 'outside-weld',
        text: 'The weld metal point lies outside the diagram area and no FN prediction is possible.',
      })
    } else if (estimateFN(final.x, final.y) === null) {
      warnings.push({
        id: 'outside-fan',
        text: 'The weld metal point lies outside the region covered by the iso-FN lines; extending the lines could give erroneous predictions.',
      })
    }
  }
  if (passPoints.slice(0, -1).some((p) => !isInsideDiagram(p.x, p.y))) {
    warnings.push({
      id: 'outside-pass',
      text: 'One or more intermediate pass points lie outside the diagram area.',
    })
  }

  return warnings
}

/** Always shown below the result. Wording by the expert reviewer (September 2026). */
export const DISCLAIMER =
  'WRC-1992 predicts Ferrite Number (FN). The prediction applies to weld metal at arc-welding cooling rates and is only valid inside the drawn iso-FN lines. The prediction is subject to the limitations and assumptions of the original WRC-1992 research.'

/** Standing notes from the original research, always shown after DISCLAIMER. */
export const DISCLAIMER_NOTES = [
  'Accuracy of the WRC-1992 prediction (Siewert, McCowan & Olson 1988): below 18 FN, 84 % of predictions fall within ±2.5 FN; above 18 FN, 70 % fall within ±9 FN.',
  'The prediction is less accurate above 10 % Mn, 3 % Mo, 0.2 % N or 1 % Si (Siewert, McCowan & Olson 1988).',
]

/** Primary sources, shown with the disclaimer. */
export const PRIMARY_REFERENCES = [
  'Kotecki, D. J. & Siewert, T. A. (1992). WRC-1992 constitution diagram for stainless steel weld metals: a modification of the WRC-1988 diagram. Welding Journal 71(5), 171-s–178-s.',
  'Siewert, T. A., McCowan, C. N. & Olson, D. L. (1988). Ferrite Number prediction to 100 FN in stainless steel weld metal. Welding Journal 67(12), 289-s–298-s.',
]
