"use client";

import { useState } from "react";
import { Download, FileText, Table, AlertCircle } from "lucide-react";

interface Article {
  id: string; title: string; url: string;
  source: string; publishedAt: string; sentiment: string;
}

interface FeedData {
  articles: Article[];
  total: number;
  sentimentCounts: { positive: number; negative: number; neutral: number };
  entities: Array<{ name: string; count: number }>;
  narratives: Array<{ label: string; count: number; percentage: number }>;
  fetchedAt: string;
  query: string;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob(["﻿" + content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function toCSV(rows: string[][]): string {
  return rows.map(function (row) {
    return row.map(function (cell) {
      const s = String(cell ?? "").replace(/"/g, '""');
      return '"' + s + '"';
    }).join(",");
  }).join("\n");
}

export default function ReportsPage() {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("24h");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null as FeedData | null);
  const [error, setError] = useState("");

  function fetchData() {
    if (!query.trim()) { setError("Wpisz zapytanie"); return; }
    setLoading(true); setError(""); setData(null);
    fetch("/api/news?q=" + encodeURIComponent(query) + "&period=" + period)
      .then(function (r) { return r.json(); })
      .then(function (d) { setData(d as FeedData); setLoading(false); })
      .catch(function () { setError("Błąd pobierania danych"); setLoading(false); });
  }

  function exportArticlesCSV() {
    if (!data) return;
    const rows = [
      ["Tytuł", "Źródło", "Data", "Sentyment", "URL"],
      ...data.articles.map(function (a) {
        return [a.title, a.source, new Date(a.publishedAt).toLocaleString("pl-PL"), a.sentiment, a.url];
      }),
    ];
    downloadBlob(toCSV(rows), "narrativescope_artykuly_" + Date.now() + ".csv", "text/csv;charset=utf-8");
  }

  function exportSummaryCSV() {
    if (!data) return;
    const date = new Date(data.fetchedAt).toLocaleString("pl-PL");
    const rows: string[][] = [
      ["RAPORT NARRACYJNY — NarrativeScope"],
      ["Zapytanie:", data.query || "(monitoring)"],
      ["Data:", date],
      ["Artykuły:", String(data.total)],
      [],
      ["SENTYMENT"],
      ["Pozytywny", String(data.sentimentCounts.positive)],
      ["Negatywny", String(data.sentimentCounts.negative)],
      ["Neutralny", String(data.sentimentCounts.neutral)],
      [],
      ["AKTORZY NARRACJI"],
      ["Aktor", "Liczba wzmianek"],
      ...data.entities.slice(0, 15).map(function (e) { return [e.name, String(e.count)]; }),
      [],
      ["NARRACJE TEMATYCZNE"],
      ["Kategoria", "Artykuły", "Udział %"],
      ...data.narratives.map(function (n) { return [n.label, String(n.count), String(n.percentage) + "%"]; }),
    ];
    downloadBlob(toCSV(rows), "narrativescope_raport_" + Date.now() + ".csv", "text/csv;charset=utf-8");
  }

  function exportJSON() {
    if (!data) return;
    downloadBlob(JSON.stringify(data, null, 2), "narrativescope_data_" + Date.now() + ".json", "application/json");
  }

  return (
    <div style={{ padding: "24px", maxWidth: 800, margin: "0 auto", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Eksport raportów</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
          Pobierz wyniki analizy jako CSV lub JSON do dalszego przetwarzania
        </p>
      </div>

      {/* Query form */}
      <div style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>1. Zdefiniuj zakres analizy</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Zapytanie / temat
            </label>
            <input value={query} onChange={function (e) { setQuery(e.target.value); }}
              placeholder="np. inflacja, Tusk, PKP..."
              onKeyDown={function (e) { if (e.key === "Enter") fetchData(); }}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Okres
            </label>
            <select value={period} onChange={function (e) { setPeriod(e.target.value); }}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", background: "#fff" }}>
              <option value="1h">1 godzina</option>
              <option value="24h">24 godziny</option>
              <option value="7d">7 dni</option>
              <option value="30d">30 dni</option>
            </select>
          </div>
          <button onClick={fetchData} disabled={loading}
            style={{ padding: "8px 18px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {loading ? "⏳ Analizuję…" : "Pobierz dane"}
          </button>
        </div>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, color: "#dc2626", fontSize: 12 }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}
      </div>

      {/* Results preview */}
      {data && (
        <>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
              ✅ Pobrano <strong>{data.total} artykułów</strong> · {data.entities.length} aktorów · {data.narratives.length} narracji
              · Stan na {new Date(data.fetchedAt).toLocaleTimeString("pl-PL")}
            </p>
          </div>

          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>2. Wybierz format eksportu</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              {
                icon: Table, title: "Artykuły CSV",
                desc: "Lista wszystkich artykułów z tytułem, źródłem, datą i sentymentem. Gotowy do otwarcia w Excelu.",
                action: exportArticlesCSV, accent: "#3b82f6",
              },
              {
                icon: FileText, title: "Raport CSV",
                desc: "Zbiorczy raport: sentyment, aktorzy, narracje. Format tabelaryczny do prezentacji.",
                action: exportSummaryCSV, accent: "#8b5cf6",
              },
              {
                icon: Download, title: "Dane JSON",
                desc: "Pełne dane surowe — do dalszej obróbki, integracji z innymi narzędziami lub archiwizacji.",
                action: exportJSON, accent: "#0ea5e9",
              },
            ].map(function (item) {
              return (
                <button
                  key={item.title}
                  onClick={item.action}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    gap: 8, padding: 16,
                    background: "#fff", border: "1px solid #e8edf2",
                    borderRadius: 10, cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={function (e) {
                    (e.currentTarget as HTMLElement).style.borderColor = item.accent;
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px " + item.accent + "18";
                  }}
                  onMouseLeave={function (e) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#e8edf2";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: item.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <item.icon size={18} style={{ color: item.accent }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: item.accent, fontWeight: 600, marginTop: 4 }}>
                    <Download size={11} /> Pobierz
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Info */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
          Pliki CSV otwierane są bezpośrednio w Microsoft Excel lub Google Sheets (kodowanie UTF-8 z BOM).
          Format JSON może być przetwarzany przez Python, R lub inne narzędzia analityczne.
          Planowane: eksport PDF z wykresami (Faza 3).
        </p>
      </div>
    </div>
  );
}
