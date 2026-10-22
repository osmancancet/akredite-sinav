// Resmi üniversite antetli, düzenlenebilir Word (.docx) üretim altyapısı
// Tamamen tarayıcıda çalışır (docx + file-saver). Ağ erişimi gerektirmez.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type IParagraphOptions,
  type ISectionOptions,
} from "docx";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import type { Institution } from "@/lib/types";
import { trUpper } from "@/lib/utils";

export const FONT = "Times New Roman";
export const PORTRAIT_WIDTH = 9638; // A4 - 2×2cm kenar boşluğu (twip)
export const LANDSCAPE_WIDTH = 14570;
const MARGIN = 1134;

export type Block = Paragraph | Table;

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
export const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
export const ALL_BORDERS = { top: LINE, bottom: LINE, left: LINE, right: LINE, insideHorizontal: LINE, insideVertical: LINE };

export interface RunOpts {
  bold?: boolean;
  italics?: boolean;
  size?: number; // pt
  font?: string;
  color?: string;
  underline?: boolean;
}

/** **kalın** işaretlemesini TextRun dizisine çevirir; satır sonlarını korur. */
export function runs(text: string, opts: RunOpts = {}): TextRun[] {
  const out: TextRun[] = [];
  const lines = (text ?? "").split("\n");
  lines.forEach((line, li) => {
    line.split(/(\*\*[^*]+\*\*)/g).forEach((part, pi) => {
      if (!part) return;
      const isBold = part.startsWith("**") && part.endsWith("**");
      out.push(
        new TextRun({
          text: isBold ? part.slice(2, -2) : part,
          bold: opts.bold || isBold,
          italics: opts.italics,
          underline: isBold || opts.underline ? {} : undefined,
          size: (opts.size ?? 11) * 2,
          font: opts.font ?? FONT,
          color: opts.color,
          break: li > 0 && pi === 0 ? 1 : undefined,
        }),
      );
    });
    if (line === "" && li > 0) out.push(new TextRun({ text: "", break: 1 }));
  });
  return out;
}

export function para(
  text: string,
  opts: RunOpts & { align?: "left" | "center" | "right" | "justify"; spacingAfter?: number; spacingBefore?: number; indent?: number; keepNext?: boolean } = {},
): Paragraph {
  const align = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  }[opts.align ?? "left"];
  const options: IParagraphOptions = {
    children: runs(text, opts),
    alignment: align,
    spacing: { after: opts.spacingAfter ?? 80, before: opts.spacingBefore ?? 0 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    keepNext: opts.keepNext,
  };
  return new Paragraph(options);
}

export function sectionTitle(text: string): Paragraph {
  return para(trUpper(text), { bold: true, size: 11, spacingBefore: 200, spacingAfter: 80, keepNext: true });
}

export function spacer(after = 120): Paragraph {
  return new Paragraph({ children: [], spacing: { after } });
}

export interface CellOpts extends RunOpts {
  width?: number; // twip
  shade?: boolean | string;
  align?: "left" | "center" | "right";
  colSpan?: number;
  rowSpan?: number;
  vAlign?: "top" | "center" | "bottom";
  height?: number;
}

export function cell(content: string | Block[], opts: CellOpts = {}): TableCell {
  const align = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT }[opts.align ?? "left"];
  const children =
    typeof content === "string"
      ? [new Paragraph({ children: runs(content, { size: opts.size ?? 10, ...opts }), alignment: align, spacing: { after: 0 } })]
      : content;
  return new TableCell({
    children,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.colSpan,
    rowSpan: opts.rowSpan,
    verticalAlign: { top: VerticalAlign.TOP, center: VerticalAlign.CENTER, bottom: VerticalAlign.BOTTOM }[opts.vAlign ?? "center"],
    shading: opts.shade
      ? { type: ShadingType.CLEAR, color: "auto", fill: typeof opts.shade === "string" ? opts.shade : "E5E7EB" }
      : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  });
}

