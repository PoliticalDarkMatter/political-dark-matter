import { NextRequest } from "next/server";
import { runApexGrid } from "@/lib/apex-grid/orchestrator";
import { APEX_PRODUCTS } from "@/lib/apex-grid/products";
import type { ApexInput, ApexProduct, ApexStageEvent } from "@/lib/apex-grid/types";
import { getZalozeniaPreamble } from "@/lib/zalozenia";

// ── Apex Grid — API route ze streamingiem ──────────────────────────────
// Ten sam wzorzec NDJSON co app/api/consilium/route.ts: jeden obiekt JSON
// na linię, ostatnia linia to {"stage":"decision", ..., "result": ApexResult}.
// maxDuration wyższy niż w Konsylium (90): pipeline ma dwa dodatkowe
// SEKWENCYJNE wywołania AI po naradzie (scenariusze, potem decyzja), więc
// ściana czasu to research + najwolniejszy ekspert + scenariusze + decyzja.

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const VALID_PRODUCTS = new Set<ApexProduct>(APEX_PRODUCTS.map((p) => p.id));

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { input?: Partial<ApexInput> } | null;
  const raw = body?.input;
  const topic = (raw?.topic ?? "").trim();

  if (!topic) {
    return new Response(JSON.stringify({ error: "Brak sprawy do analizy." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (topic.length > 3000) {
    return new Response(JSON.stringify({ error: "Opis sprawy zbyt długi (limit 3000 znaków)." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const product: ApexProduct = VALID_PRODUCTS.has(raw?.product as ApexProduct)
    ? (raw!.product as ApexProduct)
    : "sdp";

  const zalozenia = await getZalozeniaPreamble();
  const input: ApexInput = {
    zalozenia,
    topic,
    context: (raw?.context ?? "").slice(0, 2000),
    politicalGoal: (raw?.politicalGoal ?? "").slice(0, 500),
    targetAudience: (raw?.targetAudience ?? "").slice(0, 500),
    product,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* kontroler mógł już zostać zamknięty po stronie klienta — ignoruj */
        }
      }
      try {
        const result = await runApexGrid(input, (event: ApexStageEvent) => send(event));
        send({ stage: "decision", status: "gotowe", label: "Apex Grid gotowy", result });
      } catch (err) {
        send({
          stage: "decision",
          status: "blad",
          label: "Błąd analizy",
          error: err instanceof Error ? err.message : "Nieznany błąd.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
