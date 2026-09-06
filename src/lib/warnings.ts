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
 * Validity rules for the WRC-1992 prediction, taken from the original research:
 * Siewert, McCowan & Olson (1988), Conclusions: "The diagram is applicable for
 * Mn contents to 10 wt-%, Mo contents to 3 wt-%, N contents to 0.2 wt-% and Si
 * contents to 1 wt-%." Accuracy above 18 FN: Table 4 of the same paper.
 * Martensite and line extension: Kotecki & Siewert (1992), p. 173-s and Fig. 6.
 */
const LIMITS: { el: 'Mn' | 'Mo' | 'N' | 'Si'; max: number }[] = [
  { el: 'Mn', max: 10 },
  { el: 'Mo', max: 3 },
  { el: 'N', max: 0.2 },
  { el: 'Si', max: 1 },
]

/** Above this FN the 1988 database shows ±9 FN scatter instead of ±2.5 FN. */
const HIGH_FN = 18

export function collectWarnings(
  inputs: LabeledMaterial[],
  passPoints: { x: number; y: number }[],
): Warning[] {
  const warnings: Warning[] = []

  for (const { material: m, label } of inputs) {
    for (const { el, max } of LIMITS) {
      if (m.composition[el] > max) {
        warnings.push({
          id: `limit-${el}-${label}`,
          text: `${label} (${m.designation}) has ${m.composition[el].toFixed(2)} % ${el}, above the ${max} % limit of the WRC-1992 database — the FN prediction is not reliable.`,
        })
      }
    }
    if (!isInsideDiagram(creq(m.composition), nieq(m.composition))) {
      warnings.push({
        id: `outside-${label}`,
        text: `${label} (${m.designation}) lies outside the diagram axes. That is normal for unalloyed base metals — the mixing line remains valid as long as the weld metal point lands on the diagram.`,
      })
    }
  }

  const final = passPoints[passPoints.length - 1]
  if (final) {
    const fn = estimateFN(final.x, final.y)
    if (!isInsideDiagram(final.x, final.y)) {
      warnings.push({
        id: 'outside-weld',
        text: 'The weld metal point lies outside the diagram area and no FN prediction is possible.',
      })
    } else if (fn === null) {
      warnings.push({
        id: 'outside-fan',
        text: 'The weld metal point lies outside the region covered by the iso-FN lines; extending the lines could give erroneous predictions. Below the lower FN lines martensite may form, which the WRC-1992 diagram does not show.',
      })
    } else if (fn > HIGH_FN) {
      warnings.push({
        id: 'high-fn',
        text: `Predicted FN ≈ ${Math.round(fn)} is above ${HIGH_FN}, where the accuracy of the WRC-1992 prediction drops from about ±2.5 FN to about ±9 FN.`,
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

/** Always shown below the result. */
export const DISCLAIMER =
  'WRC-1992 predicts Ferrite Number (FN), a magnetically defined scale — not volume-% ferrite; the two agree only at low FN (100 FN corresponds to roughly 65 vol-% ferrite). The prediction applies to weld metal at arc-welding cooling rates and is only valid inside the drawn iso-FN lines. The prediction is subject to the limitations and assumptions of the original WRC-1992 research.'

/** Primary sources, shown with the disclaimer. */
export const PRIMARY_REFERENCES = [
  'Kotecki, D. J. & Siewert, T. A. (1992). WRC-1992 constitution diagram for stainless steel weld metals: a modification of the WRC-1988 diagram. Welding Journal 71(5), 171-s–178-s.',
  'Siewert, T. A., McCowan, C. N. & Olson, D. L. (1988). Ferrite Number prediction to 100 FN in stainless steel weld metal. Welding Journal 67(12), 289-s–298-s.',
]
