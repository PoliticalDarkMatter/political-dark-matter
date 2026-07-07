"use client";

import { useState } from "react";
import { ImageDropzone, type PreparedImage } from "@/components/image-lab/ImageDropzone";

export interface ImageCheckPayload {
  prepared: PreparedImage;
  who: string;
  context: string;
  sourceUrl: string;
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

export function InputPanel(p: { onSubmit: (payload: ImageCheckPayload) => void; running: boolean }) {
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [who, setWho] = useState("");
  const [context, setContext] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  function submit() {
    if (!prepared || p.running) return;
    p.onSubmit({ prepared, who, context, sourceUrl });
  }

  return (
    <div className="pdm-panel" style={{ padding: "18px 18px 16px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 12 }}>
          <ImageDropzone prepared={prepared} onReady={setPrepared} onClear={() => setPrepared(null)} disabled={p.running} />
        </div>

        <p style={{ fontSize: 11.5, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5 }}>
          Wgraj zdjęcie/mem, który już krąży w sieci — sprawdzimy, czy i jak realnie o nim piszą media i użytkownicy. To nie jest symulacja: Gemini Vision opisuje zdjęcie i proponuje frazy, a wyszukiwanie idzie po prawdziwych materiałach. Nie jest to wyszukiwanie obrazem (reverse image search) — trafność zależy od jakości opisu i tego, czy ktoś już o tym pisał pod podobnymi słowami.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 12 }}>
          <TextField label="Kogo / czego dotyczy" value={who} onChange={setWho} placeholder="np. lider partii, minister zdrowia, konkretne wydarzenie…" />
          <TextField label="Link źródłowy, jeśli znasz" value={sourceUrl} onChange={setSourceUrl} placeholder="np. post na X/Facebooku/portalu, gdzie to widziałeś…" maxLength={500} />
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Dodatkowy kontekst (opcjonalnie)</span>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Np. gdzie to widziałeś, co przedstawia zdjęcie, dlaczego krąży, czego się obawiasz…"
            rows={3}
            maxLength={1500}
            className="pdm-searchbar"
            style={{
              width: "100%", background: "rgba(8,11,20,0.6)", border: "1px solid rgba(56,189,248,0.18)", borderRadius: 10,
              padding: "9px 11px", color: "#f1f5f9", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
            }}
          />
          <span style={{ fontSize: 10, color: "#475569", alignSelf: "flex-end" }}>{context.length}/1500</span>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={submit}
            disabled={!prepared || p.running}
            className="pdm-btn-primary"
            style={{ height: 46, padding: "0 26px", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: p.running || !prepared ? "default" : "pointer", opacity: !prepared ? 0.55 : 1 }}
          >
            {p.running ? "Sprawdzam…" : "Sprawdź realną reakcję"}
          </button>
        </div>
      </div>
    </div>
  );
}
