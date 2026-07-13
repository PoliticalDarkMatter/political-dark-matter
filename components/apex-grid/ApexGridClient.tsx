"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { ApexInput, ApexResult, ApexStageId, ApexStageStatus } from "@/lib/apex-grid/types";
import { InputPanel } from "./InputPanel";
import { PipelineProgress } from "./PipelineProgress";
import { ResultsView } from "./ResultsView";

// ── Apex Grid — klient ─────────────────────────────────────────────────
// Strona standalone (poza AppShell Narrative Scope, jak /insight-base):
// Apex Grid to osobny moduł platformy, nie podstrona monitoringu.
// Klient czyta /api/apex-grid jako strumień NDJSON — ten sam wzorzec co
// app/konsylium/page.tsx czyta /api/consilium.

export function ApexGridClient() {
  const [running, setRunning] = useState(false);
  const [stageStatuses, setStageStatuses] = useState<Partial<Record<ApexStageId, ApexStageStatus>>>({});
  const [councilProgress, setCouncilProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ApexResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = useCallback(async (input: ApexInput) => {
    setRunning(true);
    setError(null);
    setResult(null);
    setStageStatuses({});
    setCouncilProgress(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/apex-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Nie udało się uruchomić analizy.");
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
            setResult(obj.result as ApexResult);
          } else if (obj.stage) {
            setStageStatuses((prev) => ({ ...prev, [obj.stage as ApexStageId]: obj.status as ApexStageStatus }));
            if (obj.stage === "council" && obj.data && typeof obj.data === "object") {
              const d = obj.data as { done?: number; total?: number };
              if (typeof d.done === "number" && typeof d.total === "number") {
                setCouncilProgress({ done: d.done, total: d.total });
              }
            }
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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#05060f] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(0.6px_0.6px_at_20px_30px,#fff,transparent),radial-gradient(0.6px_0.6px_at_140px_80px,#fff,transparent),radial-gradient(0.6px_0.6px_at_90px_180px,#fff,transparent)] [background-size:340px_340px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white">
          <ArrowLeft size={14} />
          Wróć do ekosystemu
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div className="rounded-2xl bg-white" style={{ padding: 6, width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image src="/logos/apex-grid.png" alt="Apex Grid" width={42} height={34} style={{ objectFit: "contain" }} />
          </div>
          <div>
            <div className="pdm-kicker">Warstwa analizy · moduł drugi ekosystemu</div>
            <h1 className="pdm-hero-title" style={{ fontSize: 32, lineHeight: 1.05 }}>Apex Grid</h1>
          </div>
        </div>
        <p style={{ margin: "8px 0 20px", fontSize: 13, color: "#64748b", maxWidth: 760, lineHeight: 1.6 }}>
          Od sygnału do decyzji w pięciu warstwach: monitoring z Narrative Scope, twarde dane o grupach z e-wyborcy,
          narada ekspertów Konsylium, scenariusze z osią czasu i jedna jednoznaczna rekomendacja z mapą skutków.
          Produktem tego modułu jest decyzja, nie raport.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputPanel onSubmit={runAnalysis} running={running} />

          {running && <PipelineProgress statuses={stageStatuses} councilProgress={councilProgress} running={running} />}

          {running && (
            <button
              onClick={cancel}
              className="pdm-btn-square"
              style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
            >
              Przerwij analizę
            </button>
          )}

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 12.5 }}>
              ⚠ {error}
            </div>
          )}

          {result && !running && (
            <>
              <PipelineProgress statuses={stageStatuses} councilProgress={councilProgress} running={false} />
              <ResultsView result={result} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
