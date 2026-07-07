"use client";

import { useState } from "react";
import type { InputMode, SimulationInput } from "@/lib/reaction-simulator/types";
import { FORMATS, GOALS, INPUT_MODES, RISK_TOLERANCE_LABELS, ROLES, SITUATIONS, TARGET_AUDIENCES, TOPICS, type DemoExample } from "@/lib/reaction-simulator/mock-data";
import { DemoExamples } from "./DemoExamples";

const RISK_LEVELS: SimulationInput["riskTolerance"][] = ["niskie", "srednie", "wysokie", "zwarcie"];

function Select(p: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; placeholder: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{p.label}</span>
      <select
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        style={{
          background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8,
          padding: "7px 9px", color: "#f1f5f9", fontSize: 12.5, outline: "none", colorScheme: "dark", cursor: "pointer",
        }}
      >
        <option value="">{p.placeholder}</option>
        {p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function TextField(p: { label: string; value: string; onChange: (v: string) => void; placeholder: string; maxLength?: number }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{p.label}</span>
      <input
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={p.placeholder}
        maxLength={p.maxLength ?? 300}
        style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, padding: "7px 9px", color: "#f1f5f9", fontSize: 12.5, outline: "none" }}
      />
    </label>
  );
}

// excludeModes/submitLabel/runningLabel — nieinwazyjne rozszerzenie, żeby ten
// sam komponent (te same pola, te same opcje) dało się reużyć w
// app/reaction-check ("Reakcja na przekaz/fakt", sprawdzanie realnej reakcji
// zamiast symulacji AI). Domyślne wartości zachowują dokładnie stare
// zachowanie w app/reaction-lab — zero zmian dla istniejącego symulatora.
export function InputPanel(p: {
  onSubmit: (input: SimulationInput) => void;
  running: boolean;
  excludeModes?: InputMode[];
  submitLabel?: string;
  runningLabel?: string;
}) {
  const MODES = INPUT_MODES.filter((m) => !p.excludeModes?.includes(m.value));
  const [inputMode, setInputMode] = useState<InputMode>("wypowiedz");
  const [text, setText] = useState("");
  const [threadItems, setThreadItems] = useState<string[]>([]);
  const [eventTiming, setEventTiming] = useState("");
  const [eventStakeholders, setEventStakeholders] = useState("");
  const [priorReaction, setPriorReaction] = useState("");
  const [analysisGoal, setAnalysisGoal] = useState("");
  const [topic, setTopic] = useState<SimulationInput["topic"]>("");
  const [format, setFormat] = useState<SimulationInput["format"]>("");
  const [situation, setSituation] = useState<SimulationInput["situation"]>("");
  const [role, setRole] = useState<SimulationInput["role"]>("");
  const [targetAudience, setTargetAudience] = useState("");
  const [goal, setGoal] = useState<SimulationInput["goal"]>("");
  const [riskTolerance, setRiskTolerance] = useState<SimulationInput["riskTolerance"]>("srednie");

  const modeMeta = MODES.find((m) => m.value === inputMode) ?? MODES[0];
  const combinedLength = text.length + threadItems.reduce((s, t) => s + t.length, 0);

  function pickDemo(ex: DemoExample) {
    setInputMode("wypowiedz");
    setThreadItems([]);
    setText(ex.text);
    setTopic(ex.topic);
    setSituation(ex.situation);
  }

  function submit() {
    if (!text.trim() || p.running) return;
    p.onSubmit({
      inputMode, text: text.trim(), threadItems: threadItems.map((t) => t.trim()).filter(Boolean),
      eventTiming, eventStakeholders, priorReaction, analysisGoal,
      topic, format, situation, role, targetAudience, goal, riskTolerance,
    });
  }

  return (
    <div className="pdm-panel" style={{ padding: "18px 18px 16px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Zakładki trybu wprowadzania — różny "kształt" tego, co się testuje */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {MODES.map((m) => {
            const active = inputMode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setInputMode(m.value)}
                className={"pdm-pill" + (active ? " pdm-pill-active" : "")}
                style={{
                  padding: "6px 13px",
                  border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(148,163,184,0.18)",
                  background: active ? "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(124,58,237,0.20))" : "rgba(15,23,42,0.5)",
                  color: active ? "#bae6fd" : "#94a3b8",
                  fontSize: 11.5, fontWeight: 700,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>{modeMeta.hint}</div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={modeMeta.placeholder}
          rows={4}
          maxLength={6000}
          style={{
            width: "100%", background: "rgba(8,11,20,0.6)", border: "1px solid rgba(56,189,248,0.18)", borderRadius: 10,
            padding: "11px 13px", color: "#f1f5f9", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit",
            lineHeight: 1.5, marginBottom: 8,
          }}
          className="pdm-searchbar"
        />

        {/* Tryb: seria/wątek — dodatkowe elementy poza pierwszym */}
        {inputMode === "watek" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {threadItems.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 10, minWidth: 16 }}>{i + 2}.</span>
                <textarea
                  value={item}
                  onChange={(e) => setThreadItems((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                  placeholder={`Kolejna wypowiedź w wątku (${i + 2})…`}
                  rows={2}
                  className="pdm-searchbar"
                  style={{ flex: 1, background: "rgba(8,11,20,0.6)", border: "1px solid rgba(56,189,248,0.14)", borderRadius: 10, padding: "9px 11px", color: "#f1f5f9", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                />
                <button
                  type="button"
                  onClick={() => setThreadItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="pdm-btn-square"
                  style={{ marginTop: 6, padding: "4px 9px", borderRadius: 7, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 11, cursor: "pointer" }}
                >
                  usuń
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setThreadItems((prev) => [...prev, ""])}
              className="pdm-pill"
              style={{ alignSelf: "flex-start", padding: "5px 12px", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.2)", color: "#94a3b8", fontSize: 11.5, fontWeight: 600 }}
            >
              + dodaj kolejną wypowiedź w wątku
            </button>
          </div>
        )}

        {/* Tryb: wydarzenie planowane — kiedy / kogo dotyczy */}
        {inputMode === "wydarzenie_planowane" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
            <TextField label="Kiedy ma się to stać" value={eventTiming} onChange={setEventTiming} placeholder="np. za tydzień, na konferencji 15.07…" />
            <TextField label="Kogo dotyczy" value={eventStakeholders} onChange={setEventStakeholders} placeholder="np. minister, koalicjant, grupa wyborców…" />
          </div>
        )}

        {/* Tryb: wydarzenie zaistniałe — pełny opis sytuacji */}
        {inputMode === "wydarzenie_zaistniale" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
            <TextField label="Kiedy się to stało" value={eventTiming} onChange={setEventTiming} placeholder="np. wczoraj, 3 dni temu, w zeszłym tygodniu…" />
            <TextField label="Kogo dotyczy" value={eventStakeholders} onChange={setEventStakeholders} placeholder="np. minister, koalicjant, grupa wyborców…" />
            <TextField label="Dotychczasowa reakcja (jeśli wiadomo)" value={priorReaction} onChange={setPriorReaction} placeholder="np. już pojawiły się zarzuty o hipokryzję…" maxLength={500} />
            <TextField label="Co chcemy ustalić" value={analysisGoal} onChange={setAnalysisGoal} placeholder="np. czy reagować, jak zamknąć temat, czy milczeć…" maxLength={300} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <DemoExamples onPick={pickDemo} />
          <span style={{ fontSize: 10, color: "#475569" }}>{combinedLength}/6000</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
          <Select label="Temat" value={topic} onChange={(v) => setTopic(v as SimulationInput["topic"])} options={TOPICS} placeholder="— wybierz —" />
          <Select label="Format" value={format} onChange={(v) => setFormat(v as SimulationInput["format"])} options={FORMATS} placeholder="— wybierz —" />
          <Select label="Sytuacja" value={situation} onChange={(v) => setSituation(v as SimulationInput["situation"])} options={SITUATIONS} placeholder="— wybierz —" />
          <Select label="Rola mówiącego" value={role} onChange={(v) => setRole(v as SimulationInput["role"])} options={ROLES} placeholder="— wybierz —" />
          <Select label="Grupa docelowa" value={targetAudience} onChange={setTargetAudience} options={TARGET_AUDIENCES.map((a) => ({ value: a, label: a }))} placeholder="— wybierz —" />
          <Select label="Cel komunikacyjny" value={goal} onChange={(v) => setGoal(v as SimulationInput["goal"])} options={GOALS} placeholder="— wybierz —" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Akceptowalny poziom ryzyka</div>
            <div style={{ display: "flex", gap: 6 }}>
              {RISK_LEVELS.map((r) => {
                const active = riskTolerance === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRiskTolerance(r)}
                    className={"pdm-pill" + (active ? " pdm-pill-active" : "")}
                    style={{
                      padding: "6px 13px",
                      border: active ? "1px solid rgba(251,191,36,0.55)" : "1px solid rgba(148,163,184,0.18)",
                      background: active ? "linear-gradient(135deg, rgba(251,191,36,0.22), rgba(220,38,38,0.16))" : "rgba(15,23,42,0.5)",
                      color: active ? "#fde68a" : "#94a3b8",
                      fontSize: 11.5, fontWeight: 700,
                    }}
                  >
                    {RISK_TOLERANCE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!text.trim() || p.running}
            className="pdm-btn-primary"
            style={{ height: 46, padding: "0 26px", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: p.running ? "default" : "pointer" }}
          >
            {p.running ? (p.runningLabel ?? "Symuluję…") : (p.submitLabel ?? "Uruchom symulację reakcji")}
          </button>
        </div>
      </div>
    </div>
  );
}
