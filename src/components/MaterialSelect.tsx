import {
  EMPTY_COMPOSITION,
  MATERIALS,
  resolveMaterial,
  type Composition,
  type MaterialSelection,
} from '../data/materials'
import { creq, nieq } from '../lib/calc'

interface Props {
  label: string
  /** null = no material chosen (only meaningful with allowNone, e.g. the filler slot) */
  value: MaterialSelection | null
  onChange: (s: MaterialSelection | null) => void
  accentClass: string
  allowNone?: boolean
}

const ELEMENTS = ['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'Nb', 'N', 'Cu'] as const

/** Input caps for custom alloys — generous but keep values physically plausible */
const MAX: Composition = { C: 2, Mn: 15, Si: 5, Cr: 40, Ni: 40, Mo: 10, Nb: 5, N: 0.5, Cu: 5 }

const fmt = (v: number, decimals = 2) =>
  v.toFixed(decimals).replace(/\.?0+$/, '') || '0'

export default function MaterialSelect({ label, value, onChange, accentClass, allowNone }: Props) {
  const material = value ? resolveMaterial(value) : null
  const selectValue = value === null ? 'none' : value.kind === 'custom' ? 'custom' : value.id

  const handleSelect = (v: string) => {
    if (v === 'none') {
      onChange(null)
    } else if (v === 'custom') {
      // Seed the editor from the current material — natural workflow:
      // "start from 304, tweak the carbon"
      onChange({ kind: 'custom', composition: material?.composition ?? EMPTY_COMPOSITION })
    } else {
      onChange({ kind: 'preset', id: v })
    }
  }

  const handleElement = (el: keyof Composition, raw: string) => {
    if (value?.kind !== 'custom') return
    const n = Number(raw)
    const clamped = Number.isFinite(n) ? Math.max(0, Math.min(MAX[el], n)) : 0
    onChange({ kind: 'custom', composition: { ...value.composition, [el]: clamped } })
  }

  return (
    <div className={`border border-gray-300 border-l-4 ${accentClass} bg-white`}>
      <div className="px-4 py-2 bg-hv-light">
        <label className="font-bold text-hv-dark" htmlFor={`select-${label}`}>
          {label}
        </label>
      </div>
      <div className="px-4 py-3 space-y-2">
        <select
          id={`select-${label}`}
          className="w-full border border-gray-400 px-2 py-1.5 bg-white text-hv-text"
          value={selectValue}
          onChange={(e) => handleSelect(e.target.value)}
        >
          {allowNone && <option value="none">None — autogenous weld</option>}
          {MATERIALS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.designation}
            </option>
          ))}
          <option value="custom">Custom alloy…</option>
        </select>

        {material && (
          <>
            <table className="w-full text-xs text-hv-text">
              <thead>
                <tr className="text-gray-500">
                  {ELEMENTS.map((el) => (
                    <th key={el} className="font-normal text-right">{el}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {ELEMENTS.map((el) =>
                    value?.kind === 'custom' ? (
                      <td key={el} className="pr-0.5">
                        <input
                          type="number"
                          aria-label={`${label} ${el} content (wt-%)`}
                          min={0}
                          max={MAX[el]}
                          step={0.01}
                          value={material.composition[el]}
                          onChange={(e) => handleElement(el, e.target.value)}
                          className="w-full border border-gray-400 px-1 py-0.5 text-right tabular-nums"
                        />
                      </td>
                    ) : (
                      <td key={el} className="text-right tabular-nums">{fmt(material.composition[el])}</td>
                    ),
                  )}
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-600 tabular-nums">
              Cr<sub>eq</sub> = {fmt(creq(material.composition), 1)} · Ni<sub>eq</sub> ={' '}
              {fmt(nieq(material.composition), 1)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
