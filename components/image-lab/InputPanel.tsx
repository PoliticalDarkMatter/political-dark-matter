"use client";

import { useState } from "react";
import type { ImageSimulationInput } from "@/lib/image-reaction-simulator/types";
import { CHANNELS, EVENT_TYPES, GOALS } from "@/lib/image-reaction-simulator/mock-data";
import { RISK_TOLERANCE_LABELS, TOPICS } from "@/lib/reaction-simulator/mock-data";
import { ImageDropzone, type PreparedImage } from "./ImageDropzone";

const RISK_LEVELS: ImageSimulationInput["riskTolerance"][] = ["niskie", "srednie", "wysokie", "zwarcie"];

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

function Toggle(p: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, color: "#cbd5e1" }}>
      <input type="checkbox" checked={p.checked} onChange={(e) => p.onChange(e.target.checked)} style={{ accentColor: "#38bdf8", width: 14, height: 14, cursor: "pointer" }} />
      {p.label}
    </label>
  );
}

export interface ImageInputPayload {
  prepared: PreparedImage;
  who: string;
  topic: ImageSimulationInput["topic"];
  channel: ImageSimulationInput["channel"];
  goal: ImageSimulationInput["goal"];
  eventType: ImageSimulationInput["eventType"];
  isCrisisResponse: boolean;
  isCounterAttack: boolean;
  riskTolerance: ImageSimulationInput["riskTolerance"];
}

export function InputPanel(p: { onSubmit: (payload: ImageInputPayload) => void; running: boolean }) {
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [who, setWho] = useState("");
  const [topic, setTopic] = useState<ImageSimulationInput["topic"]>("");
  const [channel, setChannel] = useState<ImageSimulationInput["channel"]>("");
  const [goal, setGoal] = useState<ImageSimulationInput["goal"]>("");
  const [eventType, setEventType] = useState<ImageSimulationInput["eventType"]>("");
  const [isCrisisResponse, setIsCrisisResponse] = useState(false);
  const [isCounterAttack, setIsCounterAttack] = useState(false);
  const [riskTolerance, setRiskTolerance] = useState<ImageSimulationInput["riskTolerance"]>("srednie");

  function submit() {
    if (!prepared || p.running) return;
    p.onSubmit({ prepared, who, topic, channel, goal, eventType, isCrisisResponse, isCounterAttack, riskTolerance });
  }

  return (
    <div className="pdm-panel" style={{ padding: "18px 18px 16px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 14 }}>
          <ImageDropzone
            prepared={prepared}
            onReady={(img) => setPrepared(img)}
            onClear={() => setPrepared(null)}
            disabled={p.running}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Kto jest na zdjęciu</span>
            <input
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="np. lider partii, minister zdrowia…"
              maxLength={300}
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, padding: "7px 9px", color: "#f1f5f9", fontSize: 12.5, outline: "none" }}
            />
          </label>
          <Select label="Temat publikacji" value={topic} onChange={(v) => setTopic(v as ImageSimulationInput["topic"])} options={TOPICS} placeholder="— wybierz —" />
          <Select label="Kanał publikacji" value={channel} onChange={(v) => setChannel(v as ImageSimulationInput["channel"])} options={CHANNELS} placeholder="— wybierz —" />
          <Select label="Cel komunikacyjny" value={goal} onChange={(v) => setGoal(v as ImageSimulationInput["goal"])} options={GOALS} placeholder="— wybierz —" />
          <Select label="Typ wydarzenia" value={eventType} onChange={(v) => setEventType(v as ImageSimulationInput["eventType"])} options={EVENT_TYPES} placeholder="— wybierz —" />
        </div>

        <div style={{ display: "flex", gap: 18, marginBottom: 14, flexWrap: "wrap" }}>
          <Toggle label="Reakcja na kryzys" checked={isCrisisResponse} onChange={setIsCrisisResponse} />
          <Toggle label="Ma kontratakować przeciwnika" checked={isCounterAttack} onChange={setIsCounterAttack} />
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
            disabled={!prepared || p.running}
            className="pdm-btn-primary"
            style={{ height: 46, padding: "0 26px", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: p.running || !prepared ? "default" : "pointer", opacity: !prepared ? 0.55 : 1 }}
          >
            {p.running ? "Symuluję…" : "Uruchom symulację odbioru zdjęcia"}
          </button>
        </div>
      </div>
    </div>
  );
}
