"use client";

import { FileText, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import type { Report } from "@/lib/types";

interface StatsCardsProps {
  report: Report;
}

export default function StatsCards({ report }: StatsCardsProps) {
  const risingNarratives = report.dominantNarratives.filter(
    (n) => n.trend === "rising" || n.trend === "new"
  ).length;

  const negativeShare =
    report.sentimentDistribution.negative +
    (report.sentimentDistribution.ironic ?? 0);

  const stats = [
    {
      label: "Dokumentów zebranych",
      value: report.totalDocuments.toLocaleString("pl-PL"),
      icon: FileText,
      color: "text-brand-500",
      bg: "bg-brand-500/10",
      sub: "ostatnie 7 dni",
    },
    {
      label: "Dominujących narracji",
      value: report.dominantNarratives.length,
      icon: Activity,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
      sub: "zidentyfikowanych",
    },
    {
      label: "Narracje rosnące",
      value: risingNarratives,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      sub: "wymagają uwagi",
    },
    {
      label: "Nastrój negatywny",
      value: `${negativeShare}%`,
      icon: AlertTriangle,
      color: "text-rose-400",
      bg: "bg-rose-400/10",
      sub: "neg. + ironiczny",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="card flex items-start gap-4">
          <div className={`${s.bg} p-2.5 rounded-lg shrink-0`}>
            <s.icon size={18} className={s.color} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 leading-tight">{s.label}</p>
            <p className="text-2xl font-semibold text-white mt-1">{s.value}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
