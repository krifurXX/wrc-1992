// Generates the bilingual source-review document for the WRC-1992 app warnings.
// Usage: node scripts/make-warnings-review-doc.cjs   (writes EN + SV .docx to project root)
const path = require('path')
const fs = require('fs')
const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType,
        Footer, PageNumber, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle }
  = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'docx'))

const HV_DARK = '003b5b'
const HV_BLUE = '1380a4'
const CONTENT_W = 9026 // A4 minus 1" margins, DXA

// ---------- tiny markup: {x} = subscript, *x* = italic, **x** = bold ----------
function runs(text, base = {}) {
  const out = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\{[^}]+\})/g
  let last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }))
    const tok = m[0]
    if (tok.startsWith('**')) out.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }))
    else if (tok.startsWith('*')) out.push(new TextRun({ text: tok.slice(1, -1), italics: true, ...base }))
    else out.push(new TextRun({ text: tok.slice(1, -1), subScript: true, ...base }))
    last = m.index + tok.length
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }))
  return out
}

const L = (en, sv) => ({ en, sv })

// ---------- content (one structure, two languages) ----------
// App texts exactly as produced by src/lib/warnings.ts after the 2026-09-06 revision
const APP = {
  limit: 'The prediction is less accurate above 10 % Mn, 3 % Mo, 0.2 % N or 1 % Si (Siewert, McCowan & Olson 1988).',
  outsideMat: 'Unalloyed base metals lie outside the diagram axes. The mixing line remains valid as long as the weld metal point lies on the diagram.',
  outsideWeld: 'The weld metal point lies outside the diagram area and no FN prediction is possible.',
  fan: 'The weld metal point lies outside the region covered by the iso-FN lines; extending the lines could give erroneous predictions.',
  highFn: 'Accuracy of the WRC-1992 prediction (Siewert, McCowan & Olson 1988): below 18 FN, 84 % of predictions fall within ±2.5 FN; above 18 FN, 70 % fall within ±9 FN.',
  pass: 'One or more intermediate pass points lie outside the diagram area.',
  d: 'WRC-1992 predicts Ferrite Number (FN). The prediction applies to weld metal at arc-welding cooling rates and is only valid inside the drawn iso-FN lines. The prediction is subject to the limitations and assumptions of the original WRC-1992 research.',
  ref1: 'Kotecki, D. J. & Siewert, T. A. (1992). WRC-1992 constitution diagram for stainless steel weld metals: a modification of the WRC-1988 diagram. Welding Journal 71(5), 171-s–178-s.',
  ref2: 'Siewert, T. A., McCowan, C. N. & Olson, D. L. (1988). Ferrite Number prediction to 100 FN in stainless steel weld metal. Welding Journal 67(12), 289-s–298-s.',
}

