import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, Footer, PageNumber, ShadingType, TabStopType,
} from "docx";
import { formatDatePl, WORKING_DOC_NOTE, type PdmReport, type ReportBlock } from "./model";

// ── Wspólny renderer DOCX — z tego samego PdmReport co PDF ─────────────
// Font Calibri (wymóg typograficzny projektu), polskie znaki, metka daty
// i wersji założeń, stopka z numeracją stron. Zwraca gotowy Buffer .docx.

const INK = "0F172A";
const BODY = "334155";
const MUTED = "64748B";
const FAINT = "94A3B8";
const BRAND = "070A13";
const BORDER = "E2E8F0";
const PANEL = "F8FAFC";
const SKY = "0369A1";

function heading(text: string, opts?: { size?: number; color?: string; spacingBefore?: number }): Paragraph {
  return new Paragraph({
    spacing: { before: opts?.spacingBefore ?? 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: opts?.size ?? 26, color: opts?.color ?? INK })],
  });
}

function blockParagraphs(b: ReportBlock): Paragraph[] {
  switch (b.kind) {
    case "paragraph":
      return [new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: b.text, size: 22, color: BODY })] })];
    case "bullets":
      return b.items.map((it) => new Paragraph({
        bullet: { level: 0 }, spacing: { after: 40 },
        children: [new TextRun({ text: it, size: 22, color: BODY })],
      }));
    case "labeled":
      return [new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `${b.label}: `, bold: true, size: 22, color: INK }),
          new TextRun({ text: b.text, size: 22, color: BODY }),
        ],
      })];
    case "note":
      return [new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: b.text, italics: true, size: 19, color: MUTED })] })];
    case "table":
      return [];
    default:
      return [];
  }
}

function buildTable(b: Extract<ReportBlock, { kind: "table" }>): Table {
  const cell = (text: string, header: boolean) => new TableCell({
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: PANEL } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: header ? 17 : 19, color: header ? MUTED : BODY })] })],
  });
  const rows: TableRow[] = [];
  rows.push(new TableRow({ tableHeader: true, children: b.columns.map((c) => cell(c.label.toUpperCase(), true)) }));
  for (const r of b.rows) rows.push(new TableRow({ children: b.columns.map((c) => cell(r[c.key] ?? "", false)) }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
      left: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
      right: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: BORDER },
    },
    rows,
  });
}

export async function renderReportDocx(r: PdmReport): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [];

  // Pasek marki / tytuł
  children.push(new Paragraph({
    spacing: { after: 20 },
    children: [new TextRun({ text: r.meta.kicker.toUpperCase(), bold: true, size: 15, color: SKY, characterSpacing: 30 })],
  }));
  children.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: r.meta.title, bold: true, size: 34, color: INK })],
  }));
  const metaBits = [formatDatePl(r.meta.generatedAt)];
  if (r.meta.wersjaZalozen != null) metaBits.push(`założenia: wersja ${r.meta.wersjaZalozen}`);
  children.push(new Paragraph({
    spacing: { after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER, space: 8 } },
    children: [new TextRun({ text: metaBits.join("  ·  "), size: 18, color: FAINT })],
  }));

  // Kontekst sprawy
  if (r.meta.subtitle) {
    children.push(new Paragraph({ spacing: { before: 60, after: 20 }, children: [new TextRun({ text: r.meta.subtitle, bold: true, size: 24, color: INK })] }));
  }
  if (r.meta.typ || r.meta.status) {
    children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: [r.meta.typ, r.meta.status].filter(Boolean).join(" · "), size: 19, color: MUTED })] }));
  }

  // Założenia strategiczne (konstytucja)
  if (r.zalozenia.length > 0) {
    children.push(heading("Założenia strategiczne (konstytucja)", { size: 20, color: SKY, spacingBefore: 120 }));
    for (const l of r.zalozenia) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: `${l.label}: `, bold: true, size: 21, color: INK }),
          new TextRun({ text: l.value, size: 21, color: BODY }),
        ],
      }));
    }
  }

  // Sekcje
  for (const s of r.sections) {
    children.push(heading(s.heading));
    if (s.subtitle) children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: s.subtitle, italics: true, size: 19, color: MUTED })] }));
    for (const b of s.blocks) {
      if (b.kind === "table") children.push(buildTable(b));
      else for (const p of blockParagraphs(b)) children.push(p);
    }
  }

  const doc = new Document({
    creator: "IMPACT CENTER",
    title: r.meta.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: BODY } } } },
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 6 } },
            children: [
              new TextRun({ text: WORKING_DOC_NOTE, size: 15, color: FAINT }),
              new TextRun({ text: "\tStrona ", size: 15, color: FAINT }),
              new TextRun({ children: [PageNumber.CURRENT], size: 15, color: FAINT }),
              new TextRun({ text: " / ", size: 15, color: FAINT }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: FAINT }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
