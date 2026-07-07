import { NextRequest } from "next/server";
import { runConsilium } from "@/lib/consilium/orchestrator";
import { CONSILIUM_MODES } from "@/lib/consilium/modes";
import type { ConsiliumInput, ConsiliumMode, StageEvent } from "@/lib/consilium/types";

// ── Konsylium — API route ze streamingiem ──────────────────────────────
// Ten sam wzorzec NDJSON co app/api/reaction-simulator/route.ts: jeden
// obiekt JSON na linię, ostatnia linia to {"stage":"synthesis", ...,
// "result": ConsiliumResult} z pełnym wynikiem. maxDuration wyższy niż
// w reaction-simulator (60) — tu jest 10 równoległych wywołań AI zamiast
// 5, a po nich sekwencyjnie jeszcze synteza, więc trzeba więcej zapasu
// czasowego, mimo że ściana czasu zależy od najwolniejszego pojedynczego
// wywołania (Promise.all), nie od sumy wszystkich dziesięciu.

export const maxDuration = 90;

const VALID_MODES = new Set(CONSILIUM_MODES.map((m) => m.id));

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { input?: Partial<ConsiliumInput> } | null;
  const raw = body?.input;
  const topic = (raw?.topic ?? "").trim();

  if (!topic) {
    return new Response(JSON.stringify({ error: "Brak tematu do analizy." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (topic.length > 3000) {
    return new Response(JSON.stringify({ error: "Temat zbyt długi (limit 3000 znaków)." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const mode: ConsiliumMode = VALID_MODES.has(raw?.mode as ConsiliumMode) ? (raw!.mode as ConsiliumMode) : "strategia";

  const input: ConsiliumInput = {
    topic,
    context: (raw?.context ?? "").slice(0, 2000),
    politicalGoal: (raw?.politicalGoal ?? "").slice(0, 500),
    targetAudience: (raw?.targetAudience ?? "").slice(0, 500),
    mode,
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
        const result = await runConsilium(input, (event: StageEvent) => send(event));
        send({ stage: "synthesis", status: "gotowe", label: "Konsylium gotowe", result });
      } catch (err) {
        send({ stage: "synthesis", status: "blad", label: "Błąd analizy", error: err instanceof Error ? err.message : "Nieznany błąd." });
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