/** Basit tablo: başlık satırı + veri satırları. widths yüzde dizisi. */
export function simpleTable(
  header: string[],
  rows: (string | number)[][],
  widthsPct: number[],
  totalWidth = PORTRAIT_WIDTH,
  opts: { size?: number; alignCols?: ("left" | "center" | "right")[]; rowHeight?: number } = {},
): Table {
  const widths = widthsPct.map((p) => Math.round((p / 100) * totalWidth));
  const size = opts.size ?? 10;
  const headerRow = new TableRow({
    tableHeader: true,
    children: header.map((h, i) => cell(h, { bold: true, shade: true, align: "center", width: widths[i], size })),
  });
  const body = rows.map(
    (r) =>
      new TableRow({
        height: opts.rowHeight ? { value: opts.rowHeight, rule: "atLeast" } : undefined,
        cantSplit: true,
        children: r.map((v, i) => cell(String(v ?? ""), { width: widths[i], size, align: opts.alignCols?.[i] ?? "left" })),
      }),
  );
  return new Table({
    rows: [headerRow, ...body],
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    borders: ALL_BORDERS,
  });
}

export function gridTable(rows: TableRow[], widths: number[], borders = true): Table {
  return new Table({
    rows,
    width: { size: widths.reduce((s, w) => s + w, 0), type: WidthType.DXA },
    columnWidths: widths,
    borders: borders ? ALL_BORDERS : NO_BORDERS,
  });
}

function dataUrlToImage(dataUrl: string): { data: Uint8Array; type: "png" | "jpg" | "gif" | "bmp" } | null {
  const m = dataUrl.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  const t = m[1] === "jpeg" ? "jpg" : (m[1] as "png" | "jpg" | "gif" | "bmp");
  return { data, type: t };
}

/** Resmi antet bloğu: Logo | T.C. / Üniversite / Birim / Bölüm / Program | Sağ bilgi */
export function letterhead(
  inst: Institution,
  title?: string,
  subtitle?: string,
  rightLines: string[] = [],
  totalWidth = PORTRAIT_WIDTH,
): Block[] {
  const logoW = Math.round(totalWidth * 0.16);
  const rightW = Math.round(totalWidth * 0.2);
  const midW = totalWidth - logoW - rightW;
  const img = inst.logoDataUrl ? dataUrlToImage(inst.logoDataUrl) : null;
  const logoChildren = img
    ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: 70, height: 70 } })] })]
    : [para((inst.university || "Ü").charAt(0), { bold: true, size: 22, align: "center" })];
  const centerLines = [
    para("T.C.", { size: 11, align: "center", spacingAfter: 0 }),
    para(trUpper(inst.university || "Üniversite Adı"), { bold: true, size: 11.5, align: "center", spacingAfter: 0 }),
    para(trUpper(inst.unitName || "Birim Adı"), { bold: true, size: 11, align: "center", spacingAfter: 0 }),
    para(inst.department || "", { size: 10.5, align: "center", spacingAfter: 0 }),
    ...(inst.program ? [para(inst.program, { size: 10.5, align: "center", spacingAfter: 0 })] : []),
  ];
  const right = rightLines.length ? rightLines.map((l) => para(l, { size: 9, align: "right", spacingAfter: 0 })) : [para("", { size: 9 })];
  const head = new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: [logoW, midW, rightW],
    borders: { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: logoChildren, width: { size: logoW, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: NONE, left: NONE, right: NONE, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } } }),
          new TableCell({ children: centerLines, width: { size: midW, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: NONE, left: NONE, right: NONE, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } } }),
          new TableCell({ children: right, width: { size: rightW, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: NONE, left: NONE, right: NONE, bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } } }),
        ],
      }),
    ],
  });
  const blocks: Block[] = [head];
  if (title) blocks.push(para(trUpper(title), { bold: true, size: 12.5, align: "center", spacingBefore: 160, spacingAfter: subtitle ? 0 : 160 }));
  if (subtitle) blocks.push(para(subtitle, { size: 10.5, align: "center", spacingAfter: 160 }));
  return blocks;
}

