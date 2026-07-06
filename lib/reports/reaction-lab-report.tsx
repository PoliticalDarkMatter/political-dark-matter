import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  FORMATS, GOALS, INPUT_MODES, RISK_TOLERANCE_LABELS, ROLES, SITUATIONS, TOPICS,
} from "@/lib/reaction-simulator/mock-data";
import type { OverallScores, ReactionSimulationResult, Verdict } from "@/lib/reaction-simulator/types";
import {
  Badge, BulletList, Divider, LabeledText, MeterBar, ReportFooter, ReportHeader,
  SectionHeading, SimpleTable, colors, formatDate, styles,
} from "./pdf-theme";

// ── Raport PDF — Political Reaction Simulator (moduł tekstowy) ───────
// Analogicznie do lib/reports/image-lab-report.tsx: jedna <Page wrap>,
// react-pdf sam paginuje. Uwzględnia wszystkie 4 tryby wprowadzania
// (patrz InputMode w types.ts) — sekcja kontekstu pokazuje tylko pola
// właściwe dla trybu, w którym wygenerowano dany wynik.

const VERDICT_LABEL: Record<Verdict, string> = {
  publikowac: "Publikować",
  publikowac_po_poprawkach: "Publikować po poprawkach",
  potencjal_ofensywny_wymaga_oslony: "Potencjał ofensywny — wymaga osłony",
  wysokie_ryzyko: "Wysokie ryzyko",
  nie_publikowac: "Nie publikować w tej formie",
};

const VERDICT_TONE: Record<Verdict, number> = {
  publikowac: 10, publikowac_po_poprawkach: 35, potencjal_ofensywny_wymaga_oslony: 60,
  wysokie_ryzyko: 82, nie_publikowac: 92,
};

const SCORE_ROWS: Array<{ key: keyof OverallScores; label: string; invert?: boolean }> = [
  { key: "crisisRisk", label: "Ryzyko kryzysu" },
  { key: "outOfContextVulnerability", label: "Podatność na wyrwanie z kontekstu" },
  { key: "memeRisk", label: "Ryzyko memizacji" },
  { key: "centerCost", label: "Koszt u centrum" },
  { key: "mobilizationPotential", label: "Potencjał mobilizacji", invert: true },
  { key: "ownBaseGain", label: "Zysk u własnych", invert: true },
  { key: "mediaPotential", label: "Potencjał medialny" },
  { key: "clarity", label: "Zrozumiałość", invert: true },
];

function findLabel(list: Array<{ value: string; label: string }>, value: string): string {
  return list.find((x) => x.value === value)?.label ?? value ?? "—";
}

