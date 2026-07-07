"use client";

import { useCallback, useRef, useState } from "react";
import type { ConsiliumInput, ConsiliumResult, StageId, StageStatus } from "@/lib/consilium/types";
import { InputPanel } from "@/components/consilium/InputPanel";
import { AIAnalysisProgress } from "@/components/consilium/AIAnalysisProgress";
import { ResultsView } from "@/components/consilium/ResultsView";

// ── Konsylium ────────────────────────────────────────────────────────
// Narada dziesięciu ekspertów AI wokół jednego tematu/pytania/dylematu —
// moduł DECYZYJNY, nie chat z ekspertami: wynik ma dać jednoznaczną
// rekomendację, nie dziesięć osobnych esejów (patrz ResultsView.tsx po
// uzasadnienie hierarchii wyświetlania). Klient czyta /api/consilium jako
// strumień NDJSON, dokładnie tak jak app/reaction-lab/page.tsx czyta
// /api/reaction-simulator — ten sam, sprawdzony wzorzec.

export default function KonsyliumPage() {
  const [running, setRunning] = useState(false);
  const [stageStatuses, setStageStatuses] = useState<Partial<Record<StageId, StageStatus>>>({});
  const [result, setResult] = useState<ConsiliumResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runConsilium = useCallback(async (input: ConsiliumInput) => {
    setRunning(true);
    setError(null);
    setResult(null);
    setStageStatuses({});

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/consilium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Nie udało się zwołać Konsylium.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let obj: Record<string, unknown>;
          try { obj = JSON.parse(line); } catch { continue; }
          if (obj.result) {
            setResult(obj.result as ConsiliumResult);
          } else if (obj.stage) {
            setStageStatuses((prev) => ({ ...prev, [obj.stage as StageId]: obj.status as StageStatus }));
            if (obj.status === "blad" && obj.error) setError(String(obj.error));
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, []);

  function cancel() {
    abortRef.current?.abort();
    setRunning(false);
  }

  return (
    <div style={{ padding: "18px 24px 40px", minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif", color: "#e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <div>
          <div className="pdm-kicker">Political Dark Matter</div>
          <h1 className="pdm-hero-title" style={{ fontSize: 28, lineHeight: 1.1 }}>Konsylium</h1>
        </div>
        <div className="pdm-live-pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20 }}>
          <span className="pdm-live-dot" />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#86efac" }}>10 EKSPERTÓW</span>
        </div>
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#64748b", maxWidth: 720 }}>
        Narada dziesięciu doradców politycznych wokół jednego tematu, pytania, dylematu lub projektu wypowiedzi — strateg, socjolog, ekspert od narracji, spin doctor, fact-checker, prawnik, ekonomista, psycholog, ekspert social media i red team. Wynikiem nie jest dziesięć opinii do przeczytania, tylko jeden protokół decyzyjny: co robić, dlaczego i jakim językiem mówić.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <InputPanel onSubmit={runConsilium} running={running} />

        {running && <AIAnalysisProgress statuses={stageStatuses} running={running} />}

        {running && (
          <button
            onClick={cancel}
            className="pdm-btn-square"
            style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
          >
            Anuluj naradę
          </button>
        )}

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 12.5 }}>
            ⚠ {error}
          </div>
        )}

        {result && !running && (
          <>
            <AIAnalysisProgress statuses={stageStatuses} running={false} />
            <ResultsView result={result} />
          </>
        )}
      </div>
    </div>
  );
}
