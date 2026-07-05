"use client";

import type { LabMode } from "@/lib/reaction-simulator/types";

export const MODE_META: Record<LabMode, { label: string; question: string }> = {
  pelny: { label: "Pełny raport", question: "Pełny raport strategiczny." },
  pre_mortem: { label: "Pre-Mortem", question: "Dlaczego to może wybuchnąć?" },
  opponent: { label: "Opponent Room", question: "Jak przeciwnik to zaatakuje?" },
  media: { label: "Media Room", question: "Jak media to skrócą?" },
  people: { label: "People Room", question: "Jak odbiorą to ludzie?" },
  rewrite: { label: "Rewrite Room", question: "Powiedz to lepiej." },
  red_flags: { label: "Red Flag Scanner", question: "Skan min." },
  silence: { label: "Silence Test", question: "Czy lepiej w ogóle milczeć?" },
};

const ORDER: LabMode[] = ["pelny", "pre_mortem", "opponent", "media", "people", "rewrite", "red_flags", "silence"];

export function ModeSwitcher(p: { mode: LabMode; onChange: (m: LabMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
      {ORDER.map((m) => {
        const active = p.mode === m;
        return (
          <button
            key={m}
            onClick={() => p.onChange(m)}
            className={"pdm-pill" + (active ? " pdm-pill-active" : "")}
            style={{
              padding: "6px 14px",
              border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(148,163,184,0.18)",
              background: active ? "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(124,58,237,0.20))" : "rgba(15,23,42,0.5)",
              color: active ? "#bae6fd" : "#94a3b8",
              fontSize: 12, fontWeight: 700,
            }}
          >
            {MODE_META[m].label}
          </button>
        );
      })}
    </div>
  );
}
