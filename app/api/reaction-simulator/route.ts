import { NextRequest } from "next/server";
import { runOrchestration } from "@/lib/reaction-simulator/orchestrator";
import type { SimulationInput, StageEvent } from "@/lib/reaction-simulator/types";

// ── Political Reaction Simulator — API route ze streamingiem ──────────
// Zwraca NDJSON (jeden obiekt JSON na linię) zamiast pojedynczej,
// wielkiej odpowiedzi — klient (app/reaction-lab/page.tsx) czyta strumień
// przez response.body.getReader() i renderuje sekcje etapami, w miarę
// jak przychodzą (patrz orchestrator.ts po uzasadnienie architektury
// równoległych etapów). To realizuje wymóg "etapowe renderowanie,
// nieblokujące UI, częściowy wynik zanim przyjdzie pełny raport".
//
// Ostatnia linia strumienia to zawsze {"stage":"final", ..., "result": ReactionSimulationResult}
// z kompletnym, strukturalnym wynikiem — reszta linii to postęp per etap.

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { input?: Partial<SimulationInput> } | null;
  const raw = body?.input;
  const text = (raw?.text ?? "").trim();

  if (!text) {
    return new Response(JSON.stringify({ error: "Brak treści do analizy." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const threadItems = Array.isArray(raw?.threadItems)
    ? raw.threadItems.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.slice(0, 2000)).slice(0, 20)
    : [];

  const combinedLength = text.length + threadItems.reduce((s, t) => s + t.length, 0);
  if (combinedLength > 6000) {
    return new Response(JSON.stringify({ error: "Treść zbyt długa (limit 6000 znaków łącznie, wliczając wątek)." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const input: SimulationInput = {
    inputMode: raw?.inputMode ?? "wypowiedz",
    text,
    threadItems,
    eventTiming: (raw?.eventTiming ?? "").slice(0, 300),
    eventStakeholders: (raw?.eventStakeholders ?? "").slice(0, 300),
    priorReaction: (raw?.priorReaction ?? "").slice(0, 500),
    analysisGoal: (raw?.analysisGoal ?? "").slice(0, 300),
    topic: raw?.topic ?? "",
    format: raw?.format ?? "",
    situation: raw?.situation ?? "",
    role: raw?.role ?? "",
    targetAudience: raw?.targetAudience ?? "",
    goal: raw?.goal ?? "",
    riskTolerance: raw?.riskTolerance ?? "srednie",
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
        const result = await runOrchestration(input, (event: StageEvent) => send(event));
        send({ stage: "final", status: "gotowe", label: "Raport gotowy", result });
      } catch (err) {
        send({ stage: "final", status: "blad", label: "Błąd analizy", error: err instanceof Error ? err.message : "Nieznany błąd." });
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
