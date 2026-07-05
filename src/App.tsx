import { useMemo, useState } from 'react'
import MaterialSelect from './components/MaterialSelect'
import ResultPanel, { type PassResult } from './components/ResultPanel'
import SchaefflerDiagram, {
  type DiagramLine,
  type DiagramMarker,
} from './components/SchaefflerDiagram'
import WeldControls from './components/WeldControls'
import { resolveMaterial, type MaterialSelection } from './data/materials'
import { analyzeComposition, creq, mixComposition, multiPassCompositions, nieq } from './lib/calc'
import { collectWarnings } from './lib/warnings'

export default function App() {
  const [selA, setSelA] = useState<MaterialSelection>({ kind: 'preset', id: '304' })
  const [selB, setSelB] = useState<MaterialSelection>({ kind: 'preset', id: 'S355' })
  const [fillerSel, setFillerSel] = useState<MaterialSelection | null>(null)
  const [pctB, setPctB] = useState(50)
  const [rootDilutionPct, setRootDilutionPct] = useState(40)
  const [fillDilutionPct, setFillDilutionPct] = useState(25)
  const [passes, setPasses] = useState(1)

  const materialA = resolveMaterial(selA)
  const materialB = resolveMaterial(selB)
  const filler = fillerSel ? resolveMaterial(fillerSel) : null

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
        )
      : [baseMix]
    return comps.map((c, i) => ({ n: i + 1, composition: c, ...analyzeComposition(c) }))
  }, [baseMix, filler, rootDilutionPct, fillDilutionPct, passes])

  const final = passResults[passResults.length - 1]

  const warnings = collectWarnings(
    [
      { label: 'Material A', material: materialA },
      { label: 'Material B', material: materialB },
      ...(filler ? [{ label: 'Filler C', material: filler }] : []),
    ],
    passResults,
  )

  // Compose the diagram scene
  const aPt = { x: creq(materialA.composition), y: nieq(materialA.composition) }
  const bPt = { x: creq(materialB.composition), y: nieq(materialB.composition) }
  const basePt = { x: creq(baseMix), y: nieq(baseMix) }

  const markers: DiagramMarker[] = [
    { ...aPt, label: 'A', shape: 'circle', color: '#003b5b' },
    { ...bPt, label: 'B', shape: 'square', color: '#1380a4' },
  ]
  const lines: DiagramLine[] = [
    { x1: aPt.x, y1: aPt.y, x2: bPt.x, y2: bPt.y, color: '#003b5b', dash: '2 3' },
  ]

  if (filler) {
    const cPt = { x: creq(filler.composition), y: nieq(filler.composition) }
    markers.push({ ...cPt, label: 'C', shape: 'diamond', color: '#0f766e' })
    markers.push({ ...basePt, label: '', shape: 'dot', color: '#46555f', size: 'small' })
    lines.push({ x1: basePt.x, y1: basePt.y, x2: cPt.x, y2: cPt.y, color: '#0f766e', dash: '2 3' })

    // Pass path: base mix → pass 1 → … → final weld metal, converging toward C
    let prev = basePt
    passResults.forEach((p, i) => {
      lines.push({ x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, color: '#d9480f', opacity: 0.4 })
      if (i === passResults.length - 1) {
        markers.push({ x: p.x, y: p.y, label: '', shape: 'ring', color: '#d9480f' })
      } else {
        // skip the number label when passes crowd together near convergence
        const crowded = Math.hypot(p.x - prev.x, p.y - prev.y) < 0.4
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
        <h1 className="text-xl font-bold">Schaeffler diagram — weld metal prediction</h1>
        <p className="text-sm text-hv-light mt-0.5">
          Select base materials (and optionally a filler metal) and see where the weld metal ends
          up in the diagram
        </p>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section aria-label="Diagram">
          <SchaefflerDiagram
            markers={markers}
            lines={lines}
            activeRegionId={final.region?.id ?? null}
          />
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
            accentClass="border-l-hv-blue"
          />
          <MaterialSelect
            label="Filler C"
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
          />
          <ResultPanel passes={passResults} warnings={warnings} hasFiller={filler !== null} />
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 pb-6 text-xs text-gray-500">
        Diagram after Schaeffler (1949). Boundary lines digitized from published reproductions
        (±0.5 units). HV.SE
      </footer>
    </div>
  )
}
