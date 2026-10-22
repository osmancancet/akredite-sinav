// Modül 5 Çıktısı: Analitik Rubrik (Dereceli Puanlama Anahtarı) + Öğrenci Değerlendirme Formu (.docx, A4 yatay)

import { TableRow } from "docx";
import type { Course, Institution, Rubric } from "@/lib/types";
import { levelPointRange, RUBRIC_LEVELS, RUBRIC_TYPES } from "@/lib/rubricTemplates";
import { safeFileName } from "@/lib/utils";
import { buildDocument, cell, gridTable, infoTable, LANDSCAPE_WIDTH, letterhead, para, saveDocx, signatureTable, spacer, type Block } from "./docxCommon";

export function rubricTypeLabel(r: Rubric) {
  return RUBRIC_TYPES.find((t) => t.value === r.type)?.label ?? r.type;
}

function outcomeCodes(course: Course | undefined, ids: string[]) {
  return ids.map((id) => course?.outcomes.find((o) => o.id === id)?.code).filter(Boolean).join(", ") || "—";
}

export function rubricBlocks(inst: Institution, course: Course | undefined, r: Rubric): Block[] {
  const W = LANDSCAPE_WIDTH;
  const w = [Math.round(W * 0.17), Math.round(W * 0.07), Math.round(W * 0.07)];
  const lvW = Math.floor((W - w[0] - w[1] - w[2]) / 4);
  const widths = [...w, lvW, lvW, lvW, W - w[0] - w[1] - w[2] - lvW * 3];
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell("Değerlendirme Ölçütü", { bold: true, shade: true, align: "center", width: widths[0], size: 9.5 }),
      cell("ÖÇ", { bold: true, shade: true, align: "center", width: widths[1], size: 9.5 }),
      cell("Ağırlık", { bold: true, shade: true, align: "center", width: widths[2], size: 9.5 }),
      ...RUBRIC_LEVELS.map((l, i) => cell(`${l.label}\n(%${l.range[0]}–${l.range[1]})`, { bold: true, shade: ["FDE2E2", "FEF3C7", "DBEAFE", "DCFCE7"][i], align: "center", width: widths[3 + i], size: 9.5 })),
    ],
  });
  const rows = r.criteria.map(
    (c) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(c.name, { bold: true, width: widths[0], size: 9.5, vAlign: "top" }),
          cell(outcomeCodes(course, c.outcomeIds), { align: "center", width: widths[1], size: 9 }),
          cell(`${c.weight} p`, { align: "center", width: widths[2], size: 9.5, bold: true }),
          ...c.levels.map((t, i) => cell(`${t}\n[${levelPointRange(c.weight, i)} p]`, { width: widths[3 + i], size: 9, vAlign: "top" })),
        ],
      }),
  );
  const total = r.criteria.reduce((s, c) => s + c.weight, 0);
  rows.push(
    new TableRow({
      children: [
        cell("TOPLAM", { bold: true, shade: "F3F4F6", width: widths[0], size: 9.5 }),
        cell("", { shade: "F3F4F6", width: widths[1] }),
        cell(`${total} p`, { bold: true, shade: "F3F4F6", align: "center", width: widths[2], size: 9.5 }),
        cell("", { shade: "F3F4F6", width: widths[3] + widths[4] + widths[5] + widths[6], colSpan: 4 }),
      ],
    }),
  );

  return [
    ...letterhead(inst, r.title, `${rubricTypeLabel(r)} · ${course ? `${course.code} ${course.name}` : ""} · ${inst.academicYear} ${inst.semester}`, [`${inst.accreditationBody} uyumlu`], W),
    para(r.description, { size: 10, italics: true, spacingAfter: 120 }),
    gridTable([header, ...rows], widths),
    para(
      `Performans düzeyleri: ${RUBRIC_LEVELS.map((l) => `${l.label} (%${l.range[0]}–${l.range[1]})`).join(" · ")}. Her ölçüt için köşeli parantez içindeki puan aralığı kullanılır.`,
      { size: 8.5, spacingBefore: 80 },
    ),
    signatureTable([{ title: "Ders Sorumlusu", name: course?.instructor }, { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }], W),
  ];
}

