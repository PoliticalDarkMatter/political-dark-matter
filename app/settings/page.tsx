"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings, Globe, Newspaper, Database, Rss, Plus, Trash2,
  ExternalLink, CheckCircle2, AlertCircle, Eye, EyeOff,
  Save, ChevronDown, ChevronUp, Zap, Flag, Copy, Check,
} from "lucide-react";
import { clsx } from "clsx";
import { DEFAULT_SOURCES, DEFAULT_RSS_FEEDS, type DataSource, type SourceCategory, type RssFeed } from "@/lib/sources";

const STORAGE_KEY = "ns_settings_v1";

interface SourceState extends DataSource { keyValue?: string; secondaryKeyValue?: string; }

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  free:         { label: "Darmowy",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  free_limited: { label: "Darmowy (limit)", cls: "bg-amber-50  text-amber-700  border-amber-200"  },
  paid:         { label: "Płatny",           cls: "bg-rose-50   text-rose-600   border-rose-200"   },
  open:         { label: "Open Data",        cls: "bg-blue-50   text-blue-700   border-blue-200"   },
};

const CATEGORY_META: Record<SourceCategory, { icon: React.ElementType; label: string; accent?: string }> = {
  polish: { icon: Flag,      label: "🇵🇱 Polskie media (priorytet)", accent: "text-red-500" },
  social: { icon: Globe,     label: "Media społecznościowe" },
  news:   { icon: Newspaper, label: "Zagraniczne portale" },
  open:   { icon: Database,  label: "Otwarte dane (bez klucza)" },
  rss:    { icon: Rss,       label: "Własne kanały RSS" },
};

const RSS_CAT_LABELS: Record<string, string> = {
  polska: "Wiadomości", polityka: "Polityka", biznes: "Biznes", tech: "Tech", inne: "Inne",
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ height: "22px" }}
      className={clsx("relative w-10 rounded-full transition-colors shrink-0", value ? "bg-brand-500" : "bg-slate-300")}>
      <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", value ? "left-5" : "left-0.5")} />
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 text-slate-400 hover:text-brand-500 transition-colors">
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  );
}

