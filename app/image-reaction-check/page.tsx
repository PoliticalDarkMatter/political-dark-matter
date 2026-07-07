"use client";

import { useState } from "react";
import type { Article, FeedData } from "@/lib/dashboard-types";
import type { RealVerdict } from "@/lib/reaction-check";
import type { ImageKeywordAnalysis } from "@/lib/image-reaction-check";
import { InputPanel, type ImageCheckPayload } from "@/components/image-reaction-check/InputPanel";
import { BriefingHero } from "@/components/dashboard/BriefingHero";
import {
  Panel, DonutChart, TimelineBar, ColumnChart, NarrativeBar, EntityRow, ArticleCard,
  CrossPlatformPanel, SENT_COLOR, SENT_LABEL, useIsMobile,
} from "@/components/dashboard/RealDataPanels";
import { computeSentimentTimeline, narrativesForEntity } from "@/lib/dashboard-briefing";

// ── "Reakcja na zdjęcie/mem" ───────────────────────────────────────────
// Nowy moduł (nie istniał przed 2026-07-07) — odpowiednik "Reakcji na
// przekaz/fakt" dla obrazu: sprawdza REALNĄ reakcję na zdjęcie/mem, który
// już krąży w sieci (w przeciwieństwie do Symulatora zdjęć, który
// przewiduje reakcję na coś jeszcze niepublikowanego). Pipeline:
// Gemini Vision opisuje zdjęcie i proponuje frazy → prawdziwe wyszukiwanie
// (buildFeed) → te same panele prezentacyjne co Reakcja na przekaz/fakt
// (components/dashboard/RealDataPanels.tsx), żeby oba moduły "Reakcja
// na..." wyglądały i działały spójnie.

interface ImageReactionCheckResult {
  imageAnalysis: ImageKeywordAnalysis;
  extractedKeywords: string[];
  linkedArticle: Article | null;
  feed: FeedData;
  realVerdict: RealVerdict;
}

export default function ImageReactionCheckPage() {
  const isMobile = useIsMobile();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ImageReactionCheckResult | null>(null);
  const [selNarr, setSelNarr] = useState("");
  const [selEntity, setSelEntity] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  async function runCheck(payload: ImageCheckPayload) {
    setRunning(true);
    setError(null);
    setResult(null);
    setSelNarr("");
    setSelEntity("");
    setPreviewUrl(payload.prepared.previewUrl);
    try {
      const res = await fetch("/api/image-reaction-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: payload.prepared.analysisBase64,
          mimeType: payload.prepared.mimeType,
          who: payload.who,
          context: payload.context,
          sourceUrl: payload.sourceUrl,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Nie udało się sprawdzić realnej reakcji.");
        return;
      }
      setResult(j as ImageReactionCheckResult);
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
          query: result.extractedKeywords.join(" + "),
          period: "30 dni",
          mode: "Reakcja na zdjęcie/mem",
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
      a.download = "raport-reakcja-na-zdjecie.pdf";
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
          <h1 className="pdm-hero-title" style={{ fontSize: 28, lineHeight: 1.1 }}>Reakcja na zdjęcie/mem</h1>
        </div>
        <div className="pdm-live-pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20 }}>
          <span className="pdm-live-dot" />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#86efac" }}>REALNE DANE, NIE SYMULACJA</span>
        </div>
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#64748b", maxWidth: 760 }}>
        Sprawdź, co REALNIE dzieje się wokół zdjęcia/mema, który już krąży w sieci. Nie jest to wyszukiwanie obrazem po pikselach (nie ma do tego darmowego, zgodnego z ToS API) — model opisuje zdjęcie i proponuje frazy tekstowe, a wyszukiwanie działa na tych frazach w prawdziwych mediach. Symulator zdjęć (osobny moduł) służy do przewidywania reakcji na coś, co jeszcze NIE zostało opublikowane.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <InputPanel onSubmit={runCheck} running={running} />

        {running && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", color: "#7dd3fc", fontSize: 12.5 }}>
            🔎 Analizuję zdjęcie i przeszukuję realne media…
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 12.5 }}>
            ⚠ {error}
          </div>
        )}

        {result && feed && (
          <>
            <Panel title="Co rozpoznano na zdjęciu" subtitle="Opis i frazy wygenerowane przez Gemini Vision — na ich podstawie przeszukano media">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Sprawdzane zdjęcie" style={{ width: 160, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)", objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 220 }}>
                  {result.imageAnalysis.isReal ? (
                    <>
                      <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                        {result.imageAnalysis.description || "Model nie zwrócił opisu."}
                      </p>
                      {result.imageAnalysis.visibleText && (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8" }}>
                          Tekst widoczny na zdjęciu: „{result.imageAnalysis.visibleText}”
                        </p>
                      )}
                      {result.imageAnalysis.detectedEntities.length > 0 && (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8" }}>
                          Rozpoznane: {result.imageAnalysis.detectedEntities.join(", ")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#fde68a" }}>
                      Analiza wizji niedostępna (brak klucza Gemini albo błąd modelu) — wyszukiwanie oparto wyłącznie o pola „Kogo/czego dotyczy” i „Kontekst” podane ręcznie.
                    </p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {result.extractedKeywords.map((kw) => (
                      <span key={kw} style={{ fontSize: 11, fontWeight: 600, color: "#7dd3fc", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, padding: "3px 9px" }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
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
