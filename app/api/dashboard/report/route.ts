import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ensureFontsRegistered } from "@/lib/reports/pdf-theme";
import { buildDashboardReportDocument } from "@/lib/reports/dashboard-report";
import type { FeedData } from "@/lib/dashboard-types";

// ── Raport PDF — Dashboard / bryfing sytuacyjny Narrative Scope ──────
// Klient (app/dashboard/page.tsx) POST'uje FeedData, którą już ma
// wczytaną z /api/news — zero nowego pobierania danych, zero AI.
// Zamienia dokładnie to, co widać na ekranie w chwili kliknięcia, w
// drukowalny PDF.

export const maxDuration = 30;

function isFeedData(x: unknown): x is FeedData {
  return !!x && typeof x === "object" && "articles" in x && "sentimentCounts" in x && "fetchedAt" in x;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    data?: unknown; query?: string; period?: string; mode?: string;
  } | null;

  if (!body || !isFeedData(body.data)) {
    return new Response(JSON.stringify({ error: "Brak poprawnych danych dashboardu do wygenerowania raportu." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    ensureFontsRegistered();
    const doc = buildDashboardReportDocument(body.data, {
      query: (body.query ?? "").slice(0, 200),
      period: (body.period ?? "").slice(0, 40),
      mode: (body.mode ?? "").slice(0, 40),
    });
    const buffer = await renderToBuffer(doc);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="raport-narrative-scope-dashboard.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[dashboard/report] PDF generation failed:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Nie udało się wygenerować raportu PDF." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
