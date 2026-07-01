"use client";

import { useState } from "react";
import { Globe, Rss, AlertTriangle, CheckCircle, XCircle, ExternalLink } from "lucide-react";

const SOURCES = [
  // Aktywne RSS
  { name: "PAP",          type: "rss",    status: "active",  url: "pap.pl",        country: "🇵🇱", desc: "Polska Agencja Prasowa — newsy krajowe" },
  { name: "TVN24",        type: "rss",    status: "active",  url: "tvn24.pl",      country: "🇵🇱", desc: "Serwis informacyjny TVN24" },
  { name: "RMF24",        type: "rss",    status: "active",  url: "rmf24.pl",      country: "🇵🇱", desc: "RMF FM — radio i informacje" },
  { name: "Onet",         type: "rss",    status: "active",  url: "onet.pl",       country: "🇵🇱", desc: "Największy portal informacyjny" },
  { name: "Wirtualna Polska", type: "rss", status: "active", url: "wp.pl",         country: "🇵🇱", desc: "Serwis WP Wiadomości" },
  { name: "Bankier",      type: "rss",    status: "active",  url: "bankier.pl",    country: "🇵🇱", desc: "Wiadomości gospodarcze i finansowe" },
  // Wyszukiwarka
  { name: "Google News",  type: "search", status: "active",  url: "news.google.com", country: "🌐", desc: "Agregator — przeszukuje całą polską prasę" },
  { name: "Reddit",       type: "search", status: "active",  url: "reddit.com",    country: "🌐", desc: "r/poland, r/europe — opinia społeczności" },
  { name: "Bing News",    type: "search", status: "fallback", url: "bing.com",      country: "🌐", desc: "Fallback gdy Google News niedostępny" },
  // Planowane
  { name: "Wykop.pl",     type: "social", status: "planned", url: "wykop.pl",      country: "🇵🇱", desc: "Polski Reddit — wymaga rejestracji API" },
  { name: "YouTube",      type: "social", status: "planned", url: "youtube.com",   country: "🌐", desc: "Komentarze pod filmami — YouTube Data API v3" },
  { name: "X / Twitter",  type: "social", status: "limited", url: "x.com",         country: "🌐", desc: "API płatne ($100/mies.) — alternatywa: RSS nitter" },
  { name: "Facebook",     type: "social", status: "limited", url: "facebook.com",  country: "🌐", desc: "Meta API wymaga review — alternatywa: RSS strony" },
  { name: "TikTok",       type: "social", status: "planned", url: "tiktok.com",    country: "🌐", desc: "Brak publicznego API — scraping w planie" },
];

