import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { PlanetBadge, CometBadge, type CometKind } from "@/components/hub/badges";

// ── Standardowy nagłówek modułu/submodułu ──────────────────────────────
// Moduł = planeta z logo (jak na hubie), submoduł = kometa z ikoną (jak na
// hubie), warstwa wewnętrzna = ikona w gradiencie. Jeden układ dla wszystkich.
export default function PageHeader({
  title, subtitle, logo, comet, icon,
  accent = "from-sky-500 to-violet-600", status,
}: {
  title: string;
  subtitle?: string;
  logo?: string;          // moduł: planeta z logo
  comet?: CometKind;      // submoduł: kometa z ikoną
  icon?: ReactNode;       // warstwa wewnętrzna: ikona w gradiencie
  accent?: string;
  status?: string;
}) {
  return (
    <div className="mb-6">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition-colors hover:text-white">
        <ArrowLeft size={14} className="text-sky-400" /> Panel główny Political Dark Matter
      </Link>
      <div className="mt-5 flex items-start gap-4">
        <div className="shrink-0">
          {logo ? <PlanetBadge logo={logo} alt={title} />
            : comet ? <CometBadge kind={comet} />
            : <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accent} shadow-lg ring-1 ring-white/15`}>{icon}</div>}
        </div>
        <div className="min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {status && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {status}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
