import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSprawaCockpit } from "@/lib/sprawy";
import { getCurrentZalozenia } from "@/lib/zalozenia";
import { buildSprawaReport } from "@/lib/reports/sprawa-report";
import { buildPdmReportDocument } from "@/lib/reports/pdm-document";
import { ensureFontsRegistered } from "@/lib/reports/pdf-theme";
import { renderReportDocx } from "@/lib/reports/docx-renderer";

// ── Raport sprawy — jeden endpoint, dwa formaty (PDF | DOCX) ───────────
// Dane składane po stronie serwera (kokpit + założenia), renderowane
// przez wspólne renderery. Zero ponownych wywołań AI.

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return (s || "sprawa")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "sprawa";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const format = (new URL(req.url).searchParams.get("format") || "pdf").toLowerCase();

  try {
    const cockpit = await getSprawaCockpit(params.id);
    if (!cockpit) {
      return new Response(JSON.stringify({ error: "Nie znaleziono sprawy." }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    const zalozenia = await getCurrentZalozenia().catch(() => null);
    const report = buildSprawaReport(cockpit, zalozenia);
    const base = `raport-sprawa-${slugify(cockpit.sprawa.nazwa)}`;

    if (format === "docx") {
      const buffer = await renderReportDocx(report);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${base}.docx"`,
          "Cache-Control": "no-store",
        },
      });
    }

    ensureFontsRegistered();
    const buffer = await renderToBuffer(buildPdmReportDocument(report));
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/sprawy/[id]/report]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Nie udało się wygenerować raportu." }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
