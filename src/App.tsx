import { useMemo, useState } from 'react'
import LookupHint from './components/LookupHint'
import MaterialSelect from './components/MaterialSelect'
import ResultPanel, { type PassResult } from './components/ResultPanel'
import WeldControls from './components/WeldControls'
import WrcDiagram, {
  type DiagramLine,
  type DiagramMarker,
} from './components/WrcDiagram'
import { resolveMaterial, type MaterialSelection } from './data/materials'
import { analyzeComposition, creq, mixComposition, multiPassCompositions, nieq } from './lib/calc'
import { isSingleMaterialLookup } from './lib/lookup'
import { collectWarnings } from './lib/warnings'

export default function App() {
  const [selA, setSelA] = useState<MaterialSelection>({ kind: 'preset', id: '304' })
  const [selB, setSelB] = useState<MaterialSelection>({ kind: 'preset', id: 'S355' })
  const [fillerSel, setFillerSel] = useState<MaterialSelection | null>({
    kind: 'preset',
    id: 'ER309L',
  })
  const [pctB, setPctB] = useState(50)
  const [rootDilutionPct, setRootDilutionPct] = useState(30)
  const [fillDilutionPct, setFillDilutionPct] = useState(25)
  const [passes, setPasses] = useState(1)
  const [useBuffer, setUseBuffer] = useState(false)
  const [bufferSel, setBufferSel] = useState<MaterialSelection>({ kind: 'preset', id: 'ER309L' })
  const [bufferPasses, setBufferPasses] = useState(1)

  const materialA = resolveMaterial(selA)
  const materialB = resolveMaterial(selB)
  const filler = fillerSel ? resolveMaterial(fillerSel) : null
  const bufferMat = resolveMaterial(bufferSel)

  // The final pass must always be the cladding alloy: clamp to 1..passes−1,
  // derived (never mutating state) so the stored value survives slider round-trips.
  const effBufferPasses = useBuffer && filler ? Math.min(bufferPasses, passes - 1) : 0
  const bufferActive = effBufferPasses > 0
  // C1/C2 naming follows the toggle so panel, diagram and hint text always agree,
  // even in the passes = 1 state where the buffer has no effect on the model yet
  const showBuffer = useBuffer && filler !== null

  const baseMix = useMemo(
    () => mixComposition(materialA.composition, materialB.composition, pctB / 100),
    [materialA, materialB, pctB],
  )

  const passResults: PassResult[] = useMemo(() => {
    const comps = filler
      ? multiPassCompositions(
          baseMix,
          filler.composition,
          rootDilutionPct / 100,
          fillDilutionPct / 100,
          passes,
          bufferActive
            ? { filler: bufferMat.composition, passes: effBufferPasses }
            : undefined,
        )
      : [baseMix]
    return comps.map((c, i) => ({
      n: i + 1,
      composition: c,
      ...(bufferActive ? { fillerLabel: i < effBufferPasses ? 'C1' : 'C2' } : {}),
      ...analyzeComposition(c),
    }))
  }, [baseMix, filler, rootDilutionPct, fillDilutionPct, passes, bufferActive, bufferMat, effBufferPasses])

  const final = passResults[passResults.length - 1]

  // 100 % A without filler: the user is looking up Material A alone, so B is left out
  const single = isSingleMaterialLookup(pctB, filler !== null)

  const warnings = collectWarnings(
    [
      { label: 'Material A', material: materialA },
      ...(single ? [] : [{ label: 'Material B', material: materialB }]),
      ...(bufferActive ? [{ label: 'Buffer filler C1', material: bufferMat }] : []),
      ...(filler
        ? [{ label: showBuffer ? 'Cladding filler C2' : 'Filler C', material: filler }]
        : []),
    ],
    passResults,
  )

  // Compose the diagram scene
  const aPt = { x: creq(materialA.composition), y: nieq(materialA.composition) }
  const bPt = { x: creq(materialB.composition), y: nieq(materialB.composition) }
  const basePt = { x: creq(baseMix), y: nieq(baseMix) }

  const markers: DiagramMarker[] = [{ ...aPt, label: 'A', shape: 'circle', color: '#003b5b' }]
  const lines: DiagramLine[] = []
  if (!single) {
    markers.push({ ...bPt, label: 'B', shape: 'square', color: '#8a1c5a' })
    lines.push({ x1: aPt.x, y1: aPt.y, x2: bPt.x, y2: bPt.y, color: '#003b5b', dash: '2 3' })
  }

  if (filler) {
    const cPt = { x: creq(filler.composition), y: nieq(filler.composition) }
    markers.push({ ...cPt, label: showBuffer ? 'C2' : 'C', shape: 'diamond', color: '#0f766e' })
    markers.push({ ...basePt, label: '', shape: 'dot', color: '#46555f', size: 'small' })
    if (showBuffer) {
      const c1Pt = { x: creq(bufferMat.composition), y: nieq(bufferMat.composition) }
      markers.push({ ...c1Pt, label: 'C1', shape: 'diamond', color: '#0f766e' })
    }
    // the dashed guide shows the pass-1 mixing line, which targets the buffer filler when active
    const guidePt = bufferActive
      ? { x: creq(bufferMat.composition), y: nieq(bufferMat.composition) }
      : cPt
    lines.push({ x1: basePt.x, y1: basePt.y, x2: guidePt.x, y2: guidePt.y, color: '#0f766e', dash: '2 3' })

    // Pass path: base mix → pass 1 → … → final weld metal, converging toward C
    let prev = basePt
    passResults.forEach((p, i) => {
      lines.push({ x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, color: '#d9480f', opacity: 0.4 })
      if (i === passResults.length - 1) {
        markers.push({ x: p.x, y: p.y, label: '', shape: 'ring', color: '#d9480f' })
      } else {
        // skip the number label when passes crowd together near convergence
        const crowded = Math.hypot(p.x - prev.x, p.y - prev.y) < 0.25
        markers.push({
          x: p.x,
          y: p.y,
          label: crowded ? '' : String(p.n),
          shape: 'dot',
          color: '#d9480f',
          size: 'small',
        })
      }
      prev = p
    })
  } else {
    markers.push({ x: final.x, y: final.y, label: '', shape: 'ring', color: '#d9480f' })
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-hv-dark text-white px-6 py-4">
        <h1 className="text-xl font-bold">WRC-1992 diagram — weld metal ferrite prediction</h1>
        <p className="text-sm text-hv-light mt-0.5">
          Select base materials and a filler metal and read the predicted Ferrite Number and
          solidification mode of the weld metal
        </p>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section aria-label="Diagram">
          <WrcDiagram markers={markers} lines={lines} activeModeId={final.mode?.id ?? null} />
          <LookupHint />
        </section>

        <section className="space-y-4" aria-label="Settings and result">
          <MaterialSelect
            label="Material A"
            value={selA}
            onChange={(s) => s && setSelA(s)}
            accentClass="border-l-hv-dark"
          />
          <MaterialSelect
            label="Material B"
            value={selB}
            onChange={(s) => s && setSelB(s)}
            accentClass="border-l-mat-b"
          />
          {/* Buffer is deposited first, so its toggle and panel come before the (cladding) filler.
              The toggle is always rendered — disabled without a filler — so panels do not jump. */}
          <label
            className={`flex items-center gap-2 text-sm px-1 ${
              filler ? 'text-hv-dark' : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <input
              type="checkbox"
              checked={useBuffer && filler !== null}
              disabled={!filler}
              onChange={(e) => setUseBuffer(e.target.checked)}
              className="accent-teal-700"
            />
            Use a different filler for the first layer(s) (buffer)
          </label>
          {filler && useBuffer && (
            <MaterialSelect
              label="Buffer filler C1"
              value={bufferSel}
              onChange={(s) => s && setBufferSel(s)}
              accentClass="border-l-teal-700"
            />
          )}
          <MaterialSelect
            label={showBuffer ? 'Cladding filler C2' : 'Filler C'}
            value={fillerSel}
            onChange={setFillerSel}
            accentClass="border-l-teal-700"
            allowNone
          />
          <WeldControls
            pctB={pctB}
            onPctB={setPctB}
            nameA={materialA.designation}
            nameB={materialB.designation}
            hasFiller={filler !== null}
            rootDilutionPct={rootDilutionPct}
            onRootDilution={setRootDilutionPct}
            fillDilutionPct={fillDilutionPct}
            onFillDilution={setFillDilutionPct}
            passes={passes}
            onPasses={setPasses}
            hasBuffer={showBuffer}
            bufferPasses={bufferPasses}
            onBufferPasses={setBufferPasses}
          />
          <ResultPanel passes={passResults} warnings={warnings} hasFiller={filler !== null} />
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 pb-6 text-xs text-gray-500">
        Diagram after Kotecki &amp; Siewert, Welding Journal 71(5), 1992. Iso-FN lines and mode
        boundaries digitized from Fig. 6 of the original paper and verified against its published
        examples. HV.SE
      </footer>
    </div>
  )
}
