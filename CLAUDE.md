# WRC-1992-diagram-app

Interaktiv undervisningsapp (Högskolan Väst), systerapp till `../scheffler-v2`
(Schaeffler). Förutsäger **Ferrite Number (FN)** och solidifikationsmod
(A/AF/FA/F) i rostfritt svetsgods enligt WRC-1992-diagrammet (Kotecki &
Siewert, Welding Journal 71(5) 1992, s. 171s–178s). Samma svetsmodell som
systerappen: grundmaterial A + B (preset eller egen sammansättning), valfritt
tillsatsmaterial C, root-/fillpass-dilution, flersträngssvetsning, samt
buffertskikt (valfritt, känd claddingpraxis): sträng 1..N_buffer använder
buffertfiller C1 (default ER309L), därefter claddinglegering C2 — samma
utspädningsregler oavsett filler. UI klampar N_buffer till 1..antal strängar−1
(sista strängen alltid C2); `multiPassCompositions` själv är permissiv
(buffer.passes ≥ passes ⇒ enbart buffert).

Formler: Creq = Cr + Mo + 0,7·Nb; Nieq = Ni + 35·C + 20·N + 0,25·Cu.
Till skillnad från Schaeffler ingår kväve och koppar i modellen.

## Stack

- Vite + React 19 + TypeScript + Tailwind CSS v4 (`src/index.css` via `@theme`)
- Diagrammet är ren SVG i React — inga chart-bibliotek
- Tester: vitest (`npx vitest run`)
- Deploy: **eget** Vercel-projekt `wrc-1992` — länka aldrig mot scheffler-projekten

## Arkitektur

```
src/
  data/materials.ts    12 material (inkl. duplex 2205, ER2209, E312) med N och Cu;
                       MaterialSelection (preset | custom), resolveMaterial
  data/wrc1992.ts      GENERERAD diagramgeometri — se "Viktigt" nedan
  lib/calc.ts          creq/nieq (WRC-1992), mixComposition, weldComposition,
                       multiPassCompositions, classifyPoint (mod-polygoner),
                       estimateFN (signerad vinkelrät avståndsinterpolation
                       mellan angränsande iso-FN-linjer, gated av FN_VALID_POLYGON)
  lib/warnings.ts      Varningar bara för geometri (grundmaterial/svetsgods/pass utanför axlar,
                       utanför iso-FN-solfjädern). Sammansättningsgränser (1988) och FN-noggrannhet
                       (18 FN, ±2.5/±9) är alltid synliga DISCLAIMER_NOTES; disclaimer-text av
                       expertgranskaren + referenser (1992, 1988). Inga martensit-/Schaeffler-
                       hänvisningar i UI. Källgranskat sep 2026.
  lib/wrc.test.ts      Geometrikontraktet: 12 ankare ur originalartikeln
                       (Exempel 1-2 + Tabell 1), domängränser, mod-täckning
  lib/weld.test.ts     Dilutionspipelinen end-to-end mot artikelns exempel
  components/          WrcDiagram (SVG: modfält, FN-linjer med roterade etiketter,
                       Liang-Barsky-klippning, kantpilar för punkter utanför axlarna),
                       MaterialSelect (9 element), WeldControls, ResultPanel (FN + mod
                       + per-pass-tabell)
  App.tsx              State + sammankoppling; default = artikelns Exempel 2-scenario
                       (304 + S355 + ER309L, 30 % dilution)
scripts/digitize/      Python-pipeline som skapade wrc1992.ts (se nedan)
docs/                  Originalartikeln (gitignorad — ladda ned igen vid behov från
                       https://s3.us-east-1.amazonaws.com/WJ-www.aws.org/supplement/WJ_1992_05_s171.pdf)
```

## Viktigt om diagramdatan

`src/data/wrc1992.ts` är **maskingenererad** av `scripts/digitize/build_ts.py`
från en 600 dpi-rendering av originalartikelns Fig. 6 (NIST-bidrag, ej
upphovsrättsskyddad): minsta-kvadrat-kalibrering mot rutnätet (residualer
< 0,02 ekvivalentenheter), automatisk extraktion av de 29 heldragna
iso-FN-linjerna, spårning av FN 0-linjen och de tre modgränserna
(streckprickade, svagt böjda → polylinjer).

**Redigera aldrig `wrc1992.ts` för hand.** Emittern vägrar skriva filen om inte
alla numeriska ankare ur artikeln passerar; testerna i `wrc.test.ts` låser
samma kontrakt i CI. Vid behov av ändring: kör om pipelinen
(`calibrate.py` → `extract_fn.py` → `extract_dashdot.py` → `build_ts.py`) och
granska `overlay.png` visuellt.

Kända egenheter, avsiktliga:
- FN 0-linjen är streckprickad och böjd i originalet och fungerar samtidigt
  som A/AF-gräns.
- FN-prediktion returneras bara innanför de ritade linjerna
  (`FN_VALID_POLYGON`) — figurtexten varnar uttryckligen för extrapolation.
  I A-fältet returneras FN = 0.
- Modpolygonerna täcker hela axelrektangeln (gränserna är linjärt förlängda
  osynligt för klassificering); bara de digitaliserade utsträckningarna ritas.
- Tabell 1-svetsen 9292-622 (28.61, 15.81) ligger strax bortom FN 35-linjens
  ritade spets → appen svarar korrekt "utanför" där, trots att artikeln anger
  regressionsberäknat FN 36.

UI-text på engelska, kod och kommentarer på engelska. Decimaler med punkt.
HV:s grafiska profil: mörkblå #003b5b, blå #1380a4, ljusblå #e4f1f8, Arial,
skarpa hörn. Extra färger: filler C teal #0f766e, svetspunkt orange #d9480f.

## Enmaterialsläge (sep 2026)

`LookupHint` (under diagrammet) beskriver hur man slår upp ett enda material: Material A, reglaget
på 100 % A, Filler C = None. `isSingleMaterialLookup` (`src/lib/lookup.ts`) är då sann, och `App.tsx`
utelämnar B-markören, linjen A–B och Material B ur varningskontrollen. Inget separat läge eller knapp.

## Panelordning för tillsats (sep 2026)

Inställningsspalten: Material A → Material B → buffert-kryssruta → Buffer filler C1 (om ikryssad) →
Filler C / Cladding filler C2. Bufferten svetsas först och står därför före C2. Kryssrutan renderas
alltid men är disabled och visas okryssad när Filler C = None; `useBuffer`-state behålls.

## Markörstil i diagrammet (sep 2026)

Materialmarkörer ritas som "brickor": större form med vit kontur och vit bokstav inuti (A cirkel,
B fyrkant, C/C1/C2 romb; ritordning via markerLayer; material utanför axlarna = ihålig bricka vid kanten med pil och koordinattext). Svetspunktens orange ring (r=13, vit understroke) ritas under
brickorna, så den syns som en ring runt A i enmaterialsläget. Material B är mörk magenta `#8a1c5a`
(token `--color-mat-b`, klass `border-l-mat-b` på B-panelen) – en diagramdatafärg som medvetet
ligger utanför HV-paletten, eftersom HV-blått försvann mot austenitfältet. Beslutat 2026-09-20.

## Disclaimer (2026-09-20)

Disclaimern anger att diagrammet bygger på experimentdata från bågsvetsning (ersätter "arc-welding
cooling rates"; ingen uppräkning av andra processer), och `LIABILITY` visas sist under referenserna.
