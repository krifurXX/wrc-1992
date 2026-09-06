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
  limit: 'Material A (user-defined) has 3.20 % Mo, above the 3 % limit of the WRC-1992 database — the FN prediction is not reliable.',
  outsideMat: 'Material B (EN 10025-2 / S355J2) lies outside the diagram axes. That is normal for unalloyed base metals — the mixing line remains valid as long as the weld metal point lands on the diagram.',
  outsideWeld: 'The weld metal point lies outside the diagram area and no FN prediction is possible.',
  fan: 'The weld metal point lies outside the region covered by the iso-FN lines; extending the lines could give erroneous predictions. Below the lower FN lines martensite may form, which the WRC-1992 diagram does not show.',
  highFn: 'Predicted FN ≈ 56 is above 18, where the accuracy of the WRC-1992 prediction drops from about ±2.5 FN to about ±9 FN.',
  pass: 'One or more intermediate pass points lie outside the diagram area.',
  d: 'WRC-1992 predicts Ferrite Number (FN), a magnetically defined scale — not volume-% ferrite; the two agree only at low FN (100 FN corresponds to roughly 65 vol-% ferrite). The prediction applies to weld metal at arc-welding cooling rates and is only valid inside the drawn iso-FN lines. The prediction is subject to the limitations and assumptions of the original WRC-1992 research.',
  ref1: 'Kotecki, D. J. & Siewert, T. A. (1992). WRC-1992 constitution diagram for stainless steel weld metals: a modification of the WRC-1988 diagram. Welding Journal 71(5), 171-s–178-s.',
  ref2: 'Siewert, T. A., McCowan, C. N. & Olson, D. L. (1988). Ferrite Number prediction to 100 FN in stainless steel weld metal. Welding Journal 67(12), 289-s–298-s.',
}

