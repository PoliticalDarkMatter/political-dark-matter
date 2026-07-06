import { AUDIENCE_SEGMENTS, RISK_TOLERANCE_LABELS, TOPICS } from "../reaction-simulator/mock-data";
import type {
  CaptionType, EventType, ImageAttackVector, ImageChannel, ImageGoal, MemeTone, VisualRiskFactorType,
} from "./types";

// ── Political Image Reaction Simulator — słowniki i dane referencyjne ─
// Re-używa TOPICS/AUDIENCE_SEGMENTS/RISK_TOLERANCE_LABELS z modułu
// tekstowego (lib/reaction-simulator/mock-data.ts) — to te same pojęcia,
// nie ma powodu ich duplikować. Rozszerza segmenty o grupy specyficzne
// dla obrazu (konta memiczne, aktywiści, eksperci, Instagram), których
// nie było w oryginalnej liście (tam liczyły się głównie dla tekstu).

export { TOPICS, RISK_TOLERANCE_LABELS };

export const IMAGE_AUDIENCE_SEGMENTS: string[] = [
  ...AUDIENCE_SEGMENTS.filter((s) => s !== "TikTok" && s !== "X/Twitter" && s !== "Facebook"),
  "Instagram", "TikTok", "X/Twitter", "Facebook", "konta memiczne", "aktywiści", "eksperci",
];

export const CHANNELS: Array<{ value: ImageChannel; label: string }> = [
  { value: "x", label: "X / Twitter" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube_thumbnail", label: "Miniatura YouTube" },
  { value: "portal", label: "Portal internetowy" },
  { value: "newsletter", label: "Newsletter" },
  { value: "konferencja", label: "Konferencja" },
  { value: "plakat", label: "Plakat" },
  { value: "reklama", label: "Reklama" },
  { value: "baner", label: "Baner" },
  { value: "material_prasowy", label: "Materiał prasowy" },
];

export const GOALS: Array<{ value: ImageGoal; label: string }> = [
  { value: "ocieplic_wizerunek", label: "Ocieplić wizerunek" },
  { value: "pokazac_sile", label: "Pokazać siłę" },
  { value: "pokazac_empatie", label: "Pokazać empatię" },
  { value: "pokazac_sprawczosc", label: "Pokazać sprawczość" },
  { value: "pokazac_bliskosc", label: "Pokazać bliskość ludzi" },
  { value: "pokazac_ekspertckosc", label: "Pokazać eksperckość" },
  { value: "pokazac_normalnosc", label: "Pokazać normalność" },
  { value: "zaatakowac_przeciwnika", label: "Zaatakować przeciwnika" },
  { value: "zneutralizowac_kryzys", label: "Zneutralizować kryzys" },
  { value: "przejac_temat", label: "Przejąć temat" },
  { value: "wywolac_emocje", label: "Wywołać emocję" },
  { value: "zbudowac_symbol", label: "Zbudować symbol" },
];

export const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "publiczne", label: "Wydarzenie publiczne" },
  { value: "polprywatne", label: "Półprywatne" },
  { value: "oficjalne", label: "Oficjalne" },
];

export const VISUAL_RISK_FACTOR_LABELS: Record<VisualRiskFactorType, string> = {
  meme: "Ryzyko memiczne",
  arogancja: "Ryzyko arogancji",
  sztucznosc: "Ryzyko sztuczności",
  slabosc: "Ryzyko słabości",
  chaos: "Ryzyko chaosu",
  agresja: "Ryzyko agresji",
  brak_empatii: "Ryzyko nieempatyczności",
  elitarnosc: "Ryzyko elitarności",
  oderwanie_od_ludzi: "Ryzyko oderwania od ludzi",
  zle_tlo: "Ryzyko złego tła",
  niekorzystna_mimika: "Ryzyko niekorzystnej mimiki",
  niekorzystny_gest: "Ryzyko niekorzystnego gestu",
  przypadkowe_symbole: "Ryzyko przypadkowych symboli",
  zly_crop: "Ryzyko złego cropu",
  niechciane_skojarzenia: "Ryzyko niechcianych skojarzeń",
};

export const ALL_VISUAL_RISK_FACTORS: VisualRiskFactorType[] = Object.keys(VISUAL_RISK_FACTOR_LABELS) as VisualRiskFactorType[];

export const OPPONENT_VECTOR_LABELS: Record<ImageAttackVector, string> = {
  lewica: "Atak z lewej",
  prawica: "Atak z prawej",
  liberalny: "Atak liberalny",
  populistyczny: "Atak populistyczny",
  ekspercki: "Atak ekspercki",
  personalny: "Atak personalny",
  memiczny: "Atak memiczny",
  klasowy: "Atak klasowy",
  pokoleniowy: "Atak pokoleniowy",
  oderwanie_od_rzeczywistosci: "Oderwanie od rzeczywistości",
  ustawka_i_propaganda: "Ustawka i propaganda",
};

export const ALL_ATTACK_VECTORS: ImageAttackVector[] = Object.keys(OPPONENT_VECTOR_LABELS) as ImageAttackVector[];

export const MEME_TONE_LABELS: Record<MemeTone, string> = {
  ironiczny: "ironiczny", agresywny: "agresywny", klasowy: "klasowy", obyczajowy: "obyczajowy",
  pokoleniowy: "pokoleniowy", antyelitarny: "antyelitarny", antysystemowy: "antysystemowy",
};

export const CAPTION_TYPE_LABELS: Record<CaptionType, string> = {
  bezpieczny: "Bezpieczny", mocny: "Mocny", ludzki: "Ludzki", empatyczny: "Empatyczny",
  ofensywny: "Ofensywny", neutralizujacy_memicznosc: "Neutralizujący memiczność",
  pod_x: "Pod X", pod_facebook: "Pod Facebook", pod_instagram: "Pod Instagram",
  pod_portal: "Pod portal", do_newslettera: "Do newslettera",
};

export const ALL_CAPTION_TYPES: CaptionType[] = Object.keys(CAPTION_TYPE_LABELS) as CaptionType[];

// ── Szablon osi ewolucji odbioru (krok 9) — okna czasowe stałe, treść
// dla każdego okna wypełnia AI (albo mock-generators.ts jako fallback).
export const EVOLUTION_WINDOWS: Array<{ window: string; label: string }> = [
  { window: "0–1h", label: "Pierwsze komentarze" },
  { window: "1–3h", label: "Reakcje kont politycznych" },
  { window: "3–8h", label: "Możliwe wejście portali" },
  { window: "8–24h", label: "Memizacja / komentarze publicystów" },
  { window: "24–48h", label: "Utrwalenie albo wygaszenie" },
  { window: "48h+", label: "Czy zdjęcie może wracać jako symbol" },
];

// ── Minimalne rekomendowane rozdzielczości per kanał (Local Pre-Scan) ─
export const MIN_RECOMMENDED_DIMENSION: Record<ImageChannel, number> = {
  x: 900, facebook: 1000, instagram: 1080, tiktok: 1080, youtube_thumbnail: 1280,
  portal: 1200, newsletter: 600, konferencja: 1600, plakat: 2000, reklama: 1500,
  baner: 1500, material_prasowy: 1600,
};
