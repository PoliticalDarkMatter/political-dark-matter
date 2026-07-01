"use client";

import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import type { Narrative } from "@/lib/types";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/lib/mock-data";

interface NarrativeCardProps {
  narrative: Narrative;
  rank: number;
}

const TREND_CONFIG = {
  rising: { icon: TrendingUp, color: "text-rose-400", bg: "bg-rose-400/10", label: "Rosnąca" },
  falling: { icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Malejąca" },
  stable: { icon: Minus, color: "text-slate-400", bg: "bg-slate-400/10", label: "Stabilna" },
  new: { icon: Sparkles, color: "text-amber-400", bg: "bg-amber-400/10", label: "Nowa" },
};

export default function NarrativeCard({ narrative, rank }: NarrativeCardProps) {
  const trend = TREND_CONFIG[narrative.trend];
  const TrendIcon = trend.icon;

  const sentimentColor =
    narrative.sentiment < -0.3
      ? "bg-rose-400"
      : narrative.sentiment > 0.3
      ? "bg-emerald-400"
      : "bg-slate-400";

  const sentimentWidth = `${Math.abs(narrative.sentiment) * 100}%`;

  return (
    <div className="card hover:border-surface-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl font-bold text-surface-800 leading-none mt-0.5">
            {String(rank).padStart(2, "0")}
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white leading-tight">{narrative.label}</h4>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{narrative.description}</p>
          </div>
        </div>
        <div className={clsx("badge shrink-0", trend.bg, trend.color)}>
          <TrendIcon size={10} />
          {trend.label}
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-slate-600 mb-1">
          <span>Sentyment</span>
          <span>{narrative.sentiment > 0 ? "+" : ""}{(narrative.sentiment * 100).toFixed(0)}</span>
        </div>
        <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all", sentimentColor)}
            style={{ width: sentimentWidth, marginLeft: narrative.sentiment < 0 ? "auto" : 0 }}
          />
        </div>
      </div>

      {/* Platforms */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {narrative.platforms.map((p) => (
          <span
            key={p}
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: PLATFORM_COLORS[p] + "22",
              color: PLATFORM_COLORS[p],
            }}
          >
            {PLATFORM_LABELS[p]}
          </span>
        ))}
      </div>

      {/* Key phrases */}
      <div className="flex items-center gap-1 flex-wrap">
        {narrative.keyPhrases.slice(0, 3).map((phrase) => (
          <span key={phrase} className="text-[10px] px-1.5 py-0.5 bg-surface-800 text-slate-500 rounded">
            &ldquo;{phrase}&rdquo;
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-800">
        <span className="text-xs text-slate-600">
          {narrative.sampleCount.toLocaleString("pl-PL")} dokumentów
        </span>
        <span className={clsx("text-xs font-medium", trend.color)}>{narrative.velocity}</span>
      </div>
    </div>
  );
}
