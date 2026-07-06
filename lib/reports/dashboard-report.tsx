import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import type { FeedData, Sent } from "@/lib/dashboard-types";
import { buildBriefingSummary, computeMomentum, dominantSentiment } from "@/lib/dashboard-briefing";
import {
  Divider, MeterBar, ReportFooter, ReportHeader, SectionHeading, SimpleTable, colors, formatDate, styles,
} from "./pdf-theme";

// ── Raport PDF — Dashboard / bryfing sytuacyjny Narrative Scope ──────
// Serwer NIE liczy niczego od nowa poza tym, co i tak liczy klient
// deterministycznie z lib/dashboard-briefing.ts (buildBriefingSummary,
// computeMomentum, dominantSentiment) — więc raport jest zawsze 1:1
// spójny z tym, co widać na ekranie dashboardu w chwili kliknięcia
// "Generuj raport". Zero wywołań AI, zero nowych danych.

const SENT_LABEL: Record<Sent, string> = { positive: "Pozytywny", negative: "Negatywny", neutral: "Neutralny" };
const SENT_COLOR: Record<Sent, string> = { positive: colors.safe, negative: colors.danger, neutral: colors.muted };

export interface DashboardReportMeta {
  query: string; // np. "Tusk + inflacja" albo "" jeśli podgląd domyślny
  period: string;
  mode: string;
}