export function buildReactionLabReportDocument(result: ReactionSimulationResult): React.ReactElement {
  const { input } = result;
  const verdictLabel = VERDICT_LABEL[result.verdict];
  const verdictTone = VERDICT_TONE[result.verdict];
  const modeMeta = INPUT_MODES.find((m) => m.value === input.inputMode);

  return (
    <Document title="Raport — Political Reaction Simulator" author="Political Dark Matter · Narrative Scope">
      <Page size="A4" style={styles.page} wrap>
        <ReportHeader kicker="Political Dark Matter · Narrative Scope" title="Political Reaction Simulator — raport" meta={`Wygenerowano: ${formatDate(result.generatedAt)}`} />
        <ReportFooter />

        {/* ── Kontekst wejściowy ── */}
        <View style={styles.panel}>
          <Text style={styles.labelSmall}>Tryb analizy</Text>
          <Text style={{ ...styles.bodyText, marginBottom: 6 }}>{modeMeta?.label ?? input.inputMode}</Text>

          <Text style={styles.labelSmall}>Analizowana treść</Text>
          <Text style={{ ...styles.bodyText, marginBottom: 6, fontStyle: "italic" }}>„{input.text}"</Text>

          {input.threadItems.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Kolejne elementy wątku</Text>
              <BulletList items={input.threadItems} />
            </View>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {input.eventTiming ? (
              <View style={{ width: "50%", marginBottom: 6 }}>
                <Text style={styles.labelSmall}>Kiedy</Text>
                <Text style={styles.bodyText}>{input.eventTiming}</Text>
              </View>
            ) : null}
            {input.eventStakeholders ? (
              <View style={{ width: "50%", marginBottom: 6 }}>
                <Text style={styles.labelSmall}>Kogo dotyczy</Text>
                <Text style={styles.bodyText}>{input.eventStakeholders}</Text>
              </View>
            ) : null}
            {input.priorReaction ? (
              <View style={{ width: "100%", marginBottom: 6 }}>
                <Text style={styles.labelSmall}>Dotychczasowa reakcja</Text>
                <Text style={styles.bodyText}>{input.priorReaction}</Text>
              </View>
            ) : null}
            {input.analysisGoal ? (
              <View style={{ width: "100%", marginBottom: 6 }}>
                <Text style={styles.labelSmall}>Cel analizy</Text>
                <Text style={styles.bodyText}>{input.analysisGoal}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
            <View style={{ width: "33%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Temat</Text>
              <Text style={styles.bodyText}>{input.topic ? findLabel(TOPICS, input.topic) : "—"}</Text>
            </View>
            <View style={{ width: "33%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Format</Text>
              <Text style={styles.bodyText}>{input.format ? findLabel(FORMATS, input.format) : "—"}</Text>
            </View>
            <View style={{ width: "33%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Sytuacja</Text>
              <Text style={styles.bodyText}>{input.situation ? findLabel(SITUATIONS, input.situation) : "—"}</Text>
            </View>
            <View style={{ width: "33%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Rola</Text>
              <Text style={styles.bodyText}>{input.role ? findLabel(ROLES, input.role) : "—"}</Text>
            </View>
            <View style={{ width: "33%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Cel komunikacyjny</Text>
              <Text style={styles.bodyText}>{input.goal ? findLabel(GOALS, input.goal) : "—"}</Text>
            </View>
            <View style={{ width: "33%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Tolerancja ryzyka</Text>
              <Text style={styles.bodyText}>{RISK_TOLERANCE_LABELS[input.riskTolerance] ?? input.riskTolerance}</Text>
            </View>
          </View>
        </View>

        {/* ── Local Pre-Scan ── */}
        <SectionHeading title="Local Pre-Scan" subtitle="Deterministyczny skan fraz zapalnych, bez udziału AI" />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Badge text={`Ryzyko bazowe: ${result.localScan.riskBand}`} value={result.localScan.baseRiskScore} />
          <Text style={{ fontSize: 8, color: colors.muted }}>Ton: {result.localScan.toneLabel}</Text>
        </View>
        {result.localScan.triggerMatches.length > 0 && (
          <BulletList items={result.localScan.triggerMatches.map((t) => `„${t.phrase}" (waga ${t.weight}) — ${t.reason}`)} />
        )}
        {result.localScan.likelyCrisisArchetype && (
          <Text style={{ fontSize: 8.5, color: colors.muted, marginTop: 4 }}>Prawdopodobny archetyp kryzysu: {result.localScan.likelyCrisisArchetype}</Text>
        )}
        <Divider />

        {/* ── Werdykt ── */}
        <SectionHeading title="Werdykt i rekomendacja" />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <Badge text={verdictLabel} value={verdictTone} />
          <Text style={{ fontSize: 8, color: colors.muted }}>
            Pewność analizy: {result.uncertaintyLevel === "wysoka" ? "niska" : result.uncertaintyLevel === "srednia" ? "średnia" : "wysoka"}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.ink, fontStyle: "italic", marginBottom: 6, lineHeight: 1.5 }}>„{result.summary}"</Text>
        {input.inputMode === "wydarzenie_zaistniale" && (
          <Text style={{ fontSize: 7.5, color: colors.muted, marginBottom: 6 }}>To już zaistniało — etykieta werdyktu odnosi się do dalszego reagowania, nie do pierwszej publikacji.</Text>
        )}

        <SectionHeading title="Wskaźniki ogólne" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
          {SCORE_ROWS.map((row) => (
            <View key={row.key} style={{ width: "50%", paddingRight: 10 }}>
              <MeterBar label={row.label} value={result.overallScores[row.key]} invert={row.invert} />
            </View>
          ))}
        </View>
        <Divider />

        {/* ── Frazy zapalne ── */}
        {result.triggerPhrases.length > 0 && (
          <>
            <SectionHeading title="Analiza fraz zapalnych" />
            <SimpleTable
              columns={[
                { key: "phrase", label: "Fraza", width: 1 },
                { key: "why", label: "Dlaczego ryzykowne", width: 1.6 },
                { key: "action", label: "Działanie", width: 0.7 },
                { key: "alt", label: "Alternatywa", width: 1.4 },
              ]}
              rows={result.triggerPhrases.map((t) => ({ phrase: `„${t.phrase}"`, why: t.why, action: t.action, alt: t.alternative }))}
            />
            <Divider />
          </>
        )}

        {/* ── Segmenty ── */}
        <SectionHeading title="Reakcje segmentów odbiorców" />
        <SimpleTable
          columns={[
            { key: "segment", label: "Segment", width: 1 },
            { key: "emotion", label: "Emocja", width: 0.8 },
            { key: "acc", label: "Akceptacja", width: 0.5 },
            { key: "outrage", label: "Oburzenie", width: 0.5 },
            { key: "comment", label: "Przykładowy komentarz", width: 2 },
          ]}
          rows={result.segmentReactions.map((s) => ({
            segment: s.segment, emotion: s.emotion, acc: `${s.acceptance}`, outrage: `${s.outrage}`, comment: s.sampleComment,
          }))}
        />
        <Divider />

        {/* ── Media ── */}
        <SectionHeading title="Media Room" />
        <SimpleTable
          columns={[
            { key: "cat", label: "Kategoria", width: 0.9 },
            { key: "headline", label: "Prawdopodobny nagłówek", width: 1.8 },
            { key: "frame", label: "Rama", width: 1.3 },
            { key: "risk", label: "Ryzyko", width: 0.5 },
          ]}
          rows={result.mediaFrames.map((m) => ({ cat: m.category, headline: m.likelyHeadline, frame: m.frame, risk: m.riskLevel }))}
        />
        <Divider />

        {/* ── Przeciwnicy ── */}
        <SectionHeading title="Opponent Room — linie ataku" />
        <SimpleTable
          columns={[
            { key: "vector", label: "Wektor", width: 0.8 },
            { key: "from", label: "Od kogo", width: 1 },
            { key: "attack", label: "Treść ataku", width: 2.2 },
            { key: "sev", label: "Siła", width: 0.5 },
          ]}
          rows={result.opponentAttacks.map((a) => ({ vector: a.vector, from: a.from, attack: a.attack, sev: `${a.severity}` }))}
        />
        <Divider />

        {/* ── Najgorsze odczytanie ── */}
        <SectionHeading title="Destroy Mode — najgorsze możliwe odczytanie" />
        <LabeledText label="Cytat wyrwany z kontekstu">{result.worstCaseInterpretation.outOfContextQuote}</LabeledText>
        <LabeledText label="Tweet przeciwnika">{result.worstCaseInterpretation.opponentTweet}</LabeledText>
        <LabeledText label="Pasek TV">{result.worstCaseInterpretation.tvChyron}</LabeledText>
        <LabeledText label="Nagłówek portalu">{result.worstCaseInterpretation.portalHeadline}</LabeledText>
        <LabeledText label="Pytanie dziennikarza">{result.worstCaseInterpretation.journalistQuestion}</LabeledText>
        <LabeledText label="Twierdzenie fact-checkera">{result.worstCaseInterpretation.factCheckClaim}</LabeledText>
        <LabeledText label="Komentarz rozczarowanego wyborcy">{result.worstCaseInterpretation.disappointedVoterComment}</LabeledText>
        <LabeledText label="Podsumowanie mema">{result.worstCaseInterpretation.memeSummary}</LabeledText>
        <Divider />

        {/* ── Oś eskalacji ── */}
        <SectionHeading title="Oś eskalacji / propagacji" />
        <SimpleTable
          columns={[
            { key: "window", label: "Okno", width: 0.6 },
            { key: "what", label: "Co się dzieje", width: 2 },
            { key: "counter", label: "Środek zaradczy", width: 1.4 },
            { key: "intensity", label: "Natężenie", width: 0.5 },
          ]}
          rows={result.escalationTimeline.map((e) => ({ window: `${e.window}\n${e.label}`, what: e.whatHappens, counter: e.counterMeasure, intensity: `${e.intensity}` }))}
        />
        <Divider />

        {/* ── Warianty kontrfaktyczne ── */}
        <SectionHeading title="Warianty alternatywne (kontrfaktyczne)" />
        {result.counterfactualVariants.map((v, i) => (
          <View key={i} style={{ marginBottom: 8, borderLeftWidth: 2, borderLeftColor: v.type === result.recommendedVariantType ? colors.safe : colors.border, paddingLeft: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.ink }}>
                {v.label}{v.type === result.recommendedVariantType ? "  ★ rekomendowany" : ""}
              </Text>
            </View>
            <Text style={{ fontSize: 8.5, color: colors.body, fontStyle: "italic", marginBottom: 3 }}>„{v.text}"</Text>
            <Text style={{ fontSize: 7.5, color: colors.muted }}>
              atak: {v.scores.attackRisk} · zrozumiałość: {v.scores.clarity} · mobilizacja: {v.scores.mobilizationPotential} · media: {v.scores.mediaPotential} · mem: {v.scores.memeRisk} · dopasowanie do celu: {v.scores.goalFit}
            </Text>
          </View>
        ))}
        <Divider />

        {/* ── Test milczenia ── */}
        <SectionHeading title="Silence Test — czy w ogóle reagować" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
          <View style={{ width: "33%" }}>
            <Text style={styles.labelSmall}>Reakcja potrzebna</Text>
            <Text style={styles.bodyText}>{result.silenceTest.isResponseNeeded ? "Tak" : "Nie"}</Text>
          </View>
          <View style={{ width: "33%" }}>
            <Text style={styles.labelSmall}>Reakcja by wzmocniła temat</Text>
            <Text style={styles.bodyText}>{result.silenceTest.wouldResponseAmplify ? "Tak" : "Nie"}</Text>
          </View>
          <View style={{ width: "33%" }}>
            <Text style={styles.labelSmall}>Rekomendowany kanał</Text>
            <Text style={styles.bodyText}>{result.silenceTest.recommendedChannel}</Text>
          </View>
        </View>
        <LabeledText label="Uzasadnienie">{result.silenceTest.reasoning}</LabeledText>
        <LabeledText label="Kiedy wrócić do tematu">{result.silenceTest.whenToReturn}</LabeledText>
        <Divider />

        {/* ── Red flags ── */}
        {result.redFlags.length > 0 && (
          <>
            <SectionHeading title="Red Flags" />
            {result.redFlags.map((r, i) => (
              <View key={i} style={{ marginBottom: 5 }}>
                <MeterBar label={r.type} value={r.severity} />
                <Text style={{ fontSize: 8, color: colors.muted, marginTop: -3 }}>{r.description}</Text>
              </View>
            ))}
            <Divider />
          </>
        )}

        {/* ── Rekomendacja strategiczna ── */}
        <SectionHeading title="Rekomendacja strategiczna" />
        <View style={{ marginBottom: 6 }}>
          <Badge text={`Działanie: ${result.strategicRecommendation.action}`} />
        </View>
        <LabeledText label="Co zrobić">{result.strategicRecommendation.whatToDo}</LabeledText>
        <LabeledText label="Czego unikać">{result.strategicRecommendation.whatToAvoid}</LabeledText>
        <LabeledText label="Zdanie, które trzeba powiedzieć">{result.strategicRecommendation.mustSaySentence}</LabeledText>
        <LabeledText label="Zdanie, które zabija (nie mówić)">{result.strategicRecommendation.killerSentence}</LabeledText>
        <LabeledText label="Zdanie, które ratuje">{result.strategicRecommendation.saverSentence}</LabeledText>
        <LabeledText label="Pierwsza odpowiedź kontrataku">{result.strategicRecommendation.firstCounterResponse}</LabeledText>
        <LabeledText label="Zapasowe oświadczenie">{result.strategicRecommendation.backupStatement}</LabeledText>
        {result.strategicRecommendation.whatToMonitor.length > 0 && (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.labelSmall}>Co monitorować</Text>
            <BulletList items={result.strategicRecommendation.whatToMonitor} />
          </View>
        )}
        <LabeledText label="Kiedy wrócić do reakcji">{result.strategicRecommendation.whenToReactAgain}</LabeledText>
        <Divider />

        {/* ── Pewność i ograniczenia ── */}
        <SectionHeading title="Pewność analizy i ograniczenia danych" />
        <Text style={{ fontSize: 8.5, color: colors.muted, lineHeight: 1.5, marginBottom: 6 }}>{result.aiConfidenceNotes}</Text>
        <BulletList items={result.dataLimitations} />

        {result.usedFallback.length > 0 && (
          <View style={{ marginTop: 10, backgroundColor: colors.warnSoft, borderWidth: 1, borderColor: colors.warn, borderRadius: 4, padding: 8 }}>
            <Text style={{ fontSize: 8, color: colors.warn, fontWeight: "bold" }}>
              ⚠ Dla następujących etapów użyto fallbacku lokalnego (uproszczona analiza): {result.usedFallback.join(", ")}.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
