import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles, colors, ReportHeader, ReportFooter, SectionHeading,
  BulletList, SimpleTable, LabeledText,
} from "./pdf-theme";
import { formatDatePl, WORKING_DOC_NOTE, type PdmReport, type ReportBlock } from "./model";

// ── Wspólny renderer PDF — z neutralnego PdmReport na dokument marki ───
// Reużywa prymitywy z pdf-theme.tsx (pasek marki, stopka, tabele, listy).

function Block(p: { block: ReportBlock }) {
  const b = p.block;
  switch (b.kind) {
    case "paragraph":
      return <Text style={{ ...styles.bodyText, marginBottom: 6 }}>{b.text}</Text>;
    case "bullets":
      return <View style={{ marginBottom: 6 }}><BulletList items={b.items} /></View>;
    case "labeled":
      return <LabeledText label={b.label}>{b.text}</LabeledText>;
    case "table":
      return <View style={{ marginBottom: 8 }}><SimpleTable columns={b.columns} rows={b.rows} /></View>;
    case "note":
      return (
        <Text style={{ fontSize: 8.5, color: colors.muted, fontStyle: "italic", marginBottom: 6 }}>{b.text}</Text>
      );
    default:
      return null;
  }
}

export function buildPdmReportDocument(r: PdmReport) {
  const metaLines = [formatDatePl(r.meta.generatedAt)];
  if (r.meta.wersjaZalozen != null) metaLines.push(`Założenia: wersja ${r.meta.wersjaZalozen}`);

  return (
    <Document title={r.meta.title} author="Political Dark Matter">
      <Page size="A4" style={styles.page}>
        <ReportHeader kicker={r.meta.kicker} title={r.meta.title} meta={metaLines.join("\n")} />
        <ReportFooter confidentialityNote={WORKING_DOC_NOTE} />

        {/* Kontekst sprawy */}
        {(r.meta.subtitle || r.meta.typ || r.meta.status) && (
          <View style={{ marginBottom: 10 }}>
            {r.meta.subtitle && <Text style={styles.h2}>{r.meta.subtitle}</Text>}
            {(r.meta.typ || r.meta.status) && (
              <Text style={styles.h2Subtitle}>
                {[r.meta.typ, r.meta.status].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>
        )}

        {/* Założenia strategiczne — konstytucja doklejona do każdego raportu */}
        {r.zalozenia.length > 0 && (
          <View style={styles.panel}>
            <Text style={styles.labelSmall}>Założenia strategiczne (konstytucja)</Text>
            {r.zalozenia.map((l, i) => (
              <LabeledText key={i} label={l.label}>{l.value}</LabeledText>
            ))}
          </View>
        )}

        {/* Sekcje merytoryczne */}
        {r.sections.map((s, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <SectionHeading title={s.heading} subtitle={s.subtitle} />
            <View style={{ marginTop: 4 }}>
              {s.blocks.map((b, j) => <Block key={j} block={b} />)}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
