// Modül 2 Çıktı Motoru — Resmi Sınav Kağıdı (.docx), MEDEK Cevap Anahtarı & Rubrik (.docx)
// A4 PDF/Yazdır çıktısı ExamDocuments.tsx bileşenleriyle PrintHost üzerinden üretilir.

import { AlignmentType, BorderStyle, Paragraph, Table, TableRow, TextRun, WidthType } from "docx";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { Course, Exam, Institution } from "@/lib/types";
import { buildBooklet, correctAnswerText, type BookletType } from "@/lib/booklet";
import { buildBlueprint } from "@/lib/medekMath";
import { latexToPlain } from "@/lib/textTools";
import { bloomLabel, formatTrDate, OPTION_LETTERS, questionTypeLabel, round, safeFileName } from "@/lib/utils";
import {
  ALL_BORDERS,
  buildDocument,
  cell,
  FONT,
  gridTable,
  letterhead,
  para,
  PORTRAIT_WIDTH,
  runs,
  saveDocx,
  saveWorkbook,
  sectionTitle,
  signatureTable,
  simpleTable,
  spacer,
  type Block,
} from "./docxCommon";

function codeBlock(code: string): Table {
  return new Table({
    width: { size: PORTRAIT_WIDTH - 400, type: WidthType.DXA },
    columnWidths: [PORTRAIT_WIDTH - 400],
    borders: ALL_BORDERS,
    indent: { size: 400, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          cell(
            code.split("\n").map(
              (line) => new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: line || " ", font: "Courier New", size: 17 })] }),
            ),
            { shade: "F5F5F5" },
          ),
        ],
      }),
    ],
  });
}

function answerLines(n: number): Paragraph[] {
  return Array.from({ length: n }, () =>
    new Paragraph({
      spacing: { before: 120, after: 0 },
      indent: { left: 400 },
      border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "999999", space: 1 } },
      children: [new TextRun({ text: " ", size: 20 })],
    }),
  );
}

function examInfoBlock(course: Course, exam: Exam, total: number): Table {
  const w = [1900, 3400, 1700, 2638];
  const row = (a: string, b: string, c: string, d: string) =>
    new TableRow({
      children: [
        cell(a, { bold: true, shade: "F3F4F6", width: w[0], size: 9.5 }),
        cell(b, { width: w[1], size: 9.5 }),
        cell(c, { bold: true, shade: "F3F4F6", width: w[2], size: 9.5 }),
        cell(d, { width: w[3], size: 9.5 }),
      ],
    });
  return gridTable(
    [
      row("Ders", `${course.code} — ${course.name}`, "Tarih", formatTrDate(exam.date, true)),
      row("Öğretim Elemanı", course.instructor, "Saat / Süre", `${exam.startTime} · ${exam.durationMin} dk`),
      row("Adı Soyadı", "", "Öğrenci No", ""),
      row("İmza", "", "Toplam Puan", String(total)),
    ],
    w,
  );
}

function scoreTable(labels: string[], points: number[], total: number): Table {
  const n = labels.length + 1;
  const w = Math.floor(PORTRAIT_WIDTH / n);
  const widths = new Array(n).fill(w);
  return gridTable(
    [
      new TableRow({ children: [...labels, "TOPLAM"].map((l) => cell(l, { bold: true, shade: true, align: "center", size: 9 })) }),
      new TableRow({ children: [...points, total].map((p) => cell(`/${p}`, { align: "center", size: 8, color: "555555" })) }),
      new TableRow({ height: { value: 500, rule: "atLeast" }, children: widths.map(() => cell("", {})) }),
    ],
    widths,
  );
}

export function examPaperBlocks(inst: Institution, course: Course, exam: Exam, booklet: BookletType): Block[] {
  const items = buildBooklet(exam, booklet);
  const total = exam.questions.reduce((s, q) => s + q.points, 0);
  const blocks: Block[] = [
    ...letterhead(inst, exam.title, `${inst.academicYear} ${inst.semester} Yarıyılı · ${exam.examType}`, ["KİTAPÇIK TÜRÜ", `[ ${booklet} ]`]),
    examInfoBlock(course, exam, total),
    spacer(80),
  ];
  if (exam.instructions.trim()) {
    blocks.push(
      gridTable(
        [new TableRow({ children: [cell(`Sınav Kuralları: ${exam.instructions.split("\n").filter(Boolean).join(" • ")}`, { italics: true, size: 9 })] })],
        [PORTRAIT_WIDTH],
      ),
      spacer(120),
    );
  }
  items.forEach(({ number, question: q }) => {
    blocks.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        keepNext: true,
        children: [new TextRun({ text: `S${number}. `, bold: true, font: FONT, size: 22 }), ...runs(q.text), new TextRun({ text: `  (${q.points} Puan)`, bold: true, font: FONT, size: 22 })],
      }),
    );
    if (q.type === "mcq") {
      q.options.forEach((o, i) => blocks.push(para(`${OPTION_LETTERS[i]}) ${o.text}`, { indent: 400, spacingAfter: 20 })));
    }
    if (q.type === "truefalse") blocks.push(para("(   ) Doğru          (   ) Yanlış", { indent: 400 }));
    if (q.type === "code" && q.code) blocks.push(codeBlock(q.code));
    if (q.type === "latex" && q.latex) {
      blocks.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: latexToPlain(q.latex), font: "Cambria Math", size: 23 })] }));
    }
    if (q.answerLines > 0 && q.type !== "mcq" && q.type !== "truefalse") blocks.push(...answerLines(q.answerLines));
  });
  blocks.push(spacer(240), scoreTable(items.map((i) => `S${i.number}`), items.map((i) => i.question.points), total));
  blocks.push(
    spacer(120),
    para("Başarılar dilerim.", { size: 10, spacingAfter: 0 }),
    para(course.instructor, { size: 10, align: "right", spacingAfter: 0 }),
    para("Ders Sorumlusu", { size: 9, align: "right" }),
  );
  return blocks;
}

