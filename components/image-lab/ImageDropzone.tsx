"use client";

import { useCallback, useRef, useState } from "react";

// ── Upload zdjęcia — drag & drop, walidacja, downscale ────────────────
// Wymiary/rozmiar ORYGINAŁU idą do local-scan (ocena rozdzielczości pod
// druk/plakat musi widzieć prawdziwy plik). Do analizy AI (Vision) idzie
// downscalowana kopia — max 1280px dłuższy bok, JPEG q=0.82 — żeby
// nie wysyłać megabajtów przez sieć i nie płacić tokenami Vision za
// rozdzielczość, której model i tak nie wykorzysta (sekcja 3.6:
// "kompresji / downscalingu obrazu do analizy, zachowaniu oryginału do
// podglądu"). Oryginał zostaje w przeglądarce jako object URL — do
// pełnorozdzielczościowego podglądu, nigdy nie trafia na serwer.

export interface PreparedImage {
  previewUrl: string; // object URL oryginału — do podglądu w UI
  analysisBase64: string; // downscalowana kopia, bez prefiksu data:...
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  fileSizeBytes: number;
  fileName: string;
}

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIMENSION = 1280;

function downscale(file: File, img: HTMLImageElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("Canvas niedostępny w tej przeglądarce.")); return; }
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.82);
    resolve(dataUrl.split(",")[1] ?? "");
  });
}

export function ImageDropzone(p: { onReady: (img: PreparedImage) => void; onClear: () => void; prepared: PreparedImage | null; disabled?: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!VALID_TYPES.includes(file.type)) {
      setError("Nieobsługiwany format — dozwolone: JPG, PNG, WEBP.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Plik zbyt duży (limit 20MB).");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        const analysisBase64 = await downscale(file, img);
        p.onReady({
          previewUrl,
          analysisBase64,
          mimeType: file.type === "image/png" ? "image/png" : "image/jpeg",
          originalWidth: img.width,
          originalHeight: img.height,
          fileSizeBytes: file.size,
          fileName: file.name,
        });
      } catch {
        setError("Nie udało się przetworzyć zdjęcia w przeglądarce.");
      }
    };
    img.onerror = () => setError("Nie udało się wczytać zdjęcia — plik może być uszkodzony.");
    img.src = previewUrl;
  }, [p]);

  if (p.prepared) {
    return (
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(56,189,248,0.22)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.prepared.previewUrl} alt="Podgląd zdjęcia" style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block", background: "#05070d" }} />
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => { p.onClear(); if (inputRef.current) inputRef.current.value = ""; }}
            disabled={p.disabled}
            className="pdm-btn-square"
            style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(15,23,42,0.75)", border: "1px solid rgba(248,113,113,0.4)", color: "#fca5a5", fontSize: 11, fontWeight: 700, cursor: p.disabled ? "default" : "pointer" }}
          >
            Usuń / podmień
          </button>
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 10, color: "#cbd5e1", background: "rgba(8,11,20,0.75)", padding: "3px 9px", borderRadius: 6 }}>
          {p.prepared.originalWidth}×{p.prepared.originalHeight}px · {(p.prepared.fileSizeBytes / (1024 * 1024)).toFixed(2)}MB · {p.prepared.fileName}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? "rgba(56,189,248,0.7)" : "rgba(148,163,184,0.3)"}`,
          borderRadius: 12, padding: "36px 20px", textAlign: "center", cursor: "pointer",
          background: dragOver ? "rgba(56,189,248,0.06)" : "rgba(8,11,20,0.4)",
          transition: "all 0.15s",
        }}
      >
        <div style={{ fontSize: 26, marginBottom: 8 }}>📷</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Przeciągnij zdjęcie albo kliknij, żeby wybrać plik</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>JPG, PNG, WEBP · max 20MB</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFile(e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </div>
      {error && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: "#fca5a5", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "7px 11px" }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
