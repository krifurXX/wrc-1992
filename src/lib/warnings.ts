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
 * Validity rules for the WRC-1992 prediction, per Kotecki & Siewert (1992)
 * and the WRC-1988 database limits: Mn ≤ 10, Mo ≤ 3, N ≤ 0.2, Si ≤ 1 wt-%.
 * Thresholds and wording are pedagogical choices.
 */
const LIMITS: { el: 'Mn' | 'Mo' | 'N' | 'Si'; max: number }[] = [
  { el: 'Mn', max: 10 },
  { el: 'Mo', max: 3.5 },
  { el: 'N', max: 0.2 },
  { el: 'Si', max: 1 },
]

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
          text: `${label} (${m.designation}) has ${m.composition[el].toFixed(2)} % ${el}, above the ~${max} % covered by the WRC-1992 database — the FN prediction becomes unreliable.`,
        })
      }
    }
    if (!isInsideDiagram(creq(m.composition), nieq(m.composition))) {
      warnings.push({
        id: `outside-${label}`,
        text: `${label} (${m.designation}) lies outside the diagram axes. That is normal for unalloyed steels — mixing lines are still valid, only the weld metal point needs to land on the diagram (this is exactly how the original paper treats dissimilar joints).`,
      })
    }
  }

  const final = passPoints[passPoints.length - 1]
  if (final) {
    const fn = estimateFN(final.x, final.y)
    if (!isInsideDiagram(final.x, final.y)) {
      warnings.push({
        id: 'outside-weld',
        text: 'The weld metal point lies outside the diagram — no FN prediction is possible. If it sits below-left of the axes, martensite is likely: use the Schaeffler diagram for that regime.',
      })
    } else if (fn === null) {
      warnings.push({
        id: 'outside-fan',
        text: 'The weld metal point lies outside the region covered by the iso-FN lines. The paper warns that extending the lines could give erroneous predictions.',
      })
    } else if (fn > 50) {
      warnings.push({
        id: 'high-fn',
        text: `Predicted FN ≈ ${Math.round(fn)} is above 50, where the WRC-1992 prediction is known to be less accurate (typical for duplex weld metals).`,
      })
    }
    if (isInsideDiagram(final.x, final.y) && final.x < 19 && final.y < 11.5) {
      warnings.push({
        id: 'martensite-risk',
        text: 'The weld metal sits in the lower-left corner of the diagram, where martensite may form. The standard WRC-1992 diagram has no martensite boundary — check with the Schaeffler diagram.',
      })
    }
  }
  if (passPoints.slice(0, -1).some((p) => !isInsideDiagram(p.x, p.y))) {
    warnings.push({
      id: 'outside-pass',
      text: 'One or more intermediate pass points lie outside the diagram axes.',
    })
  }

  return warnings
}

/** Always shown below the result. */
export const DISCLAIMER =
  'WRC-1992 predicts Ferrite Number (FN), a magnetically defined scale — not volume-% ferrite (FN ≈ vol-% only at low FN; duplex weld metals at FN ≈ 50 hold roughly 0.7 × FN vol-%). The prediction applies to weld metal at arc-welding cooling rates and is only valid inside the drawn iso-FN lines. Unlike Schaeffler, the model includes nitrogen and copper.'
