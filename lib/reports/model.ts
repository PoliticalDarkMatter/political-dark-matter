import { ZALOZENIA_SLOTS, type Zalozenia } from "@/lib/zalozenia";

// ── Neutralny model raportu PDM — jeden kontrakt danych dla WSZYSTKICH
//    modułów i dla poziomu sprawy ─────────────────────────────────────
// Zasada architektoniczna (decyzja Jana): raporty opatrzone stylem
// projektu generuje JEDEN wspólny renderer, nie każdy moduł osobno.
// Moduł/sprawa produkuje ten neutralny obiekt (PdmReport), a renderery
// pdm-document.tsx (PDF) i docx-renderer.ts (DOCX) nadają mu styl marki.
// Nagłówek każdego raportu automatycznie dokleja aktualne założenia
// strategiczne (konstytucję), żeby dokument był osadzony w ich kontekście.

export interface ReportMeta {
  kicker: string;            // np. "Political Dark Matter"
  title: string;             // tytuł raportu
  subtitle?: string;         // kontekst (np. nazwa sprawy)
  typ?: string;              // typ sprawy (etykieta)
  status?: string;           // status sprawy (etykieta)
  generatedAt: string;       // ISO
  wersjaZalozen?: number | null;
}

export type ReportBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "labeled"; label: string; text: string }
  | { kind: "table"; columns: Array<{ key: string; label: string }>; rows: Array<Record<string, string>> }
  | { kind: "note"; text: string };

export interface ReportSection {
  heading: string;
  subtitle?: string;
  blocks: ReportBlock[];
}

export interface ZalozeniaHeaderLine {
  label: string;
  value: string;
}

export interface PdmReport {
  meta: ReportMeta;
  zalozenia: ZalozeniaHeaderLine[];   // wyrenderowany nagłówek założeń
  sections: ReportSection[];
}

// Nagłówek założeń — te same sloty i kolejność co w edytorze/preambule
// promptów (lib/zalozenia.ts). Puste sloty pomijamy.
export function zalozeniaHeaderLines(z: Zalozenia | null): ZalozeniaHeaderLine[] {
  if (!z) return [];
  const out: ZalozeniaHeaderLine[] = [];
  for (const s of ZALOZENIA_SLOTS) {
    const v = (z[s.key] as string | null)?.trim();
    if (v) out.push({ label: s.label, value: v });
  }
  return out;
}

// Data w formacie PL — pura funkcja (bez importu react-pdf), żeby mógł jej
// używać także renderer DOCX i builder sprawy bez wciągania ciężkiego bundla.
export function formatDatePl(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Stopka robocza — wspólna dla obu formatów.
export const WORKING_DOC_NOTE =
  "Dokument roboczy sztabu — wyłącznie do użytku wewnętrznego. Nie do dystrybucji zewnętrznej.";