const content = [
  { title: L('Warnings and Disclaimer in the WRC-1992 App: Source Review',
             'Varningar och ansvarsfriskrivning i WRC-1992-appen: källgranskning') },
  { sub: L('Review basis for a welding-metallurgy expert. Version 2026-09-06, describing the app as deployed after the source-based revision of the same date. App: wrc-1992.vercel.app. Code: src/lib/warnings.ts.',
           'Granskningsunderlag för en expert på svetsmetallurgi. Version 2026-09-06; beskriver appen så som den är driftsatt efter den källbaserade revisionen samma dag. App: wrc-1992.vercel.app. Kod: src/lib/warnings.ts.') },

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
      ['L', APP.limit, L('Mn > 10, Mo > 3, N > 0.2 or Si > 1 wt-% in material A, B or C', 'Mn > 10, Mo > 3, N > 0,2 eller Si > 1 vikt-% i material A, B eller C'), L('Verified: 1988 Conclusions, verbatim limits', 'Verifierat: 1988 slutsatser, ordagranna gränser')],
      ['W1', APP.outsideMat, L('Cr{eq} outside 17–31 or Ni{eq} outside 9–18 for A, B or C', 'Cr{eq} utanför 17–31 eller Ni{eq} utanför 9–18 för A, B eller C'), L('Verified: 1992 pp. 173-s–174-s (extended axes, dissimilar joints)', 'Verifierat: 1992 s. 173-s–174-s (förlängda axlar, blandförband)')],
      ['W2', APP.outsideWeld, L('Final weld metal point outside the axes', 'Slutlig svetsgodspunkt utanför axlarna'), L('Geometric fact', 'Geometriskt faktum')],
      ['W3', APP.fan, L('Final point inside the axes but outside the iso-FN fan', 'Slutpunkt innanför axlarna men utanför iso-FN-solfjädern'), L('Verified: 1992 Fig. 6 caption and p. 173-s; 1988 p. 293-s', 'Verifierat: 1992 fig. 6-text och s. 173-s; 1988 s. 293-s')],
      ['W4', APP.highFn, L('Predicted FN > 18', 'Predikterat FN > 18'), L('Verified: 1988 Table 4', 'Verifierat: 1988 tabell 4')],
      ['W5', APP.pass, L('Any intermediate multi-pass point outside the axes', 'Någon mellanliggande passpunkt utanför axlarna'), L('Geometric fact', 'Geometriskt faktum')],
      ['D', APP.d, L('Always shown, followed by the two references', 'Visas alltid, följd av de två referenserna'), L('Verified: 1992 p. 171-s; 1988 pp. 289-s, 291-s; Fig. 6 caption', 'Verifierat: 1992 s. 171-s; 1988 s. 289-s, 291-s; fig. 6-text')],
    ] } },

  { h1: L('3. Statement by statement', '3. Påstående för påstående') },

  { h2: L('L: composition limits of the database', 'L: databasens sammansättningsgränser') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.limit },
  { label: L('Trigger', 'Utlösning') },
  { p: L('warnings.ts, constant LIMITS. Evaluated for each of material A, B and filler C: Mn > 10, Mo > 3, N > 0.2 or Si > 1 wt-%, strict comparison. With the built-in materials, only custom alloys can trigger it.',
         'warnings.ts, konstanten LIMITS. Utvärderas för vart och ett av material A, B och tillsats C: Mn > 10, Mo > 3, N > 0,2 eller Si > 1 vikt-%, strikt jämförelse. Med de inbyggda materialen kan bara egendefinierade legeringar utlösa den.') },
  { label: L('Basis', 'Underlag') },
  { p: L('These four limits are stated in the conclusions of the 1988 paper and repeated in its abstract. They are not restated in the 1992 paper, which keeps the 1988 database. The Mo limit was 3.5 in the app until 6 September 2026; the source says 3, and gives the reason.',
         'De fyra gränserna anges i 1988-artikelns slutsatser och upprepas i dess sammanfattning. De upprepas inte i 1992-artikeln, som behåller 1988-databasen. Mo-gränsen var 3,5 i appen fram till den 6 september 2026; källan säger 3 och anger skälet.') },
  { quote: 'The diagram is applicable for Mn contents to 10 wt-%, Mo contents to 3 wt-%, N contents to 0.2 wt-% and Si contents to 1 wt-%.', src: 'Siewert, McCowan & Olson 1988, p. 297-s, Conclusion 2' },
  { quote: 'The restriction of the Mo content to less than 3 wt-% resulted in a 2% improvement in the accuracy of the DeLong diagram, and a 4% improvement in the accuracy of the proposed diagram. This significant improvement in the proposed diagram may be the result of a Cr-Mo interaction that is excluded when Mo levels were limited to 3 wt-% […]', src: 'Siewert, McCowan & Olson 1988, p. 294-s' },
  { quote: 'Scarcity of data at very high element concentration levels does suggest some further restrictions; Mn < 10 wt-% and N < 0.2 wt-%. With these restrictions, the proposed diagram has better than an 88% chance of predicting the FN with an accuracy of ±2.5 FN […]', src: 'Siewert, McCowan & Olson 1988, p. 294-s' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified.** The limits are the original research’s own stated conditions, which is exactly what the agreed principle allows. Note that the database itself extends further (Table 1 of the 1988 paper: Mn 0.4–12, Mo 0–7, N 0.03–0.3, Si 0.1–1.3); the limits mark where accuracy was shown to hold, not where data end.',
         '**Verifierat.** Gränserna är originalforskningens egna angivna villkor, precis vad den överenskomna principen tillåter. Observera att databasen i sig sträcker sig längre (tabell 1 i 1988-artikeln: Mn 0,4–12, Mo 0–7, N 0,03–0,3, Si 0,1–1,3); gränserna markerar var noggrannheten visats hålla, inte var data tar slut.') },
  { label: L('Questions for the reviewer', 'Frågor till granskaren') },
  { bullets: [
    L('Is the wording “the FN prediction is not reliable” acceptable, or should it say “less accurate”, as the source only quantifies a loss of accuracy?', 'Är formuleringen ”the FN prediction is not reliable” godtagbar, eller bör den lyda ”less accurate”, eftersom källan bara kvantifierar en försämrad noggrannhet?'),
    L('The 1988 paper also restricts C (0.01–0.15) and Cr/Ni (15–32 / 5–25) by the extent of the database. Should the app warn on those too?', '1988-artikeln begränsar också C (0,01–0,15) och Cr/Ni (15–32 / 5–25) genom databasens omfång. Bör appen varna även för dem?'),
  ] },

  { h2: L('W1: base metal outside the axes', 'W1: grundmaterial utanför axlarna') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.outsideMat },
  { label: L('Trigger', 'Utlösning') },
  { p: L('Material A, B or C with Cr{eq} outside 17–31 or Ni{eq} outside 9–18 (the drawn WRC-1992 axes). Fires for S355 in every dissimilar-joint example.',
         'Material A, B eller C med Cr{eq} utanför 17–31 eller Ni{eq} utanför 9–18 (de ritade WRC-1992-axlarna). Utlöses för S355 i varje blandförbandsexempel.') },
  { label: L('Basis', 'Underlag') },
  { p: L('The 1992 paper introduces the extended axes precisely for this case and works two examples with unalloyed base metals (AISI 1050 and ASTM A36) placed at Cr{eq} = 0, for which no FN can be calculated but whose points anchor the dilution line.',
         '1992-artikeln inför de förlängda axlarna just för detta fall och räknar två exempel med olegerade grundmaterial (AISI 1050 och ASTM A36) placerade vid Cr{eq} = 0, för vilka inget FN kan beräknas men vars punkter förankrar utspädningslinjen.') },
  { quote: 'Although Ferrite Numbers do not exist for weld deposits of low Crₑₖ and Niₑₖ, the positions of such alloys can still be located by extrapolated Crₑₖ and Niₑₖ units on the WRC-1992 diagram. Dilution calculations are based on linear combinations of the compositions, and the extended axes of the diagram allow visualization of the concept.', src: 'Kotecki & Siewert 1992, p. 173-s' },
  { quote: 'The Crₑₖ and Niₑₖ for the AISI 1050 steel (0.0 and 17.50, respectively) do not permit an FN calculation for this material.', src: 'Kotecki & Siewert 1992, p. 173-s' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified.** The text deliberately reassures rather than alarms, because in this app the situation is the normal teaching case. The reviewer may prefer a shorter wording.',
         '**Verifierat.** Texten lugnar avsiktligt snarare än varnar, eftersom situationen i den här appen är det normala undervisningsfallet. Granskaren kanske föredrar en kortare formulering.') },

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
  { p: L('Both sentences come from the primary papers. Until 6 September 2026 the app also had a separate “martensite risk” warning triggered by a fixed corner (Cr{eq} < 19 and Ni{eq} < 11.5) inside the diagram; that trigger had no support in the sources, which place the martensite region beyond the lower FN lines, and it was removed.',
         'Båda meningarna kommer från primärartiklarna. Fram till den 6 september 2026 hade appen dessutom en separat ”martensitrisk”-varning som utlöstes av ett fast hörn (Cr{eq} < 19 och Ni{eq} < 11,5) inne i diagrammet; den triggern saknade stöd i källorna, som placerar martensitområdet bortom de nedre FN-linjerna, och togs bort.') },
  { quote: 'The FN prediction is only accurate for weld compositions that fall within the bounds of the iso-FN lines (0 to 100 FN) that are drawn on the diagram. The limits of the diagram were determined by the extent of the database, and extension of the lines could result in erroneous predictions.', src: 'Kotecki & Siewert 1992, Fig. 6 caption' },
  { quote: 'For some Crₑₖ and Niₑₖ values beyond the lower limits of the FN lines in the WRC-1992 diagram, martensite may be found in the weld metals. […] Because of the differing effects of Mn in the two temperature ranges, it is not possible to include a single line bounding martensite-containing weld metals on the WRC-1992 diagram.', src: 'Kotecki & Siewert 1992, p. 173-s' },
  { quote: 'Therefore, a line denoting the region where martensite and austenite could coexist was not included. Examination of the lower-left region of the map does not reveal a change in line slope and so the effect of martensite seems small for the commercially useful data we studied.', src: 'Siewert, McCowan & Olson 1988, p. 293-s' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified.** One point for the reviewer: the app no longer refers the user to the Schaeffler diagram for the martensite regime. The 1992 paper itself makes that comparison (“In the Schaeffler diagram, such weld metals were indicated below and to the left of a diagonal line”), so a short cross-reference would be source-supported if wanted.',
         '**Verifierat.** En punkt för granskaren: appen hänvisar inte längre användaren till Schaefflerdiagrammet för martensitområdet. 1992-artikeln gör själv den jämförelsen (”In the Schaeffler diagram, such weld metals were indicated below and to the left of a diagonal line”), så en kort korshänvisning skulle ha stöd i källan om den önskas.') },

  { h2: L('W4: accuracy above 18 FN', 'W4: noggrannhet över 18 FN') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.highFn },
  { label: L('Trigger', 'Utlösning') },
  { p: L('Predicted FN > 18 for the final weld metal point. Until 6 September 2026 the threshold was 50, a figure that appears in neither paper.',
         'Predikterat FN > 18 för den slutliga svetsgodspunkten. Fram till den 6 september 2026 var tröskeln 50, en siffra som inte förekommer i någon av artiklarna.') },
  { label: L('Basis', 'Underlag') },
  { p: L('Table 4 of the 1988 paper splits the database at 18 FN and reports the fraction of predictions within a tolerance: below 18 FN, 84 % within ±2.5 FN; above 18 FN, 70 % within ±9 FN. The threshold and both tolerances in the app text are taken from that table. The 1992 paper’s own duplex data (Table 1, 30–100 FN) show a standard error of about 8 FN, consistent with it.',
         'Tabell 4 i 1988-artikeln delar databasen vid 18 FN och redovisar andelen prediktioner inom en tolerans: under 18 FN 84 % inom ±2,5 FN; över 18 FN 70 % inom ±9 FN. Tröskeln och båda toleranserna i apptexten är hämtade ur den tabellen. 1992-artikelns egna duplexdata (tabell 1, 30–100 FN) visar ett standardfel på ungefär 8 FN, vilket stämmer med detta.') },
  { quote: 'Table 4 — Comparison of the Accuracy of the Schaeffler Diagram and the Proposed Diagram. FN > 18: error less than ± 9 FN — Schaeffler 35 %, Proposed 70 % (124 / 125 cases). FN < 18: error less than ± 2.5 FN — Schaeffler 52 %, Proposed 84 % (771 / 740 cases).', src: 'Siewert, McCowan & Olson 1988, p. 296-s (table transcribed)' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified.** The phrase “drops from about ±2.5 FN to about ±9 FN” compresses “84 % within ±2.5” and “70 % within ±9” into one clause; the reviewer may want the percentages shown as well.',
         '**Verifierat.** Frasen ”drops from about ±2.5 FN to about ±9 FN” komprimerar ”84 % inom ±2,5” och ”70 % inom ±9” till en bisats; granskaren kanske vill att procentsatserna också visas.') },

  { h2: L('D: the standing disclaimer and references', 'D: den fasta ansvarsfriskrivningen och referenserna') },
  { label: L('Text in the app', 'Text i appen') },
  { quote: APP.d }, { quote: APP.ref1 }, { quote: APP.ref2 },
  { label: L('Basis', 'Underlag') },
  { p: L('Four claims. (1) FN is a magnetic scale distinct from volume-%: stated in both papers. (2) 100 FN corresponds to roughly 65 vol-%: 1988, p. 289-s; this replaced an earlier, unsourced “0.7 × FN” factor. (3) Arc-welding cooling rates: the 1988 database was produced almost entirely with shielded metal arc electrodes to AWS A5.4, and the paper explicitly does not evaluate other conditions. (4) Validity inside the drawn lines: the Fig. 6 caption quoted under W3.',
         'Fyra påståenden. (1) FN är en magnetisk skala skild från volymprocent: anges i båda artiklarna. (2) 100 FN motsvarar ungefär 65 vol-%: 1988, s. 289-s; detta ersatte en tidigare, obelagd faktor ”0,7 × FN”. (3) Bågsvetsningens svalningshastigheter: 1988-databasen togs nästan helt fram med belagda elektroder enligt AWS A5.4, och artikeln utvärderar uttryckligen inte andra förhållanden. (4) Giltighet innanför de ritade linjerna: fig. 6-texten citerad under W3.') },
  { quote: '[…] the Schaeffler diagram makes its predictions in terms of “percent ferrite.” Later, this was found to be imprecise and the magnetically based “Ferrite Number” (FN) unit was developed for the specification and determination of ferrite content.', src: 'Kotecki & Siewert 1992, p. 171-s' },
  { quote: '[…] ferrite contents to 100 FN (roughly equivalent to 65 vol-% ferrite).', src: 'Siewert, McCowan & Olson 1988, p. 289-s' },
  { quote: 'In fact, the great majority of data were produced with shielded metal arc electrodes conforming to AWS Specification A5.4. […] The equation was not evaluated for welds produced under conditions outside those specified in A5.4.', src: 'Siewert, McCowan & Olson 1988, p. 291-s' },
  { label: L('Assessment', 'Bedömning') },
  { p: L('**Verified.** The closing sentence and the two references implement the principle agreed for the Schaeffler app.',
         '**Verifierat.** Slutmeningen och de två referenserna tillämpar principen som beslutades för Schaefflerappen.') },

  { h1: L('4. Changes made on 6 September 2026', '4. Ändringar gjorda den 6 september 2026') },
  { p: L('For transparency, the state before the revision and the reason for each change:', 'För spårbarhetens skull: läget före revisionen och skälet till varje ändring:') },
  { bullets: [
    L('**Mo limit 3.5 → 3 wt-%.** The code and its comment disagreed (3.5 vs 3); the 1988 conclusions say 3.', '**Mo-gräns 3,5 → 3 vikt-%.** Koden och dess kommentar var oense (3,5 mot 3); 1988-slutsatserna säger 3.'),
    L('**High-FN note: threshold 50 → 18, wording “less accurate” → “±2.5 FN to ±9 FN”.** The figure 50 had no source; Table 4 of the 1988 paper gives 18 and the tolerances.', '**FN-notis: tröskel 50 → 18, formulering ”less accurate” → ”±2,5 FN till ±9 FN”.** Siffran 50 saknade källa; tabell 4 i 1988-artikeln ger 18 och toleranserna.'),
    L('**Separate “martensite risk” warning removed.** Its trigger, a fixed corner inside the diagram, was an app construction. The martensite remark now accompanies W3, where the sources place it.', '**Separat ”martensitrisk”-varning borttagen.** Dess trigger, ett fast hörn inne i diagrammet, var appens egen konstruktion. Martensitanmärkningen följer nu med W3, där källorna placerar den.'),
    L('**Disclaimer: “duplex weld metals at FN ≈ 50 hold roughly 0.7 × FN vol-%” → “100 FN corresponds to roughly 65 vol-% ferrite”.** The 0.7 factor stems from later work not read for this review; the 65 vol-% figure is in the 1988 paper. The sentence “Unlike Schaeffler, the model includes nitrogen and copper” was dropped as unnecessary.', '**Ansvarsfriskrivning: ”duplex weld metals at FN ≈ 50 hold roughly 0.7 × FN vol-%” → ”100 FN corresponds to roughly 65 vol-% ferrite”.** Faktorn 0,7 kommer från senare arbeten som inte lästs för den här granskningen; siffran 65 vol-% finns i 1988-artikeln. Meningen ”Unlike Schaeffler, the model includes nitrogen and copper” ströks som onödig.'),
    L('**General limitation statement and two references added**, mirroring the Schaeffler app.', '**Generellt begränsningspåstående och två referenser tillagda**, som i Schaefflerappen.'),
    L('**All warning texts shortened**; the outside-axes text for weld metal now reads “prediction is not possible”, as agreed for the Schaeffler app.', '**Alla varningstexter kortade**; utanför-axlarna-texten för svetsgods lyder nu ”prediction is not possible”, som beslutat för Schaefflerappen.'),
  ] },

  { h1: L('5. Reviewer checklist', '5. Checklista för granskaren') },
  { bullets: [
    L('L: “not reliable” or “less accurate”? Add C and Cr/Ni database limits?', 'L: ”not reliable” eller ”less accurate”? Lägga till C- och Cr/Ni-gränser ur databasen?'),
    L('W1: keep the reassuring explanation, or shorten to a plain statement?', 'W1: behålla den förklarande texten eller korta till ett rent konstaterande?'),
    L('W3: add a short cross-reference to the Schaeffler diagram for the martensite regime (supported by 1992, p. 173-s)?', 'W3: lägga till en kort korshänvisning till Schaefflerdiagrammet för martensitområdet (stöd i 1992, s. 173-s)?'),
    L('W4: show the percentages (84 % / 70 %) alongside the tolerances?', 'W4: visa procentsatserna (84 % / 70 %) vid sidan av toleranserna?'),
    L('D: is “100 FN corresponds to roughly 65 vol-%” the right way to express the FN–volume relation for students?', 'D: är ”100 FN corresponds to roughly 65 vol-%” rätt sätt att uttrycka FN–volymrelationen för studenter?'),
    L('Anything the original papers state that the app should also warn about (e.g. the AF/FA boundary as a hot-cracking guide, 1988 p. 296-s)?', 'Något som originalartiklarna anger och som appen också borde varna för (t.ex. AF/FA-gränsen som varmsprickindikator, 1988 s. 296-s)?'),
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
