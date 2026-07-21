import { Document, Image as PdfImage, Page, Text, View } from "@react-pdf/renderer";
import {
  CAPTION_TYPE_LABELS, CHANNELS, EVENT_TYPES, GOALS, RISK_TOLERANCE_LABELS, VISUAL_RISK_FACTOR_LABELS,
} from "@/lib/image-reaction-simulator/mock-data";
import type { ImageOverallScores, ImageReactionSimulationResult, ImageVerdict } from "@/lib/image-reaction-simulator/types";
import {
  Badge, BulletList, Divider, LabeledText, MeterBar, ReportFooter, ReportHeader,
  SectionHeading, SimpleTable, colors, formatDate, styles,
} from "./pdf-theme";

// ── Raport PDF — Political Image Reaction Simulator ───────────────────
// Pełne dane z ImageReactionSimulationResult w jednym, drukowalnym
// dokumencie — jedna <Page> z wrap=true (domyślne), react-pdf sam
// łamie zawartość na kolejne strony w miarę potrzeby.

const VERDICT_LABEL: Record<ImageVerdict, string> = {
  publikowac: "Publikować",
  publikowac_po_poprawkach: "Publikować po poprawkach",
  publikowac_z_oslona: "Publikować tylko z osłoną tekstową",
  dobry_kadr_zly_kontekst: "Dobry kadr, zły kontekst",
  potencjal_ale_memizacja: "Potencjał, ale grozi memizacją",
  lepsze_wewnetrznie: "Lepsze jako materiał wewnętrzny",
  wysokie_ryzyko: "Wysokie ryzyko",
  nie_publikowac: "Nie publikować w tej formie",
};

const VERDICT_TONE: Record<ImageVerdict, number> = {
  publikowac: 10, publikowac_po_poprawkach: 35, publikowac_z_oslona: 40,
  dobry_kadr_zly_kontekst: 60, potencjal_ale_memizacja: 60, lepsze_wewnetrznie: 65,
  wysokie_ryzyko: 82, nie_publikowac: 92,
};

const SCORE_ROWS: Array<{ key: keyof ImageOverallScores; label: string; invert?: boolean }> = [
  { key: "authenticity", label: "Autentyczność", invert: true },
  { key: "empathy", label: "Empatia", invert: true },
  { key: "agency", label: "Sprawczość", invert: true },
  { key: "strengthAuthority", label: "Siła / autorytet", invert: true },
  { key: "closenessToPeople", label: "Bliskość ludzi", invert: true },
  { key: "memeRisk", label: "Ryzyko memizacji" },
  { key: "arroganceRisk", label: "Ryzyko arogancji" },
  { key: "artificialityRisk", label: "Ryzyko sztuczności" },
  { key: "outOfContextRisk", label: "Ryzyko wyrwania z kontekstu" },
  { key: "viralPotential", label: "Potencjał viralowy" },
  { key: "centerCost", label: "Koszt u centrum" },
  { key: "ownBaseGain", label: "Zysk u własnych", invert: true },
  { key: "channelFit", label: "Dopasowanie do kanału", invert: true },
];

function findLabel(list: Array<{ value: string; label: string }>, value: string): string {
  return list.find((x) => x.value === value)?.label ?? value ?? "—";
}

