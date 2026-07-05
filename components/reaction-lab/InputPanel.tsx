"use client";

import { useState } from "react";
import type { SimulationInput } from "@/lib/reaction-simulator/types";
import { FORMATS, GOALS, RISK_TOLERANCE_LABELS, ROLES, SITUATIONS, TARGET_AUDIENCES, TOPICS, type DemoExample } from "@/lib/reaction-simulator/mock-data";
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

export function InputPanel(p: { onSubmit: (input: SimulationInput) => void; running: boolean }) {
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<SimulationInput["topic"]>("");
  const [format, setFormat] = useState<SimulationInput["format"]>("");
  const [situation, setSituation] = useState<SimulationInput["situation"]>("");
  const [role, setRole] = useState<SimulationInput["role"]>("");
  const [targetAudience, setTargetAudience] = useState("");
  const [goal, setGoal] = useState<SimulationInput["goal"]>("");
  const [riskTolerance, setRiskTolerance] = useState<SimulationInput["riskTolerance"]>("srednie");

  function pickDemo(ex: DemoExample) {
    setText(ex.text);
    setTopic(ex.topic);
    setSituation(ex.situation);
  }

  function submit() {
    if (!text.trim() || p.running) return;
    p.onSubmit({ text: text.trim(), topic, format, situation, role, targetAudience, goal, riskTolerance });
  }

  return (
    <div className="pdm-panel" style={{ padding: "18px 18px 16px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Wklej planowany tweet, wypowiedź, fragment wywiadu, komunikat, reakcję kryzysową albo opis ruchu politycznego…"
          rows={4}
          maxLength={6000}
          style={{
            width: "100%", background: "rgba(8,11,20,0.6)", border: "1px solid rgba(56,189,248,0.18)", borderRadius: 10,
            padding: "11px 13px", color: "#f1f5f9", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit",
            lineHeight: 1.5, marginBottom: 10,
          }}
          className="pdm-searchbar"
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <DemoExamples onPick={pickDemo} />
          <span style={{ fontSize: 10, color: "#475569" }}>{text.length}/6000</span>
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
            {p.running ? "Symuluję…" : "Uruchom symulację reakcji"}
          </button>
        </div>
      </div>
    </div>
  );
}