const content = [
  { title: L('Warnings and Disclaimer in the WRC-1992 App: Source Review',
             'Varningar och ansvarsfriskrivning i WRC-1992-appen: källgranskning') },
  { sub: L('Review basis for a welding-metallurgy expert. Version 2026-09-09, describing the app as deployed after the reviewer’s comments of 9 September were applied (second revision). App: wrc-1992.vercel.app. Code: src/lib/warnings.ts.',
           'Granskningsunderlag för en expert på svetsmetallurgi. Version 2026-09-09; beskriver appen så som den är driftsatt efter att granskarens kommentarer från den 9 september förts in (andra revisionen). App: wrc-1992.vercel.app. Kod: src/lib/warnings.ts.') },

  { h1: L('1. Purpose and scope', '1. Syfte och avgränsning') },
  { p: L('This document lists every warning message and the standing disclaimer shown by the WRC-1992 web app and sets out what each statement rests on. It follows the same format as the review of the Schaeffler app and applies the principle agreed in that review: warn only for what the original research itself states, cover everything else with a general statement, and cite the primary sources.',
         'Dokumentet listar samtliga varningstexter och den fasta ansvarsfriskrivningen i webbappen för WRC-1992-diagrammet och redovisar vad varje påstående vilar på. Det följer samma form som granskningen av Schaefflerappen och tillämpar den princip som slogs fast där: varna bara för det originalforskningen själv anger, täck allt annat med ett generellt påstående och hänvisa till primärkällorna.') },
  { p: L('**Authorship and revision.** The texts were written by Claude (Anthropic’s AI assistant) during development in July 2026. On 6 September 2026 they were checked against the two primary papers, both read in full, and revised where they departed from them. Section 4 lists what was changed and why. The texts quoted below are the ones now in the app.',
         '**Upphov och revision.** Texterna skrevs av Claude (Anthropics AI-assistent) under utvecklingen i juli 2026. Den 6 september 2026 kontrollerades de mot de två primärartiklarna, båda lästa i sin helhet, och reviderades där de avvek. Avsnitt 4 redovisar vad som ändrades och varför. Texterna som citeras nedan är de som nu finns i appen.') },
  { p: L('**Sources.** The WRC-1992 diagram (Kotecki & Siewert 1992) is a modification of the WRC-1988 diagram (Siewert, McCowan & Olson 1988); the 1992 paper adds the copper term and the extended axes but takes its database, composition limits and accuracy figures from the 1988 paper. Both are therefore treated as primary sources. Quotations are given in English in both versions of this document; page references of the form 173-s refer to the Welding Research Supplement pagination.',
         '**Källor.** WRC-1992-diagrammet (Kotecki & Siewert 1992) är en modifiering av WRC-1988-diagrammet (Siewert, McCowan & Olson 1988); 1992-artikeln tillför koppartermen och de förlängda axlarna men hämtar databas, sammansättningsgränser och noggrannhetssiffror från 1988-artikeln. Båda behandlas därför som primärkällor. Citat återges på engelska i båda versionerna av dokumentet; sidhänvisningar av typen 173-s avser Welding Research Supplement.') },

  { h1: L('2. Overview', '2. Översikt') },
  { table: {
    widths: [700, 3300, 2100, 2926],
    header: [L('ID', 'ID'), L('Text in the app (example instance)', 'Text i appen (exempel)'), L('Trigger', 'Utlöses när'), L('Status', 'Status')],
    rows: [
      ['L', APP.limit, L('Standing note, always shown (was a per-material warning until 9 Sept.)', 'Fast notis, visas alltid (var en varning per material t.o.m. 9 sept.)'), L('Verified: 1988 Conclusions, verbatim limits', 'Verifierat: 1988 slutsatser, ordagranna gränser')],
      ['W1', APP.outsideMat, L('Any of A, B or C with Cr{eq} outside 17–31 or Ni{eq} outside 9–18; shown once', 'Något av A, B eller C med Cr{eq} utanför 17–31 eller Ni{eq} utanför 9–18; visas en gång'), L('Verified: 1992 pp. 173-s–174-s (extended axes, dissimilar joints)', 'Verifierat: 1992 s. 173-s–174-s (förlängda axlar, blandförband)')],
      ['W2', APP.outsideWeld, L('Final weld metal point outside the axes', 'Slutlig svetsgodspunkt utanför axlarna'), L('Geometric fact', 'Geometriskt faktum')],
      ['W3', APP.fan, L('Final point inside the axes but outside the iso-FN fan', 'Slutpunkt innanför axlarna men utanför iso-FN-solfjädern'), L('Verified: 1992 Fig. 6 caption and p. 173-s; 1988 p. 293-s', 'Verifierat: 1992 fig. 6-text och s. 173-s; 1988 s. 293-s')],
      ['W4', APP.highFn, L('Standing note, always shown (was a warning above 18 FN until 9 Sept.)', 'Fast notis, visas alltid (var en varning över 18 FN t.o.m. 9 sept.)'), L('Verified: 1988 Table 4', 'Verifierat: 1988 tabell 4')],
      ['W5', APP.pass, L('Any intermediate multi-pass point outside the axes', 'Någon mellanliggande passpunkt utanför axlarna'), L('Geometric fact', 'Geometriskt faktum')],
      ['D', APP.d, L('Always shown, followed by the two references', 'Visas alltid, följd av de två referenserna'), L('Verified: 1992 p. 171-s; 1988 pp. 289-s, 291-s; Fig. 6 caption', 'Verifierat: 1992 s. 171-s; 1988 s. 289-s, 291-s; fig. 6-text')],
    ] } },

  { h1: L('3. Statement by statement', '3. Påstående för påstående') },

  { h2: L('L: composition limits of the database', 'L: databasens sammansättningsgränser') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.limit },
  { label: L('Trigger', 'Utlösning') },
  { p: L('warnings.ts, constant DISCLAIMER_NOTES. Always shown below the disclaimer; no longer evaluated per material. Until 9 September it was a warning raised for each material exceeding a limit, worded “the FN prediction is not reliable”; the reviewer asked for “less accurate” and for the limits to be stated as a general disclaimer with the reference.',
         'warnings.ts, konstanten DISCLAIMER_NOTES. Visas alltid under ansvarsfriskrivningen; utvärderas inte längre per material. Fram till den 9 september var det en varning som utlöstes för varje material som överskred en gräns, med lydelsen ”the FN prediction is not reliable”; granskaren bad om ”less accurate” och om att gränserna skulle anges som en generell ansvarsfriskrivning med referens.') },
  { label: L('Basis', 'Underlag') },
  { p: L('These four limits are stated in the conclusions of the 1988 paper and repeated in its abstract. They are not restated in the 1992 paper, which keeps the 1988 database. The Mo limit was 3.5 in the app until 6 September 2026; the source says 3, and gives the reason.',
         'De fyra gränserna anges i 1988-artikelns slutsatser och upprepas i dess sammanfattning. De upprepas inte i 1992-artikeln, som behåller 1988-databasen. Mo-gränsen var 3,5 i appen fram till den 6 september 2026; källan säger 3 och anger skälet.') },
  { quote: 'The diagram is applicable for Mn contents to 10 wt-%, Mo contents to 3 wt-%, N contents to 0.2 wt-% and Si contents to 1 wt-%.', src: 'Siewert, McCowan & Olson 1988, p. 297-s, Conclusion 2' },
  { quote: 'The restriction of the Mo content to less than 3 wt-% resulted in a 2% improvement in the accuracy of the DeLong diagram, and a 4% improvement in the accuracy of the proposed diagram. This significant improvement in the proposed diagram may be the result of a Cr-Mo interaction that is excluded when Mo levels were limited to 3 wt-% […]', src: 'Siewert, McCowan & Olson 1988, p. 294-s' },
  { quote: 'Scarcity of data at very high element concentration levels does suggest some further restrictions; Mn < 10 wt-% and N < 0.2 wt-%. With these restrictions, the proposed diagram has better than an 88% chance of predicting the FN with an accuracy of ±2.5 FN […]', src: 'Siewert, McCowan & Olson 1988, p. 294-s' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified and reviewed.** The limits are the original research’s own stated conditions. The reviewer’s wording (“less accurate”) matches the source, which quantifies a loss of accuracy rather than a validity boundary. Note that the database itself extends further (Table 1 of the 1988 paper: Mn 0.4–12, Mo 0–7, N 0.03–0.3, Si 0.1–1.3).',
         '**Verifierat och granskat.** Gränserna är originalforskningens egna angivna villkor. Granskarens formulering (”less accurate”) stämmer med källan, som kvantifierar en försämrad noggrannhet snarare än en giltighetsgräns. Observera att databasen i sig sträcker sig längre (tabell 1 i 1988-artikeln: Mn 0,4–12, Mo 0–7, N 0,03–0,3, Si 0,1–1,3).') },

  { h2: L('W1: base metal outside the axes', 'W1: grundmaterial utanför axlarna') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.outsideMat },
  { label: L('Trigger', 'Utlösning') },
  { p: L('Shown once when any of material A, B or C has Cr{eq} outside 17–31 or Ni{eq} outside 9–18 (the drawn WRC-1992 axes). Fires for S355 in every dissimilar-joint example. The wording is the reviewer’s; until 9 September the text named the material and was longer.',
         'Visas en gång när något av material A, B eller C har Cr{eq} utanför 17–31 eller Ni{eq} utanför 9–18 (de ritade WRC-1992-axlarna). Utlöses för S355 i varje blandförbandsexempel. Formuleringen är granskarens; fram till den 9 september namngav texten materialet och var längre.') },
  { label: L('Basis', 'Underlag') },
  { p: L('The 1992 paper introduces the extended axes precisely for this case and works two examples with unalloyed base metals (AISI 1050 and ASTM A36) placed at Cr{eq} = 0, for which no FN can be calculated but whose points anchor the dilution line.',
         '1992-artikeln inför de förlängda axlarna just för detta fall och räknar två exempel med olegerade grundmaterial (AISI 1050 och ASTM A36) placerade vid Cr{eq} = 0, för vilka inget FN kan beräknas men vars punkter förankrar utspädningslinjen.') },
  { quote: 'Although Ferrite Numbers do not exist for weld deposits of low Crₑₖ and Niₑₖ, the positions of such alloys can still be located by extrapolated Crₑₖ and Niₑₖ units on the WRC-1992 diagram. Dilution calculations are based on linear combinations of the compositions, and the extended axes of the diagram allow visualization of the concept.', src: 'Kotecki & Siewert 1992, p. 173-s' },
  { quote: 'The Crₑₖ and Niₑₖ for the AISI 1050 steel (0.0 and 17.50, respectively) do not permit an FN calculation for this material.', src: 'Kotecki & Siewert 1992, p. 173-s' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified and reviewed.** The reviewer agreed that a shorter wording is preferable and supplied the sentence now used.',
         '**Verifierat och granskat.** Granskaren instämde i att en kortare formulering är att föredra och gav den mening som nu används.') },

  { h2: L('W2 and W5: weld metal or pass point outside the axes', 'W2 och W5: svetsgods- eller passpunkt utanför axlarna') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.outsideWeld }, { quote: APP.pass },
  { label: L('Basis and assessment', 'Underlag och bedömning') },
  { p: L('Geometric facts about the drawn area; no source claim is made. The wording follows the one agreed for the Schaeffler app (“prediction is not possible”).',
         'Geometriska fakta om den ritade ytan; inget källpåstående görs. Formuleringen följer den som beslutades för Schaefflerappen (”prediction is not possible”).') },

  { h2: L('W3: weld metal outside the iso-FN lines; martensite', 'W3: svetsgods utanför iso-FN-linjerna; martensit') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.fan },
  { label: L('Trigger', 'Utlösning') },
  { p: L('The final weld metal point is inside the axes but the FN interpolation returns no value, i.e. the point is outside the fan of iso-FN lines (typically below and to the left of it).',
         'Den slutliga svetsgodspunkten ligger innanför axlarna, men FN-interpolationen ger inget värde, det vill säga punkten ligger utanför solfjädern av iso-FN-linjer (typiskt nedanför och till vänster om den).') },
  { label: L('Basis', 'Underlag') },
  { p: L('The sentence comes from the caption of Fig. 6 in the 1992 paper. Two earlier elements were removed: a separate “martensite risk” warning triggered by a fixed corner inside the diagram (removed 6 September; no support in the sources), and a second sentence in this warning about martensite below the lower FN lines (removed 9 September at the reviewer’s request: no reference to martensite or to other diagrams).',
         'Meningen kommer från figurtexten till fig. 6 i 1992-artikeln. Två tidigare inslag har tagits bort: en separat ”martensitrisk”-varning som utlöstes av ett fast hörn inne i diagrammet (borttagen 6 september; saknade stöd i källorna), och en andra mening i den här varningen om martensit under de nedre FN-linjerna (borttagen 9 september på granskarens begäran: ingen hänvisning till martensit eller andra diagram).') },
  { quote: 'The FN prediction is only accurate for weld compositions that fall within the bounds of the iso-FN lines (0 to 100 FN) that are drawn on the diagram. The limits of the diagram were determined by the extent of the database, and extension of the lines could result in erroneous predictions.', src: 'Kotecki & Siewert 1992, Fig. 6 caption' },
  { quote: 'For some Crₑₖ and Niₑₖ values beyond the lower limits of the FN lines in the WRC-1992 diagram, martensite may be found in the weld metals. […] Because of the differing effects of Mn in the two temperature ranges, it is not possible to include a single line bounding martensite-containing weld metals on the WRC-1992 diagram.', src: 'Kotecki & Siewert 1992, p. 173-s' },
  { quote: 'Therefore, a line denoting the region where martensite and austenite could coexist was not included. Examination of the lower-left region of the map does not reveal a change in line slope and so the effect of martensite seems small for the commercially useful data we studied.', src: 'Siewert, McCowan & Olson 1988, p. 293-s' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified and reviewed.** The reviewer ruled out any reference to martensite or to other diagrams in the app; the martensite quotations above are retained here only as background.',
         '**Verifierat och granskat.** Granskaren uteslöt varje hänvisning till martensit eller andra diagram i appen; martensitcitaten ovan står kvar här enbart som bakgrund.') },

  { h2: L('W4: accuracy above 18 FN', 'W4: noggrannhet över 18 FN') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.highFn },
  { label: L('Trigger', 'Utlösning') },
  { p: L('Standing note in DISCLAIMER_NOTES, always shown. Until 6 September this was a warning above 50 FN (a figure in neither paper), then a warning above 18 FN; on 9 September the reviewer asked for a general text, always visible, giving both accuracy figures with the reference.',
         'Fast notis i DISCLAIMER_NOTES, visas alltid. Fram till den 6 september var det en varning över 50 FN (en siffra som inte finns i någon av artiklarna), därefter en varning över 18 FN; den 9 september bad granskaren om en generell, alltid synlig text med båda noggrannhetssiffrorna och referensen.') },
  { label: L('Basis', 'Underlag') },
  { p: L('Table 4 of the 1988 paper splits the database at 18 FN and reports the fraction of predictions within a tolerance: below 18 FN, 84 % within ±2.5 FN; above 18 FN, 70 % within ±9 FN. The threshold and both tolerances in the app text are taken from that table. The 1992 paper’s own duplex data (Table 1, 30–100 FN) show a standard error of about 8 FN, consistent with it.',
         'Tabell 4 i 1988-artikeln delar databasen vid 18 FN och redovisar andelen prediktioner inom en tolerans: under 18 FN 84 % inom ±2,5 FN; över 18 FN 70 % inom ±9 FN. Tröskeln och båda toleranserna i apptexten är hämtade ur den tabellen. 1992-artikelns egna duplexdata (tabell 1, 30–100 FN) visar ett standardfel på ungefär 8 FN, vilket stämmer med detta.') },
  { quote: 'Table 4 — Comparison of the Accuracy of the Schaeffler Diagram and the Proposed Diagram. FN > 18: error less than ± 9 FN — Schaeffler 35 %, Proposed 70 % (124 / 125 cases). FN < 18: error less than ± 2.5 FN — Schaeffler 52 %, Proposed 84 % (771 / 740 cases).', src: 'Siewert, McCowan & Olson 1988, p. 296-s (table transcribed)' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified and reviewed.** The note now states both percentages and both tolerances exactly as in Table 4.',
         '**Verifierat och granskat.** Notisen anger nu båda procentsatserna och båda toleranserna exakt som i tabell 4.') },

  { h2: L('D: the standing disclaimer and references', 'D: den fasta ansvarsfriskrivningen och referenserna') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.d }, { quote: APP.ref1 }, { quote: APP.ref2 },
  { label: L('Basis', 'Underlag') },
  { p: L('The wording is the reviewer’s (9 September). Two claims remain: arc-welding cooling rates (the 1988 database was produced almost entirely with shielded metal arc electrodes to AWS A5.4, and the paper explicitly does not evaluate other conditions) and validity inside the drawn lines (the Fig. 6 caption quoted under W3). The earlier explanation of FN versus volume-% ferrite was dropped at the reviewer’s request.',
         'Formuleringen är granskarens (9 september). Två påståenden kvarstår: bågsvetsningens svalningshastigheter (1988-databasen togs nästan helt fram med belagda elektroder enligt AWS A5.4, och artikeln utvärderar uttryckligen inte andra förhållanden) och giltighet innanför de ritade linjerna (fig. 6-texten citerad under W3). Den tidigare förklaringen av FN kontra volymprocent ferrit ströks på granskarens begäran.') },
  { quote: 'In fact, the great majority of data were produced with shielded metal arc electrodes conforming to AWS Specification A5.4. […] The equation was not evaluated for welds produced under conditions outside those specified in A5.4.', src: 'Siewert, McCowan & Olson 1988, p. 291-s' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified and reviewed.** The disclaimer is now the reviewer’s text, followed by the two standing notes (L and W4) and the two references.',
         '**Verifierat och granskat.** Ansvarsfriskrivningen är nu granskarens text, följd av de två fasta notiserna (L och W4) och de två referenserna.') },

  { h1: L('4. Changes made', '4. Gjorda ändringar') },
  { h2: L('4.1 Second revision, 9 September 2026 (reviewer’s comments)', '4.1 Andra revisionen, 9 september 2026 (granskarens kommentarer)') },
  { bullets: [
    L('**Composition-limit warnings replaced by a standing note** with the wording “less accurate” and the 1988 reference.', '**Varningarna för sammansättningsgränser ersatta av en fast notis** med lydelsen ”less accurate” och 1988-referensen.'),
    L('**W1 shortened to the reviewer’s sentence**, shown once without material names.', '**W1 kortad till granskarens mening**, visas en gång utan materialnamn.'),
    L('**W3: the martensite sentence removed**; no reference to martensite or other diagrams anywhere in the app.', '**W3: martensitmeningen borttagen**; ingen hänvisning till martensit eller andra diagram någonstans i appen.'),
    L('**High-FN warning replaced by a standing accuracy note** (84 % within ±2.5 FN below 18 FN; 70 % within ±9 FN above) with the 1988 reference.', '**FN-varningen ersatt av en fast noggrannhetsnotis** (84 % inom ±2,5 FN under 18 FN; 70 % inom ±9 FN över) med 1988-referensen.'),
    L('**Disclaimer replaced by the reviewer’s text**; the FN-versus-volume-% explanation dropped.', '**Ansvarsfriskrivningen ersatt av granskarens text**; förklaringen av FN kontra volymprocent struken.'),
  ] },
  { h2: L('4.2 First revision, 6 September 2026 (source check)', '4.2 Första revisionen, 6 september 2026 (källkontroll)') },
  { p: L('The state before the first revision and the reason for each change:', 'Läget före den första revisionen och skälet till varje ändring:') },
  { bullets: [
    L('**Mo limit 3.5 → 3 wt-%.** The code and its comment disagreed (3.5 vs 3); the 1988 conclusions say 3.', '**Mo-gräns 3,5 → 3 vikt-%.** Koden och dess kommentar var oense (3,5 mot 3); 1988-slutsatserna säger 3.'),
    L('**High-FN note: threshold 50 → 18, wording “less accurate” → “±2.5 FN to ±9 FN”.** The figure 50 had no source; Table 4 of the 1988 paper gives 18 and the tolerances.', '**FN-notis: tröskel 50 → 18, formulering ”less accurate” → ”±2,5 FN till ±9 FN”.** Siffran 50 saknade källa; tabell 4 i 1988-artikeln ger 18 och toleranserna.'),
    L('**Separate “martensite risk” warning removed.** Its trigger, a fixed corner inside the diagram, was an app construction. The martensite remark now accompanies W3, where the sources place it.', '**Separat ”martensitrisk”-varning borttagen.** Dess trigger, ett fast hörn inne i diagrammet, var appens egen konstruktion. Martensitanmärkningen följer nu med W3, där källorna placerar den.'),
    L('**Disclaimer: “duplex weld metals at FN ≈ 50 hold roughly 0.7 × FN vol-%” → “100 FN corresponds to roughly 65 vol-% ferrite”.** The 0.7 factor stems from later work not read for this review; the 65 vol-% figure is in the 1988 paper. The sentence “Unlike Schaeffler, the model includes nitrogen and copper” was dropped as unnecessary.', '**Ansvarsfriskrivning: ”duplex weld metals at FN ≈ 50 hold roughly 0.7 × FN vol-%” → ”100 FN corresponds to roughly 65 vol-% ferrite”.** Faktorn 0,7 kommer från senare arbeten som inte lästs för den här granskningen; siffran 65 vol-% finns i 1988-artikeln. Meningen ”Unlike Schaeffler, the model includes nitrogen and copper” ströks som onödig.'),
    L('**General limitation statement and two references added**, mirroring the Schaeffler app.', '**Generellt begränsningspåstående och två referenser tillagda**, som i Schaefflerappen.'),
    L('**All warning texts shortened**; the outside-axes text for weld metal now reads “prediction is not possible”, as agreed for the Schaeffler app.', '**Alla varningstexter kortade**; utanför-axlarna-texten för svetsgods lyder nu ”prediction is not possible”, som beslutat för Schaefflerappen.'),
  ] },

  { h1: L('5. Review status', '5. Granskningsläge') },
  { p: L('All questions raised in the 6 September version were answered by the reviewer on 9 September and applied as described in section 4.1. One item was not commented on and remains open for a later round:',
         'Alla frågor i versionen från den 6 september besvarades av granskaren den 9 september och fördes in enligt avsnitt 4.1. En punkt kommenterades inte och kvarstår för en senare omgång:') },
  { bullets: [
    L('Whether the AF/FA solidification-mode boundary should be presented as a hot-cracking guide (1988, p. 296-s).', 'Om AF/FA-gränsen för stelningsmod ska presenteras som varmsprickindikator (1988, s. 296-s).'),
  ] },

  { h1: L('6. Sources', '6. Källor') },
  { p: L('**Read in full for this review** (files in the project’s källor folder):', '**Lästa i sin helhet för den här granskningen** (filer i projektets källor-mapp):') },
  { bullets: [
    L('Kotecki, D. J. & Siewert, T. A. (1992). WRC-1992 constitution diagram for stainless steel weld metals: a modification of the WRC-1988 diagram. *Welding Journal* 71(5), 171-s–178-s. [WJ_1992_05_s171.pdf]', 'Kotecki, D. J. & Siewert, T. A. (1992). WRC-1992 constitution diagram for stainless steel weld metals: a modification of the WRC-1988 diagram. *Welding Journal* 71(5), 171-s–178-s. [WJ_1992_05_s171.pdf]'),
    L('Siewert, T. A., McCowan, C. N. & Olson, D. L. (1988). Ferrite Number prediction to 100 FN in stainless steel weld metal. *Welding Journal* 67(12), 289-s–298-s. [WJ_1988_12_s289.pdf, from the AWS archive]', 'Siewert, T. A., McCowan, C. N. & Olson, D. L. (1988). Ferrite Number prediction to 100 FN in stainless steel weld metal. *Welding Journal* 67(12), 289-s–298-s. [WJ_1988_12_s289.pdf, ur AWS-arkivet]'),
  ] },
  { p: L('**Not read** (would settle open points):', '**Inte lästa** (skulle avgöra öppna punkter):') },
  { bullets: [
    L('Kotecki, D. J. (1997). Ferrite determination in stainless steel welds: advances since 1974. *Welding Journal* 76(1), 24-s–37-s. (FN–volume-% relation for duplex weld metal.)', 'Kotecki, D. J. (1997). Ferrite determination in stainless steel welds: advances since 1974. *Welding Journal* 76(1), 24-s–37-s. (FN–volymprocentrelationen för duplext svetsgods.)'),
    L('McCowan, C. N., Siewert, T. A. & Olson, D. L. (1989). Stainless steel welds: prediction of ferrite content. WRC Bulletin 343. (Full database description.)', 'McCowan, C. N., Siewert, T. A. & Olson, D. L. (1989). Stainless steel welds: prediction of ferrite content. WRC Bulletin 343. (Fullständig databasbeskrivning.)'),
    L('Lippold, J. C. & Kotecki, D. J. (2005). *Welding Metallurgy and Weldability of Stainless Steels.* Wiley.', 'Lippold, J. C. & Kotecki, D. J. (2005). *Welding Metallurgy and Weldability of Stainless Steels.* Wiley.'),
  ] },
]
// ---------- rendering ----------
function pick(v, lang) { return typeof v === 'string' ? v : v[lang] }