export function formBlocks(inst: Institution, course: Course | undefined, r: Rubric): Block[] {
  const W = LANDSCAPE_WIDTH;
  const formW = [Math.round(W * 0.3), Math.round(W * 0.08), ...RUBRIC_LEVELS.map(() => Math.round(W * 0.1)), 0];
  formW[formW.length - 1] = W - formW.slice(0, -1).reduce((a, b) => a + b, 0);
  const total = r.criteria.reduce((s, c) => s + c.weight, 0);
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell("Ölçüt", { bold: true, shade: true, width: formW[0], size: 9.5 }),
        cell("Ağırlık", { bold: true, shade: true, align: "center", width: formW[1], size: 9.5 }),
        ...RUBRIC_LEVELS.map((l, i) => cell(l.label, { bold: true, shade: true, align: "center", width: formW[2 + i], size: 9.5 })),
        cell("Verilen Puan", { bold: true, shade: true, align: "center", width: formW[6], size: 9.5 }),
      ],
    }),
    ...r.criteria.map(
      (c) =>
        new TableRow({
          height: { value: 440, rule: "atLeast" },
          children: [
            cell(c.name, { width: formW[0], size: 9.5 }),
            cell(String(c.weight), { align: "center", width: formW[1], size: 9.5 }),
            ...RUBRIC_LEVELS.map((_, i) => cell(`☐ ${levelPointRange(c.weight, i)}`, { align: "center", width: formW[2 + i], size: 9 })),
            cell("", { width: formW[6] }),
          ],
        }),
    ),
    new TableRow({
      height: { value: 440, rule: "atLeast" },
      children: [
        cell("TOPLAM PUAN", { bold: true, width: formW[0], size: 10 }),
        cell(String(total), { bold: true, align: "center", width: formW[1], size: 10 }),
        cell("", { width: formW[2] + formW[3] + formW[4] + formW[5], colSpan: 4 }),
        cell("", { width: formW[6] }),
      ],
    }),
  ];
  return [
    ...letterhead(inst, `${rubricTypeLabel(r)} Öğrenci Değerlendirme Formu`, r.title, [], W),
    infoTable(
      [
        ["Öğrenci No", ""],
        ["Adı Soyadı", ""],
        ["Ders", course ? `${course.code} ${course.name}` : ""],
        ["Değerlendirme Tarihi", "....../....../20......"],
        ...(r.type === "isyeri" ? ([["İşletme Adı", ""], ["İşletme Eğitim Sorumlusu", ""]] as [string, string][]) : []),
        ...(r.type === "laboratuvar" ? ([["Föy / Deney No", ""], ["Laboratuvar", ""]] as [string, string][]) : []),
      ],
      W,
      2,
    ),
    spacer(120),
    gridTable(rows, formW),
    para("Değerlendiren Görüşü:", { bold: true, size: 10, spacingBefore: 160 }),
    para("........................................................................................................................................................................................................................", { size: 10 }),
    signatureTable(
      r.type === "isyeri"
        ? [{ title: "İşletme Eğitim Sorumlusu" }, { title: "Akademik Danışman", name: course?.instructor }]
        : [{ title: "Değerlendiren Öğretim Elemanı", name: course?.instructor }],
      W,
    ),
  ];
}

export async function exportRubricDocx(inst: Institution, course: Course | undefined, r: Rubric) {
  const doc = buildDocument(r.title, [
    { children: rubricBlocks(inst, course, r), landscape: true, footer: `${r.title}` },
    { children: formBlocks(inst, course, r), landscape: true, footer: `${rubricTypeLabel(r)} Değerlendirme Formu` },
  ]);
  await saveDocx(doc, `${safeFileName(`${course?.code ?? "Rubrik"}_${r.title}`).slice(0, 90)}.docx`);
}