const STATUS_CONFIG = {
  active:   { label: "Aktywne",    color: "#16a34a", bg: "rgba(22,163,74,0.08)",  icon: CheckCircle },
  fallback: { label: "Zapasowe",   color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", icon: AlertTriangle },
  planned:  { label: "Planowane",  color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", icon: Globe },
  limited:  { label: "Ograniczone",color: "#f59e0b", bg: "rgba(245,158,11,0.08)", icon: XCircle },
};

const TYPE_LABEL: Record<string, string> = {
  rss: "RSS Feed", search: "Wyszukiwarka", social: "Social media",
};
const TYPE_COLOR: Record<string, string> = {
  rss: "#6366f1", search: "#3b82f6", social: "#ec4899",
};

export default function NetworkPage() {
  const [filter, setFilter] = useState("all");
  const [customFeeds, setCustomFeeds] = useState(function () {
    try { return JSON.parse(localStorage.getItem("ns_custom_rss") || "[]") as string[]; } catch { return [] as string[]; }
  });
  const [newFeed, setNewFeed] = useState("");

  function addFeed() {
    if (!newFeed.trim()) return;
    const updated = [...customFeeds, newFeed.trim()];
    setCustomFeeds(updated);
    try { localStorage.setItem("ns_custom_rss", JSON.stringify(updated)); } catch { /* ignore */ }
    setNewFeed("");
  }

  function removeFeed(idx: number) {
    const updated = customFeeds.filter(function (_, i) { return i !== idx; });
    setCustomFeeds(updated);
    try { localStorage.setItem("ns_custom_rss", JSON.stringify(updated)); } catch { /* ignore */ }
  }

  const filtered = filter === "all" ? SOURCES : SOURCES.filter(function (s) { return s.status === filter; });
  const counts = {
    active: SOURCES.filter(function (s) { return s.status === "active"; }).length,
    limited: SOURCES.filter(function (s) { return s.status === "limited"; }).length,
    planned: SOURCES.filter(function (s) { return s.status === "planned"; }).length,
  };

  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Źródła danych</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
          Mapa źródeł — aktywnych, planowanych i ograniczonych przez zewnętrzne API
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Aktywne źródła", value: counts.active, color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
          { label: "Ograniczone API", value: counts.limited, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
          { label: "W planach",       value: counts.planned, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
        ].map(function (s) {
          return (
            <div key={s.label} style={{ background: s.bg, border: "1px solid " + s.color + "30", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { value: "all",     label: "Wszystkie" },
          { value: "active",  label: "Aktywne" },
          { value: "limited", label: "Ograniczone" },
          { value: "planned", label: "Planowane" },
        ].map(function (f) {
          const active = filter === f.value;
          return (
            <button key={f.value} onClick={function () { setFilter(f.value); }}
              style={{
                padding: "5px 14px", borderRadius: 20, border: active ? "1px solid #6366f1" : "1px solid #e2e8f0",
                background: active ? "rgba(99,102,241,0.1)" : "#fff",
                color: active ? "#4338ca" : "#64748b",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Sources grid */}
      <div style={{ display: "grid", gap: 8, marginBottom: 28 }}>
        {filtered.map(function (src) {
          const cfg = STATUS_CONFIG[src.status as keyof typeof STATUS_CONFIG];
          const StatusIcon = cfg.icon;
          return (
            <div key={src.name} style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <StatusIcon size={17} style={{ color: cfg.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{src.country} {src.name}</span>
                  <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: TYPE_COLOR[src.type] + "18", color: TYPE_COLOR[src.type], fontWeight: 600 }}>
                    {TYPE_LABEL[src.type]}
                  </span>
                  <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>
                    {cfg.label}
                  </span>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{src.desc}</p>
              </div>
              <a href={"https://" + src.url} target="_blank" rel="noopener noreferrer"
                style={{ color: "#94a3b8", flexShrink: 0 }}>
                <ExternalLink size={14} />
              </a>
            </div>
          );
        })}
      </div>

      {/* Custom RSS */}
      <div style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          <Rss size={15} style={{ display: "inline", marginRight: 6, color: "#f97316" }} />
          Własne źródła RSS
        </h3>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>
          Dodaj dowolny feed RSS — konta nitter (X), strony FB, blogi, Telegram via RSS.bridge.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={newFeed} onChange={function (e) { setNewFeed(e.target.value); }}
            onKeyDown={function (e) { if (e.key === "Enter") addFeed(); }}
            placeholder="https://nitter.poast.org/USERNAME/rss"
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none" }} />
          <button onClick={addFeed}
            style={{ padding: "8px 16px", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Dodaj
          </button>
        </div>
        {customFeeds.length === 0 ? (
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Brak własnych źródeł RSS</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {customFeeds.map(function (feed, idx) {
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", borderRadius: 7, padding: "7px 12px" }}>
                  <Rss size={12} style={{ color: "#f97316", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feed}</span>
                  <button onClick={function () { removeFeed(idx); }}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 2, display: "flex" }}>
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 11, color: "#cbd5e1" }}>
          Uwaga: własne feedy RSS są aktualnie przechowywane lokalnie. Integracja z silnikiem wyszukiwania w Fazie 2.
        </p>
      </div>
    </div>
  );
}