function SourceCard({ source, onChange }: { source: SourceState; onChange: (u: Partial<SourceState>) => void }) {
  const [expanded, setExpanded] = useState(source.enabled && source.requiresKey && !source.keyValue);
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const badge = STATUS_BADGE[source.status];

  return (
    <div className={clsx("rounded-xl border transition-all",
      source.enabled ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-200 opacity-60")}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Toggle value={source.enabled} onChange={v => onChange({ enabled: v })} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800">{source.name}</span>
            <span className={clsx("text-[10px] font-medium px-1.5 py-0.5 rounded border", badge.cls)}>{badge.label}</span>
            {source.freeQuota && <span className="text-[10px] text-slate-400">{source.freeQuota}</span>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{source.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {source.requiresKey && source.enabled && !source.keyValue && <AlertCircle size={14} className="text-amber-500" />}
          <a href={source.registerUrl} target="_blank" rel="noopener noreferrer"
            className="text-slate-400 hover:text-brand-500 transition-colors"><ExternalLink size={13} /></a>
          <button onClick={() => setExpanded(e => !e)}
            className="text-slate-400 hover:text-slate-700 transition-colors">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Endpoint URL (compact) */}
      {source.apiEndpoint && !expanded && (
        <div className="mx-4 mb-3 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
          <span className="text-[10px] text-slate-400 shrink-0">endpoint</span>
          <span className="text-[10px] text-slate-500 font-mono truncate flex-1">{source.apiEndpoint}</span>
          <CopyButton text={source.apiEndpoint} />
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {source.apiEndpoint && (
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Endpoint URL</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-[10px] text-slate-600 font-mono truncate flex-1">{source.apiEndpoint}</span>
                <CopyButton text={source.apiEndpoint} />
              </div>
            </div>
          )}

          {source.requiresKey && (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">{source.keyLabel ?? "API Key"}</label>
                <div className="relative">
                  <input type={showKey ? "text" : "password"}
                    value={source.keyValue ?? (source.defaultKeyValue ?? "")}
                    onChange={e => onChange({ keyValue: e.target.value })}
                    placeholder={source.keyPlaceholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all pr-8" />
                  <button type="button" onClick={() => setShowKey(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {source.defaultKeyValue && !source.keyValue && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    ✓ Klucz testowy &quot;{source.defaultKeyValue}&quot; wpisany automatycznie — działa od razu
                  </p>
                )}
              </div>

              {source.secondaryKey && (
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">{source.secondaryKeyLabel}</label>
                  <div className="relative">
                    <input type={showSecret ? "text" : "password"}
                      value={source.secondaryKeyValue ?? ""}
                      onChange={e => onChange({ secondaryKeyValue: e.target.value })}
                      placeholder={source.secondaryKeyPlaceholder}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all pr-8" />
                    <button type="button" onClick={() => setShowSecret(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <a href={source.docsUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-brand-500 flex items-center gap-1 transition-colors">
            <ExternalLink size={11} /> Dokumentacja API
          </a>
        </div>
      )}
    </div>
  );
}

function RssFeedRow({ feed, onToggle, onRemove }: { feed: RssFeed; onToggle: () => void; onRemove: () => void }) {
  return (
    <div className={clsx("flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-all",
      feed.enabled ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-200 opacity-50")}>
      <Toggle value={feed.enabled} onChange={onToggle} />
      <Rss size={12} className={feed.enabled ? "text-emerald-500 shrink-0" : "text-slate-400 shrink-0"} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-slate-700">{feed.name}</span>
        <p className="text-[10px] text-slate-400 truncate font-mono">{feed.url}</p>
      </div>
      <CopyButton text={feed.url} />
      <span className="text-[10px] text-slate-400 hidden sm:block shrink-0">{RSS_CAT_LABELS[feed.category]}</span>
      <button onClick={onRemove} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function initSources(): SourceState[] {
  if (typeof window === "undefined") return DEFAULT_SOURCES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SOURCES;
    const parsed = JSON.parse(saved);
    return DEFAULT_SOURCES.map(def => ({
      ...def,
      ...(parsed.sources?.find((s: SourceState) => s.id === def.id) ?? {}),
    }));
  } catch { return DEFAULT_SOURCES; }
}

function initFeeds(): RssFeed[] {
  if (typeof window === "undefined") return DEFAULT_RSS_FEEDS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_RSS_FEEDS;
    const parsed = JSON.parse(saved);
    return parsed.feeds ?? DEFAULT_RSS_FEEDS;
  } catch { return DEFAULT_RSS_FEEDS; }
}

export default function SettingsPage() {
  const [sources, setSources] = useState<SourceState[]>(DEFAULT_SOURCES);
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>(DEFAULT_RSS_FEEDS);
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedCat, setNewFeedCat] = useState<RssFeed["category"]>("polska");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [rssFilter, setRssFilter] = useState("all");

  useEffect(() => {
    setSources(initSources());
    setRssFeeds(initFeeds());
  }, []);

  const persist = useCallback((s: SourceState[], f: RssFeed[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sources: s, feeds: f, savedAt: new Date().toISOString() }));
    } catch {}
  }, []);

  const updateSource = (id: string, changes: Partial<SourceState>) => {
    setSources(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...changes } : s);
      persist(next, rssFeeds);
      return next;
    });
  };

  const updateFeeds = (next: RssFeed[]) => {
    setRssFeeds(next);
    persist(sources, next);
  };

  const handleSaveAll = () => {
    setSaveStatus("saving");
    persist(sources, rssFeeds);
    setTimeout(() => setSaveStatus("saved"), 300);
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const addFeed = () => {
    if (!newFeedUrl.trim()) return;
    const next = [...rssFeeds, {
      id: Date.now().toString(),
      name: newFeedName || new URL(newFeedUrl).hostname,
      url: newFeedUrl.trim(),
      category: newFeedCat,
      enabled: true,
    }];
    updateFeeds(next);
    setNewFeedName(""); setNewFeedUrl("");
  };

  const enabledSources = sources.filter(s => s.enabled).length;
  const enabledRss = rssFeeds.filter(f => f.enabled).length;
  const categories: SourceCategory[] = ["polish", "social", "news", "open"];
  const filteredRss = rssFilter === "all" ? rssFeeds : rssFeeds.filter(f => f.category === rssFilter);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
            <Settings size={16} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Źródła danych</h1>
            <p className="text-xs text-slate-400">{enabledSources} API · {enabledRss} kanałów RSS aktywnych</p>
          </div>
        </div>
        <button onClick={handleSaveAll}
          className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm",
            saveStatus === "saved"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-brand-500 hover:bg-brand-600 text-white")}>
          {saveStatus === "saved"
            ? <><CheckCircle2 size={14} /> Zapisano</>
            : <><Save size={14} /> Zapisz konfigurację</>}
        </button>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5 mb-7">
        <Zap size={14} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Konfiguracja zapisywana automatycznie w przeglądarce. Klucze API trafią jako zmienne środowiskowe Vercel w Fazie 2. Źródła z etykietą <span className="text-emerald-600 font-medium">&quot;od razu gotowy&quot;</span> działają bez żadnej konfiguracji.
        </p>
      </div>

      <div className="space-y-8">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          const catSrc = sources.filter(s => s.category === cat);
          const active = catSrc.filter(s => s.enabled).length;
          const isPolish = cat === "polish";

          return (
            <section key={cat}>
              <div className={clsx("flex items-center gap-2 mb-3 pb-2 border-b",
                isPolish ? "border-red-200" : "border-slate-200")}>
                <Icon size={14} className={meta.accent ?? "text-slate-400"} />
                <h2 className="text-sm font-semibold text-slate-700">{meta.label}</h2>
                <span className="text-xs text-slate-400 ml-1">{active}/{catSrc.length}</span>
              </div>
              <div className="space-y-2">
                {catSrc.map(s => (
                  <SourceCard key={s.id} source={s} onChange={ch => updateSource(s.id, ch)} />
                ))}
              </div>
            </section>
          );
        })}

        {/* RSS */}
        <section>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
            <Rss size={14} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Polskie kanały RSS</h2>
            <span className="text-xs text-slate-400 ml-1">{enabledRss}/{rssFeeds.length}</span>
            <div className="ml-auto flex gap-1 flex-wrap">
              {["all", "polska", "polityka", "biznes", "tech"].map(f => (
                <button key={f} onClick={() => setRssFilter(f)}
                  className={clsx("text-[10px] px-2 py-0.5 rounded transition-colors",
                    rssFilter === f ? "bg-brand-500 text-white" : "text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200")}>
                  {f === "all" ? "Wszystkie" : RSS_CAT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 mb-3">
            {filteredRss.map(feed => (
              <RssFeedRow key={feed.id} feed={feed}
                onToggle={() => updateFeeds(rssFeeds.map(f => f.id === feed.id ? { ...f, enabled: !f.enabled } : f))}
                onRemove={() => updateFeeds(rssFeeds.filter(f => f.id !== feed.id))} />
            ))}
          </div>

          {/* Add feed */}
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5"><Plus size={11} /> Dodaj kanał RSS</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="text" value={newFeedName} onChange={e => setNewFeedName(e.target.value)}
                  placeholder="Nazwa kanału"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
                <select value={newFeedCat} onChange={e => setNewFeedCat(e.target.value as RssFeed["category"])}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-600 outline-none">
                  {Object.entries(RSS_CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="url" value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)}
                  placeholder="https://portal.pl/rss.xml"
                  onKeyDown={e => e.key === "Enter" && addFeed()}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
                <button onClick={addFeed} disabled={!newFeedUrl.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap">
                  <Plus size={13} /> Dodaj
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <p className="text-[11px] text-slate-400 mt-8 text-center">
        Faza 2 — silnik scrapowania + NLP pipeline dla języka polskiego
      </p>
    </div>
  );
}