function build(lang) {
  const children = []
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' }
  const borders = { top: border, bottom: border, left: border, right: border }

  for (const b of content) {
    if (b.title) children.push(new Paragraph({ style: 'Title', children: runs(pick(b.title, lang)) }))
    else if (b.sub) children.push(new Paragraph({ spacing: { after: 320 }, children: runs(pick(b.sub, lang), { color: '555555', size: 20 }) }))
    else if (b.h1) children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs(pick(b.h1, lang)) }))
    else if (b.h2) children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(pick(b.h2, lang)) }))
    else if (b.label) children.push(new Paragraph({ spacing: { before: 160, after: 60 }, children: runs(pick(b.label, lang), { bold: true, color: HV_BLUE, size: 20 }) }))
    else if (b.p) children.push(new Paragraph({ spacing: { after: 160, line: 300 }, children: runs(pick(b.p, lang)) }))
    else if (b.quote) {
      children.push(new Paragraph({ indent: { left: 567 }, spacing: { after: b.src ? 40 : 120, line: 280 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: HV_BLUE, space: 8 } },
        children: runs('“' + b.quote + '”', { italics: true, size: 20 }) }))
      if (b.src) children.push(new Paragraph({ indent: { left: 567 }, spacing: { after: 160 },
        children: runs('– ' + pick(b.src, lang), { color: '555555', size: 18 }) }))
    }
    else if (b.bullets) for (const it of b.bullets)
      children.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 100, line: 280 }, children: runs(pick(it, lang)) }))
    else if (b.table) {
      const { widths, header, rows } = b.table
      const cell = (txt, w, isHead) => new TableCell({ borders, width: { size: w, type: WidthType.DXA },
        shading: isHead ? { fill: 'E4F1F8', type: ShadingType.CLEAR } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ spacing: { after: 0, line: 260 }, children: runs(pick(txt, lang), { size: 18, bold: !!isHead }) })] })
      children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
        rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], true)) }),
               ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false)) }))] }))
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
    }
  }

  const footer = lang === 'en' ? 'University West · HV.SE · Page ' : 'Högskolan Väst · HV.SE · Sida '
  return new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal',
          run: { size: 36, bold: true, font: 'Arial', color: HV_DARK }, paragraph: { spacing: { after: 120 } } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: HV_DARK },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Arial', color: HV_DARK },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      ],
    },
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–',
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: footer, size: 18, color: '666666' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '666666' })] })] }) },
      children,
    }],
  })
}

const OUT = {
  en: 'WRC-1992-app-warnings-review-EN.docx',
  sv: 'WRC-1992-app-varningsgranskning-SV.docx',
}
;(async () => {
  for (const lang of ['en', 'sv']) {
    const buf = await Packer.toBuffer(build(lang))
    fs.writeFileSync(path.join(__dirname, '..', OUT[lang]), buf)
    console.log('written', OUT[lang])
  }
})()