export function buildDashboardReportDocument(data: FeedData, meta: DashboardReportMeta): React.ReactElement {
  const summary = buildBriefingSummary(data);
  const { sentiment, pct } = dominantSentiment(data.sentimentCounts);
  const momentum = computeMomentum(data.entities, data.narratives, 8);
  const sourceCount = Object.keys(data.bySource || {}).length;
  const total = data.sentimentCounts.positive + data.sentimentCounts.negative + data.sentimentCounts.neutral;

  const ARTICLE_LIMIT = 60;
  const sortedArticles = [...(data.articles || [])].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const shownArticles = sortedArticles.slice(0, ARTICLE_LIMIT);

  return (
    <Document title="Raport — Narrative Scope, bryfing sytuacyjny" author="Political Dark Matter · Narrative Scope">
      <Page size="A4" style={styles.page} wrap>
        <ReportHeader kicker="Political Dark Matter · Narrative Scope" title="Bryfing sytuacyjny — raport" meta={`Wygenerowano: ${formatDate(new Date().toISOString())}`} />
        <ReportFooter />

        {/* ── Zakres zapytania ── */}
        <View style={styles.panel}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <View style={{ width: "40%" }}>
              <Text style={styles.labelSmall}>Zapytanie</Text>
              <Text style={styles.bodyText}>{meta.query || "podgląd ogólny — bez filtra"}</Text>
            </View>
            <View style={{ width: "30%" }}>
              <Text style={styles.labelSmall}>Okres</Text>
              <Text style={styles.bodyText}>{meta.period}</Text>
            </View>
            <View style={{ width: "30%" }}>
              <Text style={styles.labelSmall}>Tryb</Text>
              <Text style={styles.bodyText}>{meta.mode}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 7, color: colors.faint, marginTop: 6 }}>
            Dane pobrane: {formatDate(data.fetchedAt)} · {data.searchMode === "google_news" ? "źródło: Google News" : "źródło: agregacja własna"}
          </Text>
        </View>

        {/* ── Bryfing sytuacyjny ── */}
        <SectionHeading title="Bryfing sytuacyjny" />
        <Text style={{ fontSize: 11, color: colors.ink, lineHeight: 1.55, marginBottom: 12 }}>{summary}</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
          <View style={{ width: "25%", marginBottom: 8 }}>
            <Text style={styles.labelSmall}>Materiały</Text>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.ink }}>{data.total}</Text>
            <Text style={{ fontSize: 7.5, color: colors.faint }}>z {data.totalAvailable} dostępnych</Text>
          </View>
          <View style={{ width: "25%", marginBottom: 8 }}>
            <Text style={styles.labelSmall}>Ważony zasięg</Text>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.ink }}>{data.totalWeightedReach ? data.totalWeightedReach.toFixed(0) : "—"}</Text>
            <Text style={{ fontSize: 7.5, color: colors.faint }}>suma wag artykułów</Text>
          </View>
          <View style={{ width: "25%", marginBottom: 8 }}>
            <Text style={styles.labelSmall}>Dominujący sentyment</Text>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: SENT_COLOR[sentiment] }}>{pct}%</Text>
            <Text style={{ fontSize: 7.5, color: colors.faint }}>{SENT_LABEL[sentiment]}</Text>
          </View>
          <View style={{ width: "25%", marginBottom: 8 }}>
            <Text style={styles.labelSmall}>Aktywne źródła</Text>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.ink }}>{sourceCount}</Text>
            <Text style={{ fontSize: 7.5, color: colors.faint }}>{data.narratives?.length ?? 0} narracji · {data.entities?.length ?? 0} aktorów</Text>
          </View>
        </View>

        {momentum.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.labelSmall}>Co przyspiesza</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 3 }}>
              {momentum.map((m, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginRight: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "bold", color: m.velocity > 0 ? colors.danger : colors.safe }}>
                    {m.velocity > 0 ? "↑" : "↓"} {m.label} ({m.type}, {m.count}×)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <Divider />

        {/* ── Sentyment ── */}
        <SectionHeading title="Rozkład sentymentu" />
        <MeterBar label={`Pozytywny (${data.sentimentCounts.positive})`} value={total ? Math.round((data.sentimentCounts.positive / total) * 100) : 0} invert />
        <MeterBar label={`Negatywny (${data.sentimentCounts.negative})`} value={total ? Math.round((data.sentimentCounts.negative / total) * 100) : 0} />
        <MeterBar label={`Neutralny (${data.sentimentCounts.neutral})`} value={total ? Math.round((data.sentimentCounts.neutral / total) * 100) : 0} invert />
        <Divider />

        {/* ── Narracje ── */}
        <SectionHeading title="Dominujące narracje" />
        <SimpleTable
          columns={[
            { key: "label", label: "Narracja", width: 1.4 },
            { key: "count", label: "Liczba (%)", width: 0.8 },
            { key: "sent", label: "Sentyment", width: 0.9 },
            { key: "vel", label: "Trend", width: 0.7 },
          ]}
          rows={(data.narratives || []).map((n) => ({
            label: `${n.icon} ${n.label}`,
            count: `${n.count} (${n.percentage}%)`,
            sent: SENT_LABEL[n.dominantSentiment],
            vel: n.velocity != null && n.velocity !== 0 ? (n.velocity > 0 ? `+${n.velocity}%` : `${n.velocity}%`) : "→ 0%",
          }))}
        />
        <Divider />

        {/* ── Aktorzy ── */}
        <SectionHeading title="Aktorzy narracji" />
        <SimpleTable
          columns={[
            { key: "name", label: "Aktor", width: 1.2 },
            { key: "count", label: "Wzmianki", width: 0.7 },
            { key: "sent", label: "Sentyment", width: 0.9 },
            { key: "vel", label: "Trend", width: 0.7 },
          ]}
          rows={(data.entities || []).map((e) => ({
            name: e.name,
            count: `${e.count}×`,
            sent: SENT_LABEL[e.dominantSentiment],
            vel: e.velocity != null && e.velocity !== 0 ? (e.velocity > 0 ? `+${e.velocity}%` : `${e.velocity}%`) : "→ 0%",
          }))}
        />
        <Divider />

        {/* ── Lista materiałów ── */}
        <SectionHeading
          title="Materiały źródłowe"
          subtitle={data.articles.length > ARTICLE_LIMIT ? `Pokazano ${ARTICLE_LIMIT} z ${data.articles.length}, posortowane wg wagi zasięgu` : `Wszystkie ${data.articles.length} materiałów`}
        />
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.panelAlt, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 2.4, fontSize: 7.5, fontWeight: "bold", color: colors.muted, padding: 5, textTransform: "uppercase" }}>Tytuł</Text>
            <Text style={{ flex: 0.9, fontSize: 7.5, fontWeight: "bold", color: colors.muted, padding: 5, textTransform: "uppercase" }}>Źródło</Text>
            <Text style={{ flex: 0.6, fontSize: 7.5, fontWeight: "bold", color: colors.muted, padding: 5, textTransform: "uppercase" }}>Sentyment</Text>
            <Text style={{ flex: 0.4, fontSize: 7.5, fontWeight: "bold", color: colors.muted, padding: 5, textTransform: "uppercase" }}>Waga</Text>
          </View>
          {shownArticles.map((a, i) => (
            <View key={a.id ?? i} style={{ flexDirection: "row", borderBottomWidth: i === shownArticles.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 2.4, padding: 5 }}>
                <Link src={a.url} style={{ fontSize: 8, color: colors.sky, textDecoration: "none" }}>{a.title}</Link>
              </View>
              <Text style={{ flex: 0.9, fontSize: 8, color: colors.body, padding: 5 }}>{a.source}</Text>
              <Text style={{ flex: 0.6, fontSize: 8, color: SENT_COLOR[a.sentiment], padding: 5, fontWeight: "bold" }}>{SENT_LABEL[a.sentiment]}</Text>
              <Text style={{ flex: 0.4, fontSize: 8, color: colors.body, padding: 5 }}>{a.weight != null ? a.weight.toFixed(0) : "—"}</Text>
            </View>
          ))}
        </View>

        {data.rssNote && (
          <Text style={{ fontSize: 7, color: colors.faint, marginTop: 8 }}>{data.rssNote}</Text>
        )}
      </Page>
    </Document>
  );
}
