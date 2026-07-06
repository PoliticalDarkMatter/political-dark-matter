import { Font, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  ROBOTO_BOLD_BASE64, ROBOTO_BOLD_ITALIC_BASE64, ROBOTO_ITALIC_BASE64, ROBOTO_REGULAR_BASE64,
} from "./fonts-data";

// ── Wspólny silnik raportów PDF — motyw i prymitywy ───────────────────
// Reużywane przez lib/reports/{image-lab,reaction-lab,dashboard}-report.tsx.
// @react-pdf/renderer generuje PDF czysto po stronie Node (bez headless
// Chromium) — lekkie i stabilne na Vercel serverless, ale wymaga
// zarejestrowania prawdziwego fontu Unicode: standardowe 14 fontów PDF
// (Helvetica itp.) NIE mają polskich znaków diakrytycznych (ą, ć, ę, ł,
// ń, ó, ś, ź, ż), więc bez tego rejestru całe PL UI raportu byłoby
// nieczytelne. Font osadzony jako base64 w lib/reports/fonts-data.ts
// (import ES, zawsze trafia do bundla) — próba czytania pliku z dysku
// w runtime (assets/fonts/*.ttf + outputFileTracingIncludes) zawiodła
// na Vercelu: "Could not resolve font for Roboto" w produkcji, mimo że
// lokalnie działało — file tracing nie zawsze łapie dynamiczny fs.readFileSync.

let fontsRegistered = false;

export function ensureFontsRegistered() {
  if (fontsRegistered) return;
  // src jako "data:" URL (base64 w pamięci) — trafia w gałąź isDataUrl()
  // loadera fontów, więc żaden odczyt z dysku w runtime w ogóle nie zachodzi.
  // Rejestrujemy WSZYSTKIE 4 warianty (regular/bold/italic/bold-italic):
  // pierwsza wersja miała tylko regular+bold, a raporty gdzieniegdzie
  // używają fontStyle: "italic" (np. cytaty) — react-pdf filtruje źródła
  // fontu dokładnie po fontStyle, więc bez zarejestrowanej wersji italic
  // resolver rzuca "Could not resolve font for Roboto, fontWeight 400"
  // (brak pasujących źródeł), co ujawniło się dopiero w produkcji na
  // sekcjach z kursywą — stąd ta czwórka, nie tylko dwa warianty.
  Font.register({
    family: "Roboto",
    fonts: [
      { src: `data:font/ttf;base64,${ROBOTO_REGULAR_BASE64}`, fontWeight: "normal", fontStyle: "normal" },
      { src: `data:font/ttf;base64,${ROBOTO_BOLD_BASE64}`, fontWeight: "bold", fontStyle: "normal" },
      { src: `data:font/ttf;base64,${ROBOTO_ITALIC_BASE64}`, fontWeight: "normal", fontStyle: "italic" },
      { src: `data:font/ttf;base64,${ROBOTO_BOLD_ITALIC_BASE64}`, fontWeight: "bold", fontStyle: "italic" },
    ],
  });
  // react-pdf łamie długie słowa/frazy nieadekwatnie z domyślnym silnikiem
  // łamania — wyłączamy myślnikowanie, bo psuje polskie słowa.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

// ── Paleta — jasna, drukowalna wersja brandu Political Dark Matter ───
export const colors = {
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  panel: "#f8fafc",
  panelAlt: "#f1f5f9",
  brandDark: "#070a13",
  sky: "#0369a1",
  skySoft: "#e0f2fe",
  purple: "#6d28d9",
  purpleSoft: "#ede9fe",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  warn: "#b45309",
  warnSoft: "#fef3c7",
  safe: "#15803d",
  safeSoft: "#dcfce7",
  white: "#ffffff",
};

export function riskColor(v: number): string {
  if (v >= 76) return colors.danger;
  if (v >= 51) return colors.warn;
  if (v >= 26) return "#a16207";
  return colors.safe;
}

export function riskSoft(v: number): string {
  if (v >= 76) return colors.dangerSoft;
  if (v >= 51) return colors.warnSoft;
  if (v >= 26) return "#fef9c3";
  return colors.safeSoft;
}

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9.5,
    color: colors.body,
    paddingTop: 86,
    paddingBottom: 56,
    paddingHorizontal: 40,
    backgroundColor: colors.white,
  },
  headerBand: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 62,
    backgroundColor: colors.brandDark,
    paddingHorizontal: 40,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  kicker: {
    fontSize: 7.5,
    fontWeight: "bold",
    letterSpacing: 1.2,
    color: "#7dd3fc",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.white,
  },
  headerMeta: {
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 40,
    paddingHorizontal: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: colors.faint,
  },
  h2: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.ink,
    marginBottom: 2,
  },
  h2Subtitle: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 8,
  },
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  labelSmall: {
    fontSize: 7,
    fontWeight: "bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.faint,
    marginBottom: 3,
  },
  bodyText: {
    fontSize: 9.5,
    color: colors.body,
    lineHeight: 1.5,
  },
});

