interface Props {
  /** percent of material B in the base-metal contribution, 0–100 */
  pctB: number
  onPctB: (v: number) => void
  nameA: string
  nameB: string
  hasFiller: boolean
  rootDilutionPct: number
  onRootDilution: (v: number) => void
  fillDilutionPct: number
  onFillDilution: (v: number) => void
  passes: number
  onPasses: (v: number) => void
  /** true when the buffer-layer toggle is on (and a filler is selected) */
  hasBuffer: boolean
  bufferPasses: number
  onBufferPasses: (v: number) => void
}

export default function WeldControls({
  pctB,
  onPctB,
  nameA,
  nameB,
  hasFiller,
  rootDilutionPct,
  onRootDilution,
  fillDilutionPct,
  onFillDilution,
  passes,
  onPasses,
  hasBuffer,
  bufferPasses,
  onBufferPasses,
}: Props) {
  // the final pass must always be the cladding alloy, so at most passes − 1 buffer passes
  const maxBufferPasses = Math.max(1, passes - 1)
  const shownBufferPasses = Math.min(bufferPasses, maxBufferPasses)
  return (
    <div className="border border-gray-300 border-l-4 border-l-hv-blue bg-white">
      <div className="px-4 py-2 bg-hv-light">
        <h2 className="font-bold text-hv-dark">Welding parameters</h2>
      </div>
      <div className="px-4 py-3 space-y-4">
        <div>
          <label className="text-sm font-bold text-hv-dark" htmlFor="balance-slider">
            Base metal balance (A : B)
          </label>
          <input
            id="balance-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={pctB}
            onChange={(e) => onPctB(Number(e.target.value))}
            className="w-full accent-hv-blue"
          />
          <div className="flex justify-between text-sm text-hv-text">
            <span>
              <strong>{100 - pctB} %</strong> A ({nameA})
            </span>
            <span>
              <strong>{pctB} %</strong> B ({nameB})
            </span>
          </div>
        </div>

        {hasFiller && (
          <>
            <div>
              <label className="text-sm font-bold text-hv-dark" htmlFor="root-dilution-slider">
                Root pass dilution — D<sub>root</sub> = {rootDilutionPct} %
              </label>
              <input
                id="root-dilution-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={rootDilutionPct}
                onChange={(e) => onRootDilution(Number(e.target.value))}
                className="w-full accent-hv-blue"
              />
              <p className="text-xs text-gray-600">
                Share of the weld metal that is melted base metal. Root passes typically 20–50 %.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-hv-dark" htmlFor="fill-dilution-slider">
                Fill pass dilution — D<sub>fill</sub> = {fillDilutionPct} %
              </label>
              <input
                id="fill-dilution-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={fillDilutionPct}
                onChange={(e) => onFillDilution(Number(e.target.value))}
                className="w-full accent-hv-blue"
                disabled={passes < 2}
              />
              <p className="text-xs text-gray-600">
                Later passes dilute into the previous pass instead of the base metal.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-hv-dark" htmlFor="passes-slider">
                Number of passes: {passes}
              </label>
              <input
                id="passes-slider"
                type="range"
                min={1}
                max={10}
                step={1}
                value={passes}
                onChange={(e) => onPasses(Number(e.target.value))}
                className="w-full accent-hv-blue"
              />
            </div>

            {hasBuffer && (
              <div>
                <label className="text-sm font-bold text-hv-dark" htmlFor="buffer-passes-slider">
                  Buffer passes (C1): {passes < 2 ? '—' : shownBufferPasses}
                </label>
                <input
                  id="buffer-passes-slider"
                  type="range"
                  min={1}
                  max={maxBufferPasses}
                  step={1}
                  value={shownBufferPasses}
                  onChange={(e) => onBufferPasses(Number(e.target.value))}
                  className="w-full accent-hv-blue"
                  disabled={passes < 2}
                />
                <p className="text-xs text-gray-600">
                  {passes < 2
                    ? 'Needs at least 2 passes — the final pass always uses the cladding alloy C2.'
                    : `${shownBufferPasses === 1 ? 'Pass 1 uses' : `Passes 1–${shownBufferPasses} use`} the buffer filler C1, the rest the cladding alloy C2.`}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
