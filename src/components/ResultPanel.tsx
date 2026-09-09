import type { Composition } from '../data/materials'
import type { PointAnalysis } from '../lib/calc'
import { DISCLAIMER, DISCLAIMER_NOTES, PRIMARY_REFERENCES, type Warning } from '../lib/warnings'

export interface PassResult extends PointAnalysis {
  n: number
  composition: Composition
  /** 'C1' (buffer) or 'C2' (cladding); set only when a buffer layer is active */
  fillerLabel?: string
}

interface Props {
  /** One entry per pass; the last one is the final weld metal. Length ≥ 1. */
  passes: PassResult[]
  warnings: Warning[]
  hasFiller: boolean
}

const ELEMENTS = ['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'Nb', 'N', 'Cu'] as const

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
          Solidification mode:{' '}
          <strong className="text-hv-dark">
            {final.mode ? final.mode.label : 'Outside the diagram'}
          </strong>
          {final.fn !== null && (
            <span className="block text-sm text-gray-700">
              Predicted Ferrite Number: FN ≈ {fmt(final.fn, 1)}
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
                {ELEMENTS.map((el) => (
                  <th key={el} className="font-normal text-right">{el}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {ELEMENTS.map((el) => (
                  <td key={el} className="text-right tabular-nums">
                    {fmt(final.composition[el], el === 'C' || el === 'N' ? 3 : 2)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {passes.length > 1 && (
          <div>
            <h3 className="text-sm font-bold text-hv-dark mb-1">Per-pass prediction</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="font-normal text-left">Pass</th>
                  {passes.some((p) => p.fillerLabel) && (
                    <th className="font-normal text-left">Filler</th>
                  )}
                  <th className="font-normal text-right">
                    Cr<sub>eq</sub>
                  </th>
                  <th className="font-normal text-right">
                    Ni<sub>eq</sub>
                  </th>
                  <th className="font-normal text-right">Mode</th>
                  <th className="font-normal text-right">FN</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((p) => (
                  <tr key={p.n} className={p.n === final.n ? 'font-bold' : undefined}>
                    <td className="text-left tabular-nums">{p.n}</td>
                    {passes.some((q) => q.fillerLabel) && (
                      <td className="text-left">{p.fillerLabel ?? '—'}</td>
                    )}
                    <td className="text-right tabular-nums">{fmt(p.x, 1)}</td>
                    <td className="text-right tabular-nums">{fmt(p.y, 1)}</td>
                    <td className="text-right">{p.mode ? p.mode.short : '—'}</td>
                    <td className="text-right tabular-nums">
                      {p.fn !== null ? `≈${fmt(p.fn, 1)}` : '—'}
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
        {DISCLAIMER_NOTES.map((n) => (
          <p key={n} className="text-xs text-gray-600">{n}</p>
        ))}
        {PRIMARY_REFERENCES.map((r) => (
          <p key={r} className="text-xs text-gray-500">{r}</p>
        ))}
      </div>
    </div>
  )
}
