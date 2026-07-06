import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ensureFontsRegistered } from "@/lib/reports/pdf-theme";
import { buildImageLabReportDocument } from "@/lib/reports/image-lab-report";
import type { ImageReactionSimulationResult } from "@/lib/image-reaction-simulator/types";

// ── Raport PDF — Political Image Reaction Simulator ───────────────────
// Klient (app/image-lab/page.tsx) POST'uje pełny wynik symulacji (już
// policzony wcześniej przez /api/image-reaction-simulator — TU nie
// liczymy niczego od nowa, tylko renderujemy istniejące dane do PDF).
// Obraz jest opcjonalny: klient wysyła przeskalowaną wersję użytą do
// analizy (jeśli wciąż ma ją w pamięci) wyłącznie do podglądu w raporcie —
// wynik symulacji sam w sobie nigdy nie zawiera obrazu (patrz orchestrator.ts).

export const maxDuration = 30;

function isResult(x: unknown): x is ImageReactionSimulationResult {
  return !!x && typeof x === "object" && "verdict" in x && "overallScores" in x && "generatedAt" in x;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    result?: unknown; imageBase64?: string; mimeType?: string;
  } | null;

  if (!body || !isResult(body.result)) {
    return new Response(JSON.stringify({ error: "Brak poprawnego wyniku symulacji do wygenerowania raportu." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    ensureFontsRegistered();
    const imageDataUri = body.imageBase64 && body.mimeType
      ? `data:${body.mimeType};base64,${body.imageBase64}`
      : null;
    const doc = buildImageLabReportDocument(body.result, imageDataUri);
    const buffer = await renderToBuffer(doc);

    const safeWho = (body.result.input.who || "raport").toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, "-").slice(0, 40);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="raport-symulator-zdjec-${safeWho}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Nie udało się wygenerować raportu PDF." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
