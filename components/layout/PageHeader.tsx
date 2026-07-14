import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

// ── Standardowy nagłówek modułu/submodułu ──────────────────────────────
// Jeden układ dla wszystkich stron: powrót do huba, badge (logo dla modułów,
// ikona dla submodułów), tytuł, podtytuł, opcjonalny status. Dzięki temu
// każda strona ma identyczną główkę.
export default function PageHeader({
  title, subtitle, logo, icon,
  accent = "from-sky-500 to-violet-600", ring = "ring-sky-300/40", status,
}: {
  title: string;
  subtitle?: string;
  logo?: string;
  icon?: ReactNode;
  accent?: string;
  ring?: string;
  status?: string;
}) {
  return (
    <div className="mb-6">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition-colors hover:text-white">
        <ArrowLeft size={14} className="text-sky-400" /> Panel główny Political Dark Matter
      </Link>
      <div className="mt-5 flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg ring-1 ${ring} ${logo ? "bg-white" : `bg-gradient-to-br ${accent}`}`}>
          {logo ? <Image src={logo} alt={title} width={32} height={32} className="h-8 w-8 object-contain" /> : icon}
        </div>
        <div className="min-w-0">
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