/** Kenarlıksız imza tablosu */
export function signatureTable(items: { title: string; name?: string }[], totalWidth = PORTRAIT_WIDTH): Table {
  const w = Math.floor(totalWidth / items.length);
  return new Table({
    width: { size: w * items.length, type: WidthType.DXA },
    columnWidths: items.map(() => w),
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        cantSplit: true,
        children: items.map(
          (it) =>
            new TableCell({
              width: { size: w, type: WidthType.DXA },
              children: [
                para(it.title, { bold: true, size: 10, align: "center", spacingAfter: 0, spacingBefore: 240 }),
                para(it.name || " ", { size: 10, align: "center", spacingAfter: 360 }),
                para("İmza: ..............................", { size: 9, align: "center", spacingAfter: 0 }),
              ],
            }),
        ),
      }),
    ],
  });
}

/** İki sütunlu kenarlıklı bilgi tablosu (Etiket | Değer) */
export function infoTable(pairs: [string, string][], totalWidth = PORTRAIT_WIDTH, cols = 2): Table {
  const perRow = cols;
  const labelW = Math.round((totalWidth / perRow) * 0.4);
  const valW = Math.round(totalWidth / perRow) - labelW;
  const widths: number[] = [];
  for (let i = 0; i < perRow; i++) widths.push(labelW, valW);
  const rows: TableRow[] = [];
  for (let i = 0; i < pairs.length; i += perRow) {
    const chunk = pairs.slice(i, i + perRow);
    while (chunk.length < perRow) chunk.push(["", ""]);
    rows.push(
      new TableRow({
        children: chunk.flatMap(([k, v], j) => [
          cell(k, { bold: true, shade: "F3F4F6", width: widths[j * 2], size: 9.5 }),
          cell(v, { width: widths[j * 2 + 1], size: 9.5 }),
        ]),
      }),
    );
  }
  return gridTable(rows, widths);
}

export function footerFor(text: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${text}  •  Sayfa `, size: 16, font: FONT, color: "555555" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: "555555" }),
          new TextRun({ text: " / ", size: 16, font: FONT, color: "555555" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: FONT, color: "555555" }),
        ],
      }),
    ],
  });
}

export interface SectionSpec {
  children: Block[];
  landscape?: boolean;
  footer?: string;
}

export function buildDocument(title: string, sections: SectionSpec[]): Document {
  return new Document({
    creator: "AkrediteSınav",
    title,
    description: "AkrediteSınav — Zero-Knowledge akademik belge üreticisi",
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { line: 264 } } },
      },
    },
    sections: sections.map(
      (s): ISectionOptions => ({
        properties: {
          page: {
            size: s.landscape ? { orientation: PageOrientation.LANDSCAPE } : undefined,
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
          },
        },
        footers: s.footer ? { default: footerFor(s.footer) } : undefined,
        children: s.children,
      }),
    ),
  });
}

// ---------------------------------------------------------------------------
// Çıktı toplayıcı: aktifken belgeler indirilmek yerine bellekte toplanır
// (tek tık Kanıt Klasörü ZIP'i için). Toplayıcı yokken normal indirme yapılır.
// ---------------------------------------------------------------------------

export interface CollectedFile {
  fileName: string;
  blob: Blob;
}

let collector: CollectedFile[] | null = null;

export async function collectOutputs(fn: () => Promise<void> | void): Promise<CollectedFile[]> {
  const prev = collector;
  const bucket: CollectedFile[] = [];
  collector = bucket;
  try {
    await fn();
    return bucket;
  } finally {
    collector = prev;
  }
}

export async function saveDocx(doc: Document, fileName: string): Promise<void> {
  const blob = await Packer.toBlob(doc);
  const name = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
  if (collector) collector.push({ fileName: name, blob });
  else saveAs(blob, name);
}

export function saveWorkbook(wb: XLSX.WorkBook, fileName: string): void {
  if (collector) {
    const data = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    collector.push({ fileName, blob: new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }) });
  } else {
    XLSX.writeFile(wb, fileName);
  }
}

export function institutionLine(inst: Institution): string {
  return `${inst.academicYear} ${inst.semester} Yarıyılı`;
}
