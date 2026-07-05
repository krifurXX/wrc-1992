# WRC-1992 Diagram — weld metal ferrite prediction

Interactive teaching app (University West, Sweden) for the **WRC-1992
constitution diagram** (Kotecki & Siewert, *Welding Journal* 71(5), 1992,
pp. 171s–178s): predict the Ferrite Number (FN) and solidification mode
(A / AF / FA / F) of stainless weld metal from chemical composition.

Sister app to the [Schaeffler diagram app](https://scheffler-v2.vercel.app),
with the same welding workflow:

- Base materials **A** and **B** — 12 presets (austenitic, duplex 2205,
  ferritic, martensitic, structural steel, common fillers) or a **custom
  chemical composition** (C, Mn, Si, Cr, Ni, Mo, Nb, N, Cu)
- Optional **filler metal C** with root-pass and fill-pass **dilution**
- **Multi-pass welding**: pass 1 dilutes into the base-metal mix, later passes
  into the previous pass — watch the points converge toward the filler
- Per-pass FN table, solidification-mode readout, validity warnings

Equivalents: `Creq = Cr + Mo + 0.7 Nb`, `Nieq = Ni + 35 C + 20 N + 0.25 Cu` —
unlike Schaeffler, nitrogen and copper are part of the model.

## Diagram data provenance

The iso-FN lines and mode boundaries in `src/data/wrc1992.ts` were digitized
from Fig. 6 of the original paper (600 dpi, least-squares grid calibration,
residuals < 0.02 equivalent units) by the reproducible pipeline in
`scripts/digitize/`. The emitter refuses to write the data file unless the
paper's own numeric anchors (worked Examples 1–2 and Table 1) are reproduced;
the same anchors are locked in `src/lib/wrc.test.ts`. Do not edit the data
file by hand — re-run the pipeline.

## Development

```bash
npm install
npm run dev        # dev server
npx vitest run     # 38 tests incl. the paper anchors
npm run build      # tsc + vite
```

Deployed on Vercel as project `wrc-1992`.
