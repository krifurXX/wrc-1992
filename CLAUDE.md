# Schaefflerdiagram-app v2

Interaktiv undervisningsapp (Högskolan Väst), vidareutveckling av `../scheffler`
(v1, deployad på scheffler.vercel.app — rör inte den). v2 modellerar svetsning:
två grundmaterial A och B (förvalda stål **eller** egen kemisk sammansättning),
valfritt tillsatsmaterial C, utspädning (dilution) och flersträngssvetsning.

Modell:
- Grundmix = (1−s)·A + s·B där s = "base metal balance"
- Utan tillsatsmaterial ("None — autogenous weld"): v1-beteendet, punkten = grundmix
- Sträng 1: c₁ = (1−D_root)·C + D_root·grundmix
- Sträng n≥2: cₙ = (1−D_fill)·C + D_fill·cₙ₋₁ — punkterna konvergerar geometriskt mot C

## Stack

- Vite + React 19 + TypeScript + Tailwind CSS v4 (konfigurerad i `src/index.css` via `@theme`)
- Diagrammet är ren SVG i React — inga chart-bibliotek
- Tester: vitest (`npx vitest run`)
- Deploy: **eget** Vercel-projekt `scheffler-v2` (`vercel --prod --yes`) — länka aldrig mot v1-projektet

## Arkitektur

```
src/
  data/materials.ts    Materialdatabas: 9 stål (inkl. filler ER309L), MaterialSelection
                       (preset | custom), resolveMaterial
  data/schaeffler.ts   Diagramgeometri: 8 regionpolygoner, 7 ferritlinjer, axelgränser
  lib/calc.ts          creq/nieq (Schaeffler 1949), mixComposition (linjär), classifyPoint
                       (ray casting point-in-polygon), estimateFerrite (interpolering),
                       weldComposition, multiPassCompositions, analyzeComposition
  lib/warnings.ts      Valideringsregler (hög C, kväve, utanför diagrammet) för N märkta
                       material + passpunkter, + disclaimer
  lib/calc.test.ts     17 v1-tester — FÅR ALDRIG REDIGERAS; nya tester läggs i weld.test.ts
  lib/weld.test.ts     Tester för weldComposition/multiPass/resolveMaterial/varningar
  components/          SchaefflerDiagram (SVG, generiska markers/lines), MaterialSelect
                       (preset + custom-editor + None för filler), WeldControls
                       (balance/dilution/passes), ResultPanel (slutresultat + per-pass-tabell)
  App.tsx              State + sammankoppling
```

## Viktigt om diagramdatan

Koordinaterna i `src/data/schaeffler.ts` är konsensus från två oberoende
vektordigitaliseringar (dacapo svetshandbok-PDF och Wikimedia Commons
"Diagramme schaeffler.svg") som stämmer inom ±0,5 ekvivalentenheter. **Ändra inte
polygonkoordinaterna utan ny källa** — testerna i calc.test.ts låser klassificeringen
av kända punkter. Formlerna är kanonisk Schaeffler (utan kväve); DeLong/WRC nämns
bara i varningstexter.

UI-text på engelska (ändrat från svenska juni 2026), kod och kommentarer på engelska.
Decimaler med punkt. HV:s grafiska profil:
mörkblå #003b5b, blå #1380a4, ljusblå #e4f1f8, Arial, skarpa hörn (inga rounded).
Extra markörfärger i v2: filler C teal #0f766e, svetspunkt orange #d9480f.
