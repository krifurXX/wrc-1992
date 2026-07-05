import type { Composition } from '../data/materials'
import type { PointAnalysis } from '../lib/calc'
import { DISCLAIMER, type Warning } from '../lib/warnings'

export interface PassResult extends PointAnalysis {
  n: number
  composition: Composition
}

interface Props {
  /** One entry per pass; the last one is the final weld metal. Length ≥ 1. */
  passes: PassResult[]
  warnings: Warning[]
  hasFiller: boolean
}

const fmt = (v: number, d = 2) => v.toFixed(d)

export default function ResultPanel({ passes, warnings, hasFiller }: Props) {
  const final = passes[passes.length - 1]

  return (
    <div className="border border-gray-300 border-l-4 border-l-hv-dark bg-white">
      <div className="px-4 py-2 bg-hv-light">
        <h2 className="font-bold text-hv-dark">
          {hasFiller ? 'Result — weld metal' : 'Result for the mixing point'}
        </h2>
      </div>
      <div className="px-4 py-3 space-y-3 text-hv-text">
        <p className="text-lg">
          Phase field:{' '}
          <strong className="text-hv-dark">
            {final.region ? final.region.label : 'Outside the diagram'}
          </strong>
          {final.ferritePct !== null && (
            <span className="block text-sm text-gray-700">
              Estimated ferrite content: approx. {fmt(Math.round(final.ferritePct * 2) / 2, 1)} %
            </span>
          )}
        </p>

        <p className="text-sm tabular-nums">
          Cr<sub>eq</sub> = <strong>{fmt(final.x, 1)}</strong> · Ni<sub>eq</sub> ={' '}
          <strong>{fmt(final.y, 1)}</strong>
        </p>

        <div>
          <h3 className="text-sm font-bold text-hv-dark mb-1">
            {hasFiller ? 'Weld metal composition (wt-%)' : 'Mixed composition (wt-%)'}
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                {['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'Nb'].map((el) => (
                  <th key={el} className="font-normal text-right">{el}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {(['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'Nb'] as const).map((el) => (
                  <td key={el} className="text-right tabular-nums">
                    {fmt(final.composition[el], el === 'C' ? 3 : 2)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {passes.length > 1 && (
          <div>
            <h3 className="text-sm font-bold text-hv-dark mb-1">Per-pass microstructure</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="font-normal text-left">Pass</th>
                  <th className="font-normal text-right">
                    Cr<sub>eq</sub>
                  </th>
                  <th className="font-normal text-right">
                    Ni<sub>eq</sub>
                  </th>
                  <th className="font-normal text-right">Phase field</th>
                  <th className="font-normal text-right">Ferrite</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((p) => (
                  <tr key={p.n} className={p.n === final.n ? 'font-bold' : undefined}>
                    <td className="text-left tabular-nums">{p.n}</td>
                    <td className="text-right tabular-nums">{fmt(p.x, 1)}</td>
                    <td className="text-right tabular-nums">{fmt(p.y, 1)}</td>
                    <td className="text-right">{p.region ? p.region.short : '—'}</td>
                    <td className="text-right tabular-nums">
                      {p.ferritePct !== null ? `~${fmt(Math.round(p.ferritePct * 2) / 2, 1)} %` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {warnings.length > 0 && (
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li key={w.id} className="text-sm bg-amber-50 border border-amber-300 border-l-4 border-l-amber-500 px-3 py-2">
                ⚠ {w.text}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-gray-600 border-t border-gray-200 pt-2">{DISCLAIMER}</p>
      </div>
    </div>
  )
}
