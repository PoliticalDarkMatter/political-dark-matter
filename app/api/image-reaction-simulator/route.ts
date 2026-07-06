import { NextRequest } from "next/server";
import { runImageOrchestration } from "@/lib/image-reaction-simulator/orchestrator";
import type { ImageSimulationInput, ImageStageEvent } from "@/lib/image-reaction-simulator/types";

// ── Political Image Reaction Simulator — API route ze streamingiem ────
// Ten sam wzorzec co app/api/reaction-simulator/route.ts (moduł
// tekstowy): NDJSON, jeden obiekt na linię, ostatnia linia niesie pełny
// result. Różnica: walidacja wejścia dotyczy obrazu (mimeType, rozmiar
// base64) zamiast długości tekstu.

export const maxDuration = 60;

const VALID_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
// ~6M znaków base64 ≈ 4.5MB danych binarnych — bezpieczny margines pod
// limitem body serverless functions Vercel. Klient i tak downscaluje
// obraz przed wysyłką (patrz ImageDropzone.tsx), więc w normalnym
// użyciu payload jest rzędu kilkuset KB, nie megabajtów.
const MAX_BASE64_CHARS = 6_000_000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { input?: Partial<ImageSimulationInput> } | null;
  const raw = body?.input;

  const imageBase64 = (raw?.imageBase64 ?? "").trim();
  const mimeType = raw?.mimeType ?? "";

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: "Brak zdjęcia do analizy." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!VALID_MIME.has(mimeType)) {
    return new Response(JSON.stringify({ error: "Nieobsługiwany format pliku — dozwolone: JPG, PNG, WEBP." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    return new Response(JSON.stringify({ error: "Plik zbyt duży — spróbuj mniejszej rozdzielczości albo innego formatu." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const width = Math.max(1, Math.round(Number(raw?.width) || 0));
  const height = Math.max(1, Math.round(Number(raw?.height) || 0));
  if (!width || !height) {
    return new Response(JSON.stringify({ error: "Brak informacji o wymiarach zdjęcia." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const input: ImageSimulationInput = {
    imageBase64,
    mimeType,
    width,
    height,
    fileSizeBytes: Math.max(0, Math.round(Number(raw?.fileSizeBytes) || 0)),
    who: (raw?.who ?? "").trim().slice(0, 300),
    additionalContext: (raw?.additionalContext ?? "").trim().slice(0, 1500),
    topic: raw?.topic ?? "",
    channel: raw?.channel ?? "",
    goal: raw?.goal ?? "",
    eventType: raw?.eventType ?? "",
    isCrisisResponse: Boolean(raw?.isCrisisResponse),
    isCounterAttack: Boolean(raw?.isCounterAttack),
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
        const result = await runImageOrchestration(input, (event: ImageStageEvent) => send(event));
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
