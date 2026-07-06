import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ensureFontsRegistered } from "@/lib/reports/pdf-theme";
import { buildReactionLabReportDocument } from "@/lib/reports/reaction-lab-report";
import type { ReactionSimulationResult } from "@/lib/reaction-simulator/types";

// ── Raport PDF — Political Reaction Simulator ─────────────────────────
// Analogicznie do app/api/image-reaction-simulator/report/route.ts:
// klient POST'uje już policzony wynik (/api/reaction-simulator), tu
// tylko renderujemy go do PDF — zero ponownych wywołań AI.

export const maxDuration = 30;

function isResult(x: unknown): x is ReactionSimulationResult {
  return !!x && typeof x === "object" && "verdict" in x && "overallScores" in x && "generatedAt" in x;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { result?: unknown } | null;

  if (!body || !isResult(body.result)) {
    return new Response(JSON.stringify({ error: "Brak poprawnego wyniku symulacji do wygenerowania raportu." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    ensureFontsRegistered();
    const doc = buildReactionLabReportDocument(body.result);
    const buffer = await renderToBuffer(doc);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="raport-symulator-reakcji.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[reaction-simulator/report] PDF generation failed:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Nie udało się wygenerować raportu PDF." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