export function buildImageLabReportDocument(
  result: ImageReactionSimulationResult,
  imageDataUri?: string | null
): React.ReactElement {
  const { input } = result;
  const verdictLabel = VERDICT_LABEL[result.verdict];
  const verdictTone = VERDICT_TONE[result.verdict];

  return (
    <Document title={`Raport — Political Image Reaction Simulator — ${input.who || "bez nazwy"}`} author="IMPACT CENTER · Narrative Scope">
      <Page size="A4" style={styles.page} wrap>
        <ReportHeader kicker="IMPACT CENTER · Narrative Scope" title="Political Image Reaction Simulator — raport" meta={`Wygenerowano: ${formatDate(result.generatedAt)}`} />
        <ReportFooter />

        {/* ── Kontekst wejściowy ── */}
        <View style={styles.panel}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <View style={{ width: "50%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Kto na zdjęciu</Text>
              <Text style={styles.bodyText}>{input.who || "—"}</Text>
            </View>
            <View style={{ width: "50%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Kanał docelowy</Text>
              <Text style={styles.bodyText}>{input.channel ? findLabel(CHANNELS, input.channel) : "—"}</Text>
            </View>
            <View style={{ width: "50%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Cel komunikacyjny</Text>
              <Text style={styles.bodyText}>{input.goal ? findLabel(GOALS, input.goal) : "—"}</Text>
            </View>
            <View style={{ width: "50%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Typ wydarzenia</Text>
              <Text style={styles.bodyText}>{input.eventType ? findLabel(EVENT_TYPES, input.eventType) : "—"}</Text>
            </View>
            <View style={{ width: "50%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Tolerancja ryzyka</Text>
              <Text style={styles.bodyText}>{RISK_TOLERANCE_LABELS[input.riskTolerance] ?? input.riskTolerance}</Text>
            </View>
            <View style={{ width: "50%", marginBottom: 6 }}>
              <Text style={styles.labelSmall}>Reakcja kryzysowa / kontratak</Text>
              <Text style={styles.bodyText}>{[input.isCrisisResponse && "reakcja kryzysowa", input.isCounterAttack && "kontratak"].filter(Boolean).join(", ") || "nie dotyczy"}</Text>
            </View>
          </View>
          {input.additionalContext ? (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.labelSmall}>Kontekst / intencja podane przez użytkownika</Text>
              <Text style={styles.bodyText}>{input.additionalContext}</Text>
            </View>
          ) : null}
        </View>

        {imageDataUri && (
          <View style={{ marginBottom: 10, alignItems: "center" }}>
            <PdfImage src={imageDataUri} style={{ maxWidth: 260, maxHeight: 180, objectFit: "contain", borderRadius: 4 }} />
            <Text style={{ fontSize: 7, color: colors.faint, marginTop: 3 }}>Podgląd analizowanego zdjęcia (wersja przeskalowana użyta do analizy AI)</Text>
          </View>
        )}

        {/* ── Werdykt ── */}
        <SectionHeading title="Werdykt i rekomendacja" />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <Badge text={verdictLabel} value={verdictTone} />
          <Text style={{ fontSize: 8, color: colors.muted }}>
            Pewność analizy: {result.uncertaintyLevel === "wysoka" ? "niska" : result.uncertaintyLevel === "srednia" ? "średnia" : "wysoka"}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.ink, fontStyle: "italic", marginBottom: 6, lineHeight: 1.5 }}>„{result.summary}"</Text>
        <View style={{ backgroundColor: colors.skySoft, borderWidth: 1, borderColor: colors.sky, borderRadius: 4, padding: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 9.5, color: colors.sky, fontWeight: "bold" }}>→ {result.recommendedAction}</Text>
        </View>

        {/* ── Wskaźniki ogólne ── */}
        <SectionHeading title="Wskaźniki ogólne" subtitle="0-100, kierunek interpretacji zależny od wskaźnika (patrz kolor)" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
          {SCORE_ROWS.map((row) => (
            <View key={row.key} style={{ width: "50%", paddingRight: 10 }}>
              <MeterBar label={row.label} value={result.overallScores[row.key]} invert={row.invert} />
            </View>
          ))}
        </View>
        <Divider />

        {/* ── Ryzyka wizualne ── */}
        <SectionHeading title="Silnik ryzyka wizualnego" />
        {result.visualRiskFactors.map((f, i) => (
          <View key={i} style={{ marginBottom: 5 }}>
            <MeterBar label={f.label} value={f.score} />
            <Text style={{ fontSize: 8, color: colors.muted, marginTop: -3, marginBottom: 4 }}>{f.reason}</Text>
          </View>
        ))}

        {result.riskHotspots.length > 0 && (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <Text style={styles.labelSmall}>Hotspoty na kadrze</Text>
            <BulletList items={result.riskHotspots.map((h) => `${h.kind === "ryzyko" ? "Ryzyko" : "Atut"} — ${h.label}: ${h.note}`)} />
          </View>
        )}
        <Divider />

        {/* ── Meme Potential ── */}
        <SectionHeading title="Meme Potential Engine" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Badge text={result.memePotential.isMemeable ? `Memiczne — ${result.memePotential.score}/100` : `Niski potencjał — ${result.memePotential.score}/100`} value={result.memePotential.score} />
        </View>
        <LabeledText label="Najbardziej memiczny element">{result.memePotential.mostMemeableElement}</LabeledText>
        {result.memePotential.possibleCaptions.length > 0 && (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.labelSmall}>Możliwe podpisy mema</Text>
            <BulletList items={result.memePotential.possibleCaptions} />
          </View>
        )}
        <LabeledText label="Jak się bronić">{result.memePotential.defenseAdvice}</LabeledText>
        <Divider />

        {/* ── Precedensy wizualne ── */}
        <SectionHeading title="Visual Precedent Engine" subtitle="Dopasowanie do ogólnych, powtarzalnych wzorców wizualnych — nie baza konkretnych afer" />
        {result.visualPrecedents.length === 0 ? (
          <Text style={styles.bodyText}>To zdjęcie nie pasuje wyraźnie do żadnego ze znanych wzorców w bibliotece analizy.</Text>
        ) : (
          result.visualPrecedents.map((p, i) => (
            <View key={i} style={{ marginBottom: 8, borderLeftWidth: 2, borderLeftColor: colors.purple, paddingLeft: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.ink }}>{p.label}</Text>
                <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.purple }}>dopasowanie {p.matchStrength}/100</Text>
              </View>
              <Text style={{ fontSize: 8.5, color: colors.body, lineHeight: 1.4, marginBottom: 2 }}>{p.whySimilar}</Text>
              <Text style={{ fontSize: 8, color: colors.muted, lineHeight: 1.4, marginBottom: 2 }}>Zwykły przebieg: {p.typicalOutcome}</Text>
              <Text style={{ fontSize: 7.5, color: colors.warn, fontStyle: "italic" }}>⚠ {p.historicalNote}</Text>
            </View>
          ))
        )}
        <Divider />

        {/* ── Segmenty ── */}
        <SectionHeading title="Reakcje segmentów odbiorców" />
        <SimpleTable
          columns={[
            { key: "segment", label: "Segment", width: 1.1 },
            { key: "emotion", label: "Emocja", width: 0.9 },
            { key: "acc", label: "Akceptacja", width: 0.6 },
            { key: "risk", label: "Ryzyko", width: 0.6 },
            { key: "comment", label: "Przykładowy komentarz", width: 2 },
          ]}
          rows={result.segmentReactions.map((s) => ({
            segment: s.segment, emotion: s.emotion, acc: `${s.acceptance}`, risk: `${s.risk}`, comment: s.likelyComment,
          }))}
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

        {/* ── Media ── */}
        <SectionHeading title="Media Room" />
        <SimpleTable
          columns={[
            { key: "cat", label: "Kategoria", width: 0.9 },
            { key: "headline", label: "Nagłówek portalu", width: 1.6 },
            { key: "chyron", label: "Pasek TV", width: 1.3 },
            { key: "risk", label: "Ryzyko", width: 0.6 },
          ]}
          rows={result.mediaFrames.map((m) => ({ cat: m.category, headline: m.portalHeadline, chyron: m.tvChyron, risk: m.negativeUseRisk }))}
        />
        <Divider />

        {/* ── Caption Room ── */}
        <SectionHeading title="Caption Room — rekomendowane podpisy" />
        <SimpleTable
          columns={[
            { key: "type", label: "Typ", width: 0.7 },
            { key: "text", label: "Treść", width: 2.4 },
            { key: "risk", label: "Ryzyko", width: 0.5 },
          ]}
          rows={result.captionRecommendations.map((c) => ({ type: CAPTION_TYPE_LABELS[c.type] ?? c.type, text: c.text, risk: `${c.risk}` }))}
        />
        {result.captionRisks.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.labelSmall}>Czego unikać w podpisie</Text>
            <BulletList items={result.captionRisks.map((r) => `${r.avoid} — ${r.why}`)} />
          </View>
        )}
        <Divider />

        {/* ── Oś ewolucji ── */}
        <SectionHeading title="Oś ewolucji odbioru w czasie" />
        <SimpleTable
          columns={[
            { key: "window", label: "Okno", width: 0.5 },
            { key: "what", label: "Co może się wydarzyć", width: 2 },
            { key: "react", label: "Jak reagować", width: 1.3 },
            { key: "intensity", label: "Natężenie", width: 0.5 },
          ]}
          rows={result.evolutionTimeline.map((e) => ({ window: `${e.window}\n${e.label}`, what: e.whatMayHappen, react: e.howToReact, intensity: `${e.intensity}` }))}
        />
        <Divider />

        {/* ── Rekomendacja strategiczna ── */}
        <SectionHeading title="Rekomendacja strategiczna" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <View style={{ width: "50%", marginBottom: 6 }}>
            <LabeledText label="Kanał">{result.strategicRecommendation.channel}</LabeledText>
          </View>
          <View style={{ width: "50%", marginBottom: 6 }}>
            <LabeledText label="Podpis">{result.strategicRecommendation.caption}</LabeledText>
          </View>
        </View>
        <LabeledText label="Największy problem wizualny">{result.strategicRecommendation.biggestVisualProblem}</LabeledText>
        <LabeledText label="Największy atut wizualny">{result.strategicRecommendation.biggestVisualAsset}</LabeledText>
        <LabeledText label="Pierwsza odpowiedź na atak">{result.strategicRecommendation.firstCounterAttack}</LabeledText>

        {result.cropRecommendations.length > 0 && (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.labelSmall}>Rekomendacje kadrowania</Text>
            <BulletList items={result.cropRecommendations.map((c) => `${c.description} — ${c.reason}`)} />
          </View>
        )}
        {result.alternativeUseRecommendations.length > 0 && (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.labelSmall}>Alternatywne zastosowania</Text>
            <BulletList items={result.alternativeUseRecommendations.map((a) => `${a.useCase}: ${a.description}`)} />
          </View>
        )}
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
