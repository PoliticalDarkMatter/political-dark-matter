"use client";

import type { ImageLabMode } from "@/lib/image-reaction-simulator/types";

export const MODE_META: Record<ImageLabMode, { label: string; question: string }> = {
  pelny: { label: "Pełny raport", question: "Pełny raport strategiczny." },
  meme: { label: "Meme Room", question: "Jaki mem z tego powstanie?" },
  opponent: { label: "Opponent Room", question: "Jak przeciwnik to zaatakuje?" },
  media: { label: "Media Room", question: "Jak media to wykorzystają?" },
  segments: { label: "People Room", question: "Jak odbiorą to ludzie?" },
  caption: { label: "Caption Room", question: "Jak to podpisać?" },
  evolution: { label: "Evolution Timeline", question: "Jak to będzie ewoluować?" },
};

const ORDER: ImageLabMode[] = ["pelny", "meme", "opponent", "media", "segments", "caption", "evolution"];

export function ModeSwitcher(p: { mode: ImageLabMode; onChange: (m: ImageLabMode) => void }) {
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
