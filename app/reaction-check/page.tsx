"use client";

import { useState } from "react";
import type { SimulationInput } from "@/lib/reaction-simulator/types";
import type { Article, FeedData } from "@/lib/dashboard-types";
import type { RealVerdict } from "@/lib/reaction-check";
import { InputPanel } from "@/components/reaction-lab/InputPanel";
import { BriefingHero } from "@/components/dashboard/BriefingHero";
import {
  Panel, DonutChart, TimelineBar, ColumnChart, NarrativeBar, EntityRow, ArticleCard,
  CrossPlatformPanel, SENT_COLOR, SENT_LABEL, useIsMobile,
} from "@/components/dashboard/RealDataPanels";
import { computeSentimentTimeline, narrativesForEntity } from "@/lib/dashboard-briefing";

// ── "Reakcja na przekaz/fakt" ──────────────────────────────────────────
// Post factum, nie symulacja: te same pola wejściowe co Symulator reakcji
// (components/reaction-lab/InputPanel.tsx, reużyty 1:1 — Jan 2026-07-07:
// "te same możliwości"), ale zamiast AI zgadującego reakcję, ten moduł
// odpala prawdziwe wyszukiwanie (app/api/reaction-check/route.ts →
// buildFeed) i pokazuje, co REALNIE się znalazło. Świadomie BEZ trybu
// "wydarzenie planowane" (excludeModes) — to zdarzenie przyszłe, nie ma
// tu jeszcze niczego realnego do sprawdzenia; to zadanie Symulatora.
//
// Kluczowa różnica względem starego app/dashboard/page.tsx: żadnego
// wyszukiwania "na ślepo" przy wejściu — ekran wyników pojawia się
// dopiero po świadomym submicie z InputPanel (Jan 2026-07-07).

interface ReactionCheckResult {
  checkedText: string;
  extractedPhrases: string[];
  linkedArticle: Article | null;
  feed: FeedData;
  realVerdict: RealVerdict;
}

