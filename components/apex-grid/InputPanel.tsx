"use client";

import { useState } from "react";
import { APEX_PRODUCTS } from "@/lib/apex-grid/products";
import type { ApexInput, ApexProduct } from "@/lib/apex-grid/types";

function TextField(p: { label: string; value: string; onChange: (v: string) => void; placeholder: string; maxLength?: number }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{p.label}</span>
      <input
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={p.placeholder}
        maxLength={p.maxLength ?? 500}
        style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, padding: "7px 9px", color: "#f1f5f9", fontSize: 12.5, outline: "none" }}
      />
    </label>
  );
}

// Formularz Apex Grid: wybór PRODUKTU (nie trybu analizy — produkt steruje
// całym pipeline'em: składem narady, liczbą scenariuszy i tonem decyzji,
// patrz lib/apex-grid/products.ts), potem sprawa + kontekst + cel + grupy.
export function InputPanel(p: { onSubmit: (input: ApexInput) => void; running: boolean }) {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [politicalGoal, setPoliticalGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [product, setProduct] = useState<ApexProduct>("sdp");

  const productMeta = APEX_PRODUCTS.find((m) => m.id === product) ?? APEX_PRODUCTS[0];

  function submit() {
    if (!topic.trim() || p.running) return;
    p.onSubmit({ topic: topic.trim(), context: context.trim(), politicalGoal: politicalGoal.trim(), targetAudience: targetAudience.trim(), product });
  }

  return (
    <div className="pdm-panel" style={{ padding: "18px 18px 16px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {APEX_PRODUCTS.map((m) => {
            const active = product === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setProduct(m.id)}
                className={"pdm-pill" + (active ? " pdm-pill-active" : "")}
                style={{
                  padding: "6px 13px",
                  border: active ? "1px solid rgba(129,140,248,0.6)" : "1px solid rgba(148,163,184,0.18)",
                  background: active ? "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(56,189,248,0.18))" : "rgba(15,23,42,0.5)",
                  color: active ? "#c7d2fe" : "#94a3b8",
                  fontSize: 11.5, fontWeight: 700,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>{productMeta.shortDescription}</div>

        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={productMeta.topicPlaceholder}
          rows={4}
          maxLength={3000}
          style={{
            width: "100%", background: "rgba(8,11,20,0.6)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 10,
            padding: "11px 13px", color: "#f1f5f9", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit",
            lineHeight: 1.5, marginBottom: 8,
          }}
          className="pdm-searchbar"
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: "#475569" }}>{topic.length}/3000</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
          <TextField label="Kontekst polityczny" value={context} onChange={setContext} placeholder={productMeta.contextPlaceholder} maxLength={2000} />
          <TextField label="Cel polityka (opcjonalnie)" value={politicalGoal} onChange={setPoliticalGoal} placeholder="np. zbudować pozycję w temacie gospodarczym, nie stracić centrum…" />
          <TextField label="Grupy, o które toczy się gra (opcjonalnie)" value={targetAudience} onChange={setTargetAudience} placeholder="np. wyborcy niezdecydowani, młodzi z miast, przedsiębiorcy…" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={submit}
            disabled={!topic.trim() || p.running}
            className="pdm-btn-primary"
            style={{ height: 46, padding: "0 26px", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: p.running ? "default" : "pointer" }}
          >
            {p.running ? "Analizuję…" : "Uruchom analizę"}
          </button>
        </div>
      </div>
    </div>
  );
}
