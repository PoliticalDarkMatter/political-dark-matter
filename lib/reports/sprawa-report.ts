import { TYP_LABEL, STATUS_LABEL, type Cockpit } from "@/lib/sprawy";
import type { Zalozenia } from "@/lib/zalozenia";
import { formatDatePl, zalozeniaHeaderLines, type PdmReport, type ReportSection, type ReportBlock } from "./model";

// ── Złożenie raportu na poziomie SPRAWY ────────────────────────────────
// Sprawa agreguje wyjścia wszystkich modułów potoku (sygnał→decyzja→
// komunikat→publikacja→efekt). To jest główne miejsce generowania raportu
// opatrzonego stylem projektu: bierze kokpit sprawy + aktualne założenia
// i produkuje neutralny PdmReport dla wspólnych rendererów PDF/DOCX.

const HANDOFF_LABEL: Record<string, string> = {
  draft: "roboczy",
  ready: "gotowy",
  consumed: "przejęty",
};

function handoffLabel(h: string | null): string {
  if (!h) return "";
  return HANDOFF_LABEL[h] ?? h;
}

export function buildSprawaReport(cockpit: Cockpit, zalozenia: Zalozenia | null): PdmReport {
  const { sprawa, stages, efektEvents } = cockpit;
  const sections: ReportSection[] = [];

  if (sprawa.opis) {
    sections.push({ heading: "Opis sprawy", blocks: [{ kind: "paragraph", text: sprawa.opis }] });
  }

  // Przegląd przepływu (handoff)
  sections.push({
    heading: "Przebieg sprawy",
    subtitle: "Oś handoff: sygnał → decyzja → komunikat → publikacja → efekt",
    blocks: [
      {
        kind: "table",
        columns: [
          { key: "etap", label: "Etap" },
          { key: "modul", label: "Moduł" },
          { key: "count", label: "Pozycje" },
        ],
        rows: stages.map((s) => ({ etap: s.label, modul: s.modul, count: String(s.count) })),
      },
      { kind: "note", text: `Efekt: ${efektEvents} zdarzeń zaangażowania z publikacji tej sprawy, wracają do Narrative Scope jako sygnał.` },
    ],
  });

  // Szczegóły per etap
  for (const s of stages) {
    const blocks: ReportBlock[] = [];
    if (s.items.length === 0) {
      blocks.push({ kind: "note", text: "Brak pozycji na tym etapie." });
    } else {
      blocks.push({
        kind: "table",
        columns: [
          { key: "tytul", label: "Pozycja" },
          { key: "meta", label: "Szczegół" },
          { key: "handoff", label: "Handoff" },
          { key: "data", label: "Data" },
        ],
        rows: s.items.map((it) => ({
          tytul: it.tytul || "—",
          meta: it.meta || "—",
          handoff: handoffLabel(it.handoff),
          data: it.at ? formatDatePl(it.at) : "—",
        })),
      });
    }
    sections.push({ heading: `${s.label} · ${s.modul}`, blocks });
  }

  return {
    meta: {
      kicker: "Political Dark Matter",
      title: "Raport sprawy",
      subtitle: sprawa.nazwa,
      typ: TYP_LABEL[sprawa.typ],
      status: STATUS_LABEL[sprawa.status],
      generatedAt: new Date().toISOString(),
      wersjaZalozen: zalozenia?.wersja ?? null,
    },
    zalozenia: zalozeniaHeaderLines(zalozenia),
    sections,
  };
}
