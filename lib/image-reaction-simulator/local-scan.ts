import { CHANNELS, MIN_RECOMMENDED_DIMENSION } from "./mock-data";
import type { ImageFormat, ImageLocalScanResult, ImageSimulationInput, PlatformFitEntry } from "./types";

// ── Krok 1: Local Image Pre-Scan ──────────────────────────────────────
// Bez LLM, bez biblioteki obrazu po stronie serwera — wymiary i rozmiar
// pliku dostarcza klient (ImageDropzone.tsx odczytuje je z Image.decode()
// i File.size w przeglądarce, patrz komentarz tam). Serwer tylko liczy
// wnioski z tych liczb. To realizuje wymóg "natychmiastowy lokalny skan"
// bez czekania na Vision AI.

function detectFormat(mimeType: string): ImageFormat {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "nieznany";
}

function aspectRatioLabel(w: number, h: number): string {
  if (!w || !h) return "nieznany";
  function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
  const d = gcd(w, h) || 1;
  const rw = Math.round(w / d);
  const rh = Math.round(h / d);
  // Ułamki blisko znanych proporcji (16:9, 4:3, 3:2, 1:1, 9:16) — pokazujemy
  // je czytelnie zamiast surowego, często absurdalnie dużego ułamka po GCD.
  const known: Array<[number, number]> = [[1, 1], [4, 5], [16, 9], [9, 16], [4, 3], [3, 4], [3, 2], [2, 3]];
  const ratio = w / h;
  let best: [number, number] = [rw, rh];
  let bestDiff = Infinity;
  for (const [a, b] of known) {
    const diff = Math.abs(ratio - a / b);
    if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
  }
  return bestDiff < 0.03 ? `${best[0]}:${best[1]}` : `${rw}:${rh}`;
}

function platformFitFor(width: number, height: number): PlatformFitEntry[] {
  const ratio = width / height;
  return CHANNELS.map(({ value, label }) => {
    const minDim = MIN_RECOMMENDED_DIMENSION[value];
    const longSide = Math.max(width, height);
    const resOk = longSide >= minDim;

    let ratioOk = true;
    let ratioNote = "";
    if (value === "instagram" || value === "tiktok") {
      // Format pionowy/kwadratowy preferowany — szeroki kadr wymaga cropu.
      ratioOk = ratio <= 1.05;
      ratioNote = ratioOk ? "" : "kadr poziomy — social zwykle wymaga cropu do pionu/kwadratu";
    } else if (value === "youtube_thumbnail" || value === "baner") {
      ratioOk = ratio >= 1.4;
      ratioNote = ratioOk ? "" : "zbyt pionowy kadr jak na miniaturę/baner poziomy";
    } else if (value === "plakat") {
      ratioOk = ratio <= 1.0;
      ratioNote = ratioOk ? "" : "plakaty zwykle w pionie — obecny kadr poziomy wymaga przycięcia";
    }

    let fit: PlatformFitEntry["fit"] = "dobre";
    let note = "rozdzielczość i proporcje wystarczające";
    if (!resOk && !ratioOk) { fit = "zle"; note = `rozdzielczość poniżej ${minDim}px i ${ratioNote}`; }
    else if (!resOk) { fit = "wymaga_cropu"; note = `rozdzielczość poniżej rekomendowanej (${minDim}px dłuższy bok)`; }
    else if (!ratioOk) { fit = "wymaga_cropu"; note = ratioNote; }

    return { platform: label, fit, note };
  });
}

export function runImageLocalScan(input: ImageSimulationInput): ImageLocalScanResult {
  const { width, height, fileSizeBytes, mimeType } = input;
  const format = detectFormat(mimeType);
  const megapixels = Math.round((width * height) / 1_000_000 * 10) / 10;
  const fileSizeMb = Math.round((fileSizeBytes / (1024 * 1024)) * 100) / 100;
  const isHighRes = Math.min(width, height) >= 900;

  const warnings: string[] = [];
  if (!isHighRes) warnings.push("Rozdzielczość niższa niż rekomendowana dla druku i dużych formatów (plakat, baner) — nadaje się głównie na social.");
  if (fileSizeMb > 15) warnings.push("Duży plik (" + fileSizeMb + " MB) — rozważ kompresję przed publikacją.");
  if (format === "nieznany") warnings.push("Nierozpoznany format pliku — upewnij się, że to JPG, PNG albo WEBP.");
  const ratio = width / height;
  if (ratio > 2.2 || ratio < 0.45) warnings.push("Bardzo wydłużony kadr — większość kanałów będzie wymagać przycięcia.");

  return {
    format,
    width,
    height,
    aspectRatioLabel: aspectRatioLabel(width, height),
    megapixels,
    fileSizeMb,
    isHighRes,
    platformFit: platformFitFor(width, height),
    warnings,
  };
}