export async function exportExamDocx(inst: Institution, course: Course, exam: Exam, booklets: BookletType[]) {
  const doc = buildDocument(exam.title, booklets.map((b) => ({ children: examPaperBlocks(inst, course, exam, b), footer: `${course.code} ${exam.title} — Kitapçık ${b}` })));
  await saveDocx(doc, `${safeFileName(`${course.code}_${exam.title}_${booklets.join("")}_Kitapcik`)}.docx`);
}

export function blueprintBlocks(course: Course, exam: Exam): Block[] {
  const bp = buildBlueprint(exam, course);
  const ocCount = course.outcomes.length;
  const fixed = [9, 16, 14];
  const rest = 100 - fixed.reduce((a, b) => a + b, 0) - 9;
  const ocW = ocCount ? rest / ocCount : rest;
  const widths = [...fixed, ...course.outcomes.map(() => ocW), 9];
  const rows: (string | number)[][] = bp.rows.map((r) => [
    r.label,
    questionTypeLabel(r.question.type),
    bloomLabel(r.question.bloom),
    ...course.outcomes.map((o) => (r.cells[o.id] ? round(r.cells[o.id], 2) : "")),
    r.question.points,
  ]);
  rows.push(["", "", "ÖÇ Toplam", ...course.outcomes.map((o) => round(bp.totals[o.id] ?? 0, 2)), bp.totalPoints]);
  rows.push(["", "", "Ağırlık (%)", ...course.outcomes.map((o) => `%${round(bp.percents[o.id] ?? 0, 1)}`), "%100"]);
  return [
    simpleTable(["Soru", "Tip", "Bloom", ...course.outcomes.map((o) => o.code), "Puan"], rows, widths, PORTRAIT_WIDTH, {
      size: 9,
      alignCols: ["center", "left", "left", ...course.outcomes.map(() => "center" as const), "center"],
    }),
    ...(bp.uncovered.length
      ? [para(`Uyarı: ${course.outcomes.filter((o) => bp.uncovered.includes(o.id)).map((o) => o.code).join(", ")} bu sınavda ölçülmemektedir.`, { bold: true, size: 10, spacingBefore: 100 })]
      : []),
  ];
}

