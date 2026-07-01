"use client";

import { Bell, Search, X, ExternalLink, Loader2, Clock, Menu } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import LanguageSwitcher from "./LanguageSwitcher";

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  section?: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

function useDebounce<T>(val: T, ms: number) {
  const [debounced, setDebounced] = useState(val);
  useEffect(function () {
    const t = setTimeout(function () { setDebounced(val); }, ms);
    return function () { clearTimeout(t); };
  }, [val, ms]);
  return debounced;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h > 48) return `${Math.floor(h / 24)}d`;
  if (h >= 1) return `${h}h`;
  if (m >= 1) return `${m}m`;
  return "teraz";
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([] as Article[]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 400);

  const openModal = useCallback(function () {
    setOpen(true);
    setTimeout(function () { inputRef.current?.focus(); }, 50);
  }, []);

  const closeModal = useCallback(function () {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  useEffect(function () {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open ? closeModal() : openModal();
      }
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handler);
    return function () { document.removeEventListener("keydown", handler); };
  }, [open, openModal, closeModal]);

  useEffect(function () {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/news?q=${encodeURIComponent(debouncedQuery)}`)
      .then(function (r) { return r.json(); })
      .then(function (d) { setResults(d.articles ?? []); setLoading(false); })
      .catch(function () { setLoading(false); });
  }, [debouncedQuery]);

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        {/* Hamburger — mobile only */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>

          {/* Search trigger */}
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-3 py-1.5 w-48 md:w-64 text-left transition-colors"
          >
            <Search size={14} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 flex-1 hidden sm:block">Szukaj narracji…</span>
            <kbd className="text-[10px] text-slate-400 border border-slate-300 rounded px-1 py-0.5 bg-white hidden md:block">⌘K</kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <div className="w-px h-5 bg-slate-200 hidden md:block" />
          <button className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-500" />
          </button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold text-white">
            J
          </div>
        </div>
      </header>

      {/* Search modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={function (e) { setQuery(e.target.value); }}
                placeholder="Wpisz hasło, temat, frazę…"
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {loading && <Loader2 size={14} className="text-slate-400 animate-spin shrink-0" />}
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                <X size={15} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {!query.trim() && (
                <div className="px-5 py-8 text-center">
                  <Search size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Szybkie wyszukiwanie w mediach</p>
                  <p className="text-xs text-slate-400 mt-1">np. &quot;inflacja&quot;, &quot;nato&quot;, &quot;wybory&quot;</p>
                </div>
              )}
              {query.trim() && !loading && results.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-500">Brak wyników dla &quot;{query}&quot;</p>
                </div>
              )}
              {results.length > 0 && (
                <ul className="py-2">
                  {results.map(function (article) {
                    return (
                      <li key={article.id}>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 group-hover:text-slate-900 line-clamp-2 leading-snug transition-colors">
                              {article.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-brand-600 font-medium">{article.source}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto">
                                <Clock size={9} />
                                {timeAgo(article.publishedAt)}
                              </span>
                            </div>
                          </div>
                          <ExternalLink size={12} className="text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
              {results.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{results.length} wyników</span>
                  <span className="text-[10px] text-slate-400">Esc — zamknij</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