// ── Nagłówek strony — pasek marki + tytuł raportu + metadane ─────────
export function ReportHeader(p: { kicker: string; title: string; meta: string }) {
  return (
    <View style={styles.headerBand} fixed>
      <View>
        <Text style={styles.kicker}>{p.kicker}</Text>
        <Text style={styles.headerTitle}>{p.title}</Text>
      </View>
      <Text style={styles.headerMeta}>{p.meta}</Text>
    </View>
  );
}

// ── Stopka — numeracja stron + zastrzeżenie poufności ────────────────
export function ReportFooter(p: { confidentialityNote?: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {p.confidentialityNote ?? "Dokument roboczy — wyłącznie do użytku wewnętrznego sztabu. Nie do dystrybucji zewnętrznej."}
      </Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Strona ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function SectionHeading(p: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={styles.h2}>{p.title}</Text>
      {p.subtitle && <Text style={styles.h2Subtitle}>{p.subtitle}</Text>}
    </View>
  );
}

// ── Poziomy pasek natężenia (score/ryzyko 0-100) ─────────────────────
export function MeterBar(p: { label: string; value: number; invert?: boolean }) {
  const shown = p.invert ? 100 - p.value : p.value;
  const color = riskColor(shown);
  return (
    <View style={{ marginBottom: 7 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
        <Text style={{ fontSize: 8, color: colors.muted }}>{p.label}</Text>
        <Text style={{ fontSize: 8.5, fontWeight: "bold", color }}>{p.value}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: colors.panelAlt, borderRadius: 2 }}>
        <View style={{ height: 4, width: `${Math.max(2, Math.min(100, p.value))}%`, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

export function Badge(p: { text: string; value?: number; color?: string }) {
  const color = p.color ?? (p.value != null ? riskColor(p.value) : colors.sky);
  const bg = p.value != null ? riskSoft(p.value) : colors.skySoft;
  return (
    <View style={{
      alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 7,
      backgroundColor: bg, borderRadius: 8, borderWidth: 1, borderColor: color,
    }}>
      <Text style={{ fontSize: 7.5, fontWeight: "bold", color }}>{p.text}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 8 }} />;
}

export function LabeledText(p: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 7 }}>
      <Text style={styles.labelSmall}>{p.label}</Text>
      <Text style={styles.bodyText}>{p.children}</Text>
    </View>
  );
}

export function BulletList(p: { items: string[] }) {
  return (
    <View>
      {p.items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 3 }}>
          <Text style={{ fontSize: 9.5, color: colors.muted, marginRight: 5 }}>•</Text>
          <Text style={{ fontSize: 9, color: colors.body, lineHeight: 1.4, flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Prosta tabela oparta na flex (react-pdf nie ma natywnego <table>) ─
export function SimpleTable(p: { columns: Array<{ key: string; label: string; width?: number }>; rows: Array<Record<string, string>> }) {
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", backgroundColor: colors.panelAlt, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {p.columns.map((c) => (
          <Text key={c.key} style={{ flex: c.width ?? 1, fontSize: 7.5, fontWeight: "bold", color: colors.muted, padding: 5, textTransform: "uppercase", letterSpacing: 0.4 }}>{c.label}</Text>
        ))}
      </View>
      {p.rows.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", borderBottomWidth: i === p.rows.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
          {p.columns.map((c) => (
            <Text key={c.key} style={{ flex: c.width ?? 1, fontSize: 8.5, color: colors.body, padding: 5, lineHeight: 1.35 }}>{row[c.key] ?? ""}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