export async function exportAnswerKeyDocx(inst: Institution, course: Course, exam: Exam) {
  const a = buildBooklet(exam, "A");
  const b = buildBooklet(exam, "B");
  const letter = (x: (typeof a)[number]) => x.correctLetter ?? (x.question.type === "truefalse" ? (x.question.correctBool ? "D" : "Y") : "Rubrik");
  const page1: Block[] = [
    ...letterhead(inst, "Cevap Anahtarı ve MEDEK Puanlama Rubriği", `${course.code} ${course.name} — ${exam.title} (${formatTrDate(exam.date)})`, ["GİZLİDİR"]),
    sectionTitle("1. A / B Kitapçık Eşleştirme ve Doğru Cevaplar"),
    simpleTable(
      ["A No", "B No", "Tip", "Puan", "ÖÇ", "Bloom", "A Cevap", "B Cevap"],
      a.map((qa) => {
        const qb = b.find((x) => x.question.id === qa.question.id)!;
        return [
          `S${qa.number}`,
          `S${qb.number}`,
          questionTypeLabel(qa.question.type),
          qa.question.points,
          qa.question.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).filter(Boolean).join(", "),
          bloomLabel(qa.question.bloom),
          letter(qa),
          letter(qb),
        ];
      }),
      [8, 8, 17, 8, 15, 14, 15, 15],
      PORTRAIT_WIDTH,
      { size: 9, alignCols: ["center", "center", "left", "center", "left", "left", "center", "center"] },
    ),
    sectionTitle("2. Soru Bazlı Cevap Anahtarı ve Kısmi Puanlama Rubriği (A Kitapçığı Sırası)"),
  ];
  a.forEach((qa) => {
    const q = qa.question;
    page1.push(para(`S${qa.number}. (${q.points} Puan) — ${questionTypeLabel(q.type)} · ${bloomLabel(q.bloom)}`, { bold: true, spacingBefore: 140, keepNext: true }));
    page1.push(new Paragraph({ children: runs(q.text, { size: 10 }), spacing: { after: 60 }, keepNext: true }));
    if (q.type === "code") {
      page1.push(para("Beklenen Yanıt:", { bold: true, size: 10, keepNext: true }));
      page1.push(codeBlock(q.answerKey || "—"));
    } else {
      page1.push(para(`Beklenen Yanıt: ${correctAnswerText(qa)}`, { size: 10, keepNext: q.rubric.length > 0 }));
      if (q.answerKey && (q.type === "mcq" || q.type === "truefalse")) page1.push(para(q.answerKey, { size: 9.5, italics: true }));
    }
    if (q.rubric.length) {
      page1.push(simpleTable(["Puanlama Ölçütü", "Puan"], q.rubric.map((r) => [r.description, r.points]), [85, 15], PORTRAIT_WIDTH, { size: 9.5, alignCols: ["left", "center"] }));
    }
  });
  const page2: Block[] = [
    ...letterhead(inst, "Sınav Belirtke Tablosu (ÖÇ × Soru Matrisi)", `${course.code} ${course.name} — ${exam.title}`),
    ...blueprintBlocks(course, exam),
    sectionTitle("Öğrenme Çıktıları"),
    simpleTable(
      ["ÖÇ", "Öğrenme Çıktısı", "Sınav Ağırlığı"],
      course.outcomes.map((o) => [o.code, o.text, `%${round(buildBlueprint(exam, course).percents[o.id] ?? 0, 1)}`]),
      [10, 72, 18],
      PORTRAIT_WIDTH,
      { size: 9.5, alignCols: ["center", "left", "center"] },
    ),
    signatureTable([
      { title: "Ders Sorumlusu", name: course.instructor },
      { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment },
    ]),
  ];
  const doc = buildDocument(`${exam.title} Cevap Anahtarı`, [
    { children: page1, footer: `${course.code} — Cevap Anahtarı (GİZLİ)` },
    { children: page2, footer: `${course.code} — Belirtke Tablosu` },
  ]);
  await saveDocx(doc, `${safeFileName(`${course.code}_${exam.title}_Cevap_Anahtari_Rubrik`)}.docx`);
}

// ---------------------------------------------------------------------------
// Optik form cevap anahtarı (yalnız nesnel sorular: çoktan seçmeli + doğru/yanlış)
// ---------------------------------------------------------------------------

export function opticKeys(exam: Exam) {
  const make = (b: BookletType) =>
    buildBooklet(exam, b).map((bq) => ({
      no: bq.number,
      type: bq.question.type,
      answer: bq.question.type === "mcq" ? bq.correctLetter ?? "?" : bq.question.type === "truefalse" ? (bq.question.correctBool === undefined ? "?" : bq.question.correctBool ? "D" : "Y") : null,
      points: bq.question.points,
    }));
  return { A: make("A"), B: make("B") };
}

export function exportOpticKeyXlsx(course: Course, exam: Exam) {
  const keys = opticKeys(exam);
  const wb = XLSX.utils.book_new();
  const rows = keys.A.map((a, i) => {
    const b = keys.B[i];
    return [a.no, a.answer ?? "(klasik)", b.answer ?? "(klasik)", a.points];
  });
  const sheet = XLSX.utils.aoa_to_sheet([
    [`${course.code} ${course.name} — ${exam.title}`],
    ["Optik form cevap anahtarı. Klasik/açık uçlu sorular optik okumaya dahil değildir."],
    [],
    ["Sıra No", "A Kitapçığı", "B Kitapçığı", "Puan (A sırası)"],
    ...rows,
    [],
    ["A anahtar dizisi", keys.A.map((x) => x.answer).filter(Boolean).join("")],
    ["B anahtar dizisi", keys.B.map((x) => x.answer).filter(Boolean).join("")],
  ]);
  sheet["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, sheet, "Optik Anahtar");
  saveWorkbook(wb, `${safeFileName(`${course.code}_${exam.title}_Optik_Cevap_Anahtari`)}.xlsx`);
}

export function exportOpticKeyTxt(course: Course, exam: Exam) {
  const keys = opticKeys(exam);
  const line = (k: typeof keys.A) => k.filter((x) => x.answer).map((x) => x.answer).join("");
  const content = [
    `# ${course.code} ${exam.title} — optik cevap anahtarı (yalnız nesnel sorular)`,
    `A,${line(keys.A)}`,
    `B,${line(keys.B)}`,
    "",
  ].join("\r\n");
  saveAs(new Blob([content], { type: "text/plain;charset=utf-8" }), `${safeFileName(`${course.code}_${exam.title}_Optik_Anahtar`)}.txt`);
}