export default function ReactionCheckPage() {
  const isMobile = useIsMobile();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReactionCheckResult | null>(null);
  const [selNarr, setSelNarr] = useState("");
  const [selEntity, setSelEntity] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  async function runCheck(input: SimulationInput) {
    setRunning(true);
    setError(null);
    setResult(null);
    setSelNarr("");
    setSelEntity("");
    try {
      const res = await fetch("/api/reaction-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Nie udało się sprawdzić realnej reakcji.");
        return;
      }
      setResult(j as ReactionCheckResult);
    } catch {
      setError("Błąd sieci — spróbuj ponownie.");
    } finally {
      setRunning(false);
    }
  }

  async function generateReport() {
    if (!result) return;
    setReportBusy(true);
    setReportError(null);
    try {
      const res = await fetch("/api/dashboard/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: result.feed,
          query: result.extractedPhrases.join(" + "),
          period: "30 dni",
          mode: "Reakcja na przekaz/fakt",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Nie udało się wygenerować raportu PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "raport-reakcja-na-przekaz.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Nie udało się wygenerować raportu PDF.");
    } finally {
      setReportBusy(false);
    }
  }

  const feed = result?.feed;
  const visibleArticles = (function () {
    if (!feed) return [];
    if (selNarr) {
      const cluster = feed.narratives.find((n) => n.label === selNarr);
      if (cluster) {
        const urls = new Set(cluster.topArticles.map((a) => a.url));
        return feed.articles.filter((a) => urls.has(a.url));
      }
    }
    return feed.articles;
  })();
  const maxEntityCount = feed && feed.entities.length > 0 ? feed.entities[0].count : 1;
  const col2 = isMobile ? "1fr" : "1fr 1fr";
  const col3 = isMobile ? "1fr" : "170px 1fr";
  const col4 = isMobile ? "1fr" : "260px 1fr";

  return (
    <div style={{ padding: "18px 24px 40px", minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif", color: "#e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <div>
          <div className="pdm-kicker">Political Dark Matter · Narrative Scope</div>
          <h1 className="pdm-hero-title" style={{ fontSize: 28, lineHeight: 1.1 }}>Reakcja na przekaz/fakt</h1>
        </div>
        <div className="pdm-live-pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20 }}>
          <span className="pdm-live-dot" />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#86efac" }}>REALNE DANE, NIE SYMULACJA</span>
        </div>
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#64748b", maxWidth: 760 }}>
        Sprawdź, co REALNIE działo się w sieci wokół wypowiedzi, wątku albo zdarzenia, które już zaszło — nie przewidujemy reakcji, tylko szukamy jej w prawdziwych mediach i mediach społecznościowych. Tryb „Wydarzenie planowane” nie ma tu zastosowania (nic jeszcze się nie wydarzyło) — do tego służy Symulator reakcji.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <InputPanel
          onSubmit={runCheck}
          running={running}
          excludeModes={["wydarzenie_planowane"]}
          submitLabel="Sprawdź realną reakcję"
          runningLabel="Sprawdzam…"
        />

        {running && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", color: "#7dd3fc", fontSize: 12.5 }}>
            🔎 Wyciągam frazy do wyszukania i przeszukuję realne media…
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 12.5 }}>
            ⚠ {error}
          </div>
        )}

        {result && feed && (
          <>
            <Panel title="Kontekst sprawdzenia" subtitle="Na podstawie tych fraz przeszukano realne media">
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5 }}>
                „{result.checkedText.slice(0, 240)}{result.checkedText.length > 240 ? "…" : ""}”
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.extractedPhrases.map((ph) => (
                  <span key={ph} style={{ fontSize: 11, fontWeight: 600, color: "#7dd3fc", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, padding: "3px 9px" }}>
                    {ph}
                  </span>
                ))}
              </div>
            </Panel>

            <div
              style={{
                padding: "10px 14px", borderRadius: 8,
                background: result.realVerdict.hasSignal ? "rgba(74,222,128,0.06)" : "rgba(251,191,36,0.06)",
                border: `1px solid ${result.realVerdict.hasSignal ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}`,
                color: result.realVerdict.hasSignal ? "#86efac" : "#fde68a",
                fontSize: 12.5, lineHeight: 1.5,
              }}
            >
              {result.realVerdict.hasSignal ? "✅" : "ℹ️"} {result.realVerdict.note}
              {result.realVerdict.crossPlatformCount > 0 && (
                <span style={{ marginLeft: 6, color: "#c4b5fd" }}>
                  · {result.realVerdict.crossPlatformCount} temat(ów) potwierdzonych na kilku platformach naraz
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <button
                onClick={generateReport}
                disabled={reportBusy}
                className="pdm-btn-square"
                style={{ padding: "7px 16px", borderRadius: 8, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#7dd3fc", fontSize: 12, fontWeight: 700, cursor: reportBusy ? "wait" : "pointer", whiteSpace: "nowrap" }}
              >
                {reportBusy ? "Generuję raport…" : "📄 Generuj raport PDF"}
              </button>
            </div>
            {reportError && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 12 }}>
                ⚠ {reportError}
              </div>
            )}

            {result.linkedArticle && <ArticleCard article={result.linkedArticle} />}

            <BriefingHero data={feed} />

            {feed.total === 0 ? (
              <Panel title="Materiały" subtitle="0 wyników">
                <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  Brak realnych materiałów dla tych fraz w wybranym oknie czasowym (30 dni).
                </div>
              </Panel>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: col3, gap: 12 }}>
                  <Panel title="Sentyment" subtitle={feed.total + " wyników"}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <DonutChart pos={feed.sentimentCounts.positive} neg={feed.sentimentCounts.negative} neu={feed.sentimentCounts.neutral} />
                      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5 }}>
                        {(["positive", "negative", "neutral"] as const).map((s) => {
                          const tot = feed.sentimentCounts.positive + feed.sentimentCounts.negative + feed.sentimentCounts.neutral || 1;
                          const pctS = Math.round((feed.sentimentCounts[s] / tot) * 100);
                          return (
                            <div key={s} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: SENT_COLOR[s], flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: "#94a3b8", flex: 1 }}>{SENT_LABEL[s]}</span>
                                <span style={{ fontSize: 10.5, color: "#64748b" }}>{pctS}%</span>
                                <span style={{ fontSize: 12, color: SENT_COLOR[s], fontWeight: 700, minWidth: 22, textAlign: "right" }}>{feed.sentimentCounts[s]}</span>
                              </div>
                              <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: pctS + "%", background: SENT_COLOR[s] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Panel>
                  <Panel title="Oś czasu" subtitle="Wolumen i skład sentymentu wg godziny publikacji">
                    <TimelineBar
                      data={feed.timeline}
                      sentimentByHour={new Map(computeSentimentTimeline(feed.articles).map((pt) => [pt.hour, { positive: pt.positive, negative: pt.negative, neutral: pt.neutral }] as const))}
                    />
                  </Panel>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: col2, gap: 12 }}>
                  <Panel
                    title="Dominujące narracje"
                    subtitle={selNarr ? "Filtr: " + selNarr + " — kliknij ponownie by wyczyścić" : "Kliknij narrację by filtrować materiały"}
                  >
                    {feed.narratives.length > 0 ? (
                      feed.narratives.map((cluster) => (
                        <NarrativeBar
                          key={cluster.label}
                          cluster={cluster}
                          selected={selNarr === cluster.label}
                          onClick={() => { setSelNarr((prev) => (prev === cluster.label ? "" : cluster.label)); setSelEntity(""); }}
                        />
                      ))
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: 12, padding: "14px 0" }}>Brak sklasyfikowanych narracji.</div>
                    )}
                  </Panel>
                  <Panel title="Aktorzy" subtitle={selEntity ? "Wybrano: " + selEntity : "Kto pojawia się w materiałach"}>
                    {feed.entities.length > 0 ? (
                      <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
                        {feed.entities.map((entity) => (
                          <EntityRow
                            key={entity.name}
                            entity={entity}
                            maxCount={maxEntityCount}
                            selected={selEntity === entity.name}
                            onClick={() => setSelEntity((prev) => (prev === entity.name ? "" : entity.name))}
                            narrativeTags={narrativesForEntity(entity.name, feed.narratives)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: 12, padding: "14px 0" }}>Brak rozpoznanych aktorów (min. 2 wzmianki).</div>
                    )}
                  </Panel>
                </div>

                <CrossPlatformPanel signals={feed.crossPlatformSignals} />

                <div style={{ display: "grid", gridTemplateColumns: col4, gap: 12, marginBottom: 20 }}>
                  <Panel title="Aktywność źródeł" subtitle={"Pobrane materiały" + (feed.totalWeightedReach ? " · ważony zasięg: " + feed.totalWeightedReach : "")}>
                    <ColumnChart data={feed.bySource} />
                  </Panel>
                  <Panel title={selNarr ? "Materiały — " + selNarr : "Materiały"} subtitle={visibleArticles.length + " wyników"}>
                    {visibleArticles.length === 0 ? (
                      <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Brak materiałów dla tych kryteriów.</div>
                    ) : (
                      <div style={{ maxHeight: 440, overflowY: "auto", paddingRight: 2 }}>
                        {visibleArticles.map((article) => <ArticleCard key={article.id} article={article} />)}
                      </div>
                    )}
                  </Panel>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
