"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { LANGUAGES } from "@/lib/i18n";
import { useLang } from "@/lib/lang-context";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
          "border border-slate-200 bg-slate-100 hover:bg-slate-200",
          "text-slate-600 hover:text-slate-800"
        )}
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span className="tracking-wide">{current.label}</span>
        <ChevronDown
          size={12}
          className={clsx("transition-transform text-slate-400", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={clsx(
                "flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left",
                l.code === lang
                  ? "bg-brand-50 text-brand-600 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span className="text-sm">{l.flag}</span>
              <span className="font-medium tracking-wide">{l.label}</span>
              <span className="ml-auto text-slate-400 text-[10px]">{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
