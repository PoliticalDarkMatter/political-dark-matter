"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

interface TrendItem {
  topic: string;
  count: number;
  velocity: number; // % change vs prev snapshot
  sentiment: "positive" | "negative" | "neutral";
}

const HOT_TOPICS = [
  "inflacja", "wybory", "NATO", "Ukraina", "Tusk", "klimat",
  "gospodarka", "bezpieczeństwo", "zdrowie", "energia",
];

const SENT_COLOR: Record<string, string> = { positive: "#16a34a", negative: "#dc2626", neutral: "#64748b" };

function VelocityBadge(p: { velocity: number }) {
  const v = p.velocity;
  if (Math.abs(v) < 5) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#64748b", background: "#f1f5f9", borderRadius: 5, padding: "2px 7px" }}>
        <Minus size={11} /> stabilny
      </span>
    );
  }
  const up = v > 0;
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700,
      color: up ? "#16a34a" : "#dc2626",
      background: up ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
      borderRadius: 5, padding: "2px 7px",
    }}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? "+" : ""}{v.toFixed(0)}%
    </span>
  );
}

export default function TrendsPage() {
  const [trends, setTrends] = useState([] as TrendItem[]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null as string | null);
  const [prev, setPrev] = useState({} as Record<string, number>);

  const fetchTrends = useCallback(function () {
    setLoading(true);
    // Pobierz kilka tematów równolegle i policz artykuły
    Promise.allSettled(
      HOT_TOPICS.map(function (topic) {
        return fetch("/api/news?q=" + encodeURIComponent(topic) + "&period=24h")
          .then(function (r) { return r.json(); })
          .then(function (d) { return { topic, count: d.total as number, sentiment: d.sentimentCounts as { positive: number; negative: number; neutral: number } }; });
      })
    ).then(function (results) {
      const items: TrendItem[] = results
        .map(function (r, i) {
          if (r.status !== "fulfilled") return null;
          const d = r.value;
          const prevCount = prev[d.topic] || d.count;
          const velocity = prevCount === 0 ? 0 : ((d.count - prevCount) / prevCount) * 100;
          const sc = d.sentiment;
          let dom: "positive" | "negative" | "neutral" = "neutral";
          if (sc.positive > sc.negative && sc.positive > sc.neutral) dom = "positive";
          else if (sc.negative > sc.positive && sc.negative > sc.neutral) dom = "negative";
          return { topic: d.topic, count: d.count, velocity: Math.round(velocity), sentiment: dom };
        })
        .filter(function (x) { return x !== null; }) as TrendItem[];

      // Zapisz poprzednie wartości
      const newPrev: Record<string, number> = {};
      items.forEach(function (item) { newPrev[item.topic] = item.count; });
      setPrev(newPrev);
      setTrends(items.sort(function (a, b) { return b.count - a.count; }));
      setLastUpdate(new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }));
      setLoading(false);
    });
  }, [prev]);

  useEffect(function () { fetchTrends(); }, []);

  const maxCount = trends.length > 0 ? Math.max(...trends.map(function (t) { return t.count; }), 1) : 1;

  return (
    <div style={{ padding: "24px", maxWidth: 800, margin: "0 auto", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Trendy tematyczne</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
            Aktywność kluczowych tematów w ostatnich 24h
            {lastUpdate && <span style={{ color: "#94a3b8", marginLeft: 8 }}>· aktualizacja {lastUpdate}</span>}
          </p>
        </div>
        <button onClick={fetchTrends} disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff",
            color: "#64748b", fontSize: 12, cursor: "pointer",
          }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Pobieranie…" : "Odśwież"}
        </button>
      </div>

      {loading && trends.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>
          <p style={{ fontSize: 13, margin: 0 }}>Analizuję trendy z polskich mediów…</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {trends.map(function (item, idx) {
            const pct = Math.round((item.count / maxCount) * 100);
            const color = SENT_COLOR[item.sentiment];
            return (
              <div key={item.topic} style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", width: 20 }}>#{idx + 1}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{item.topic}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <VelocityBadge velocity={item.velocity} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: color }}>{item.count}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>art.</span>
                  </div>
                </div>
                <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <div style={{ marginTop: 24, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          <strong>Velocity</strong> — procentowa zmiana liczby wzmianek względem poprzedniego odczytu. Odśwież kilkakrotnie by zobaczyć dynamikę.
          Kolor paska = dominujący sentyment: <span style={{ color: "#16a34a" }}>zielony=pozytywny</span>, <span style={{ color: "#dc2626" }}>czerwony=negatywny</span>, <span style={{ color: "#64748b" }}>szary=neutralny</span>.
        </p>
      </div>
    </div>
  );
}
