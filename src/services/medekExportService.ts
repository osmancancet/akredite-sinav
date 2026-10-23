// Modül 6 Çıktıları: MEDEK / YÖKAK Dönem Sonu Ders Değerlendirme ve PUKÖ Raporu (.docx),
// soru bazlı not Excel şablonu indirme/yükleme.

import * as XLSX from "xlsx";
import type { Course, Exam, GradeRow, GradeSheet, Institution, ProgramOutcome, PukoEntry } from "@/lib/types";
import { scaleLabel, suggestPuko, type Analysis } from "@/lib/medekMath";
import { analyzeItems, decisionLabel } from "@/lib/itemAnalysis";
import { computeProgramPanel } from "@/lib/programPanel";
import type { VaultData } from "@/lib/types";
import { bloomLabel, clamp, formatTrDate, safeFileName, uid, num, fixed } from "@/lib/utils";
import { buildDocument, infoTable, LANDSCAPE_WIDTH, letterhead, para, PORTRAIT_WIDTH, saveDocx, saveWorkbook, sectionTitle, signatureTable, simpleTable, type Block } from "./docxCommon";

export interface PukoCtx {
  inst: Institution;
  course: Course;
  exam: Exam;
  programOutcomes: ProgramOutcome[];
  sheet: GradeSheet;
  analysis: Analysis;
  threshold: number;
}

export function resolvePuko(ctx: PukoCtx): PukoEntry[] {
  return ctx.analysis.outcomeStats
    .filter((o) => o.flagged)
    .map((o) => ctx.sheet.puko[o.outcomeId] ?? suggestPuko(o, ctx.exam, ctx.analysis, ctx.threshold));
}

const pct = (v: number | null) => (v === null ? "—" : `%${num(v, 1)}`);
const s5 = (v: number | null) => (v === null ? "—" : fixed(v, 2));

export function pukoBlocks(ctx: PukoCtx): Block[] {
  const { inst, course, exam, analysis, threshold, programOutcomes } = ctx;
  const st = analysis.stats;
  const blocks: Block[] = [
    ...letterhead(inst, "Dönem Sonu Ders Değerlendirme ve PUKÖ Raporu", `${inst.accreditationBody} / YÖKAK Sürekli İyileştirme Kanıtı — ${inst.academicYear} ${inst.semester} Yarıyılı`),
    sectionTitle("1. Ders ve Ölçme Aracı Bilgileri"),
    infoTable([
      ["Ders Kodu / Adı", `${course.code} — ${course.name}`],
      ["Öğretim Elemanı", course.instructor],
      ["Sınıf / Kredi / AKTS", `${course.classYear}. sınıf · ${course.credit} / ${course.ects}`],
      ["Ölçme Aracı", `${exam.title} (${exam.examType}) — ${formatTrDate(exam.date)}`],
      ["Değerlendirilen Öğrenci", String(st.n)],
      ["Hedef Eşik Değer", `%${threshold}`],
    ]),
    sectionTitle("2. Sınav İstatistikleri"),
    simpleTable(
      ["Ortalama", "Medyan", "Std. Sapma", "En Yüksek", "En Düşük", "Başarı Oranı (≥%50)"],
      [[num(st.mean, 2), num(st.median, 2), num(st.sd, 2), num(st.max, 1), num(st.min, 1), `%${num(st.passRate, 1)}`]],
      [16, 16, 16, 16, 16, 20],
      PORTRAIT_WIDTH,
      { alignCols: ["center", "center", "center", "center", "center", "center"] },
    ),
    sectionTitle("3. Soru Bazlı Başarı Analizi"),
    simpleTable(
      ["Soru", "Bloom", "ÖÇ", "Maks. Puan", "Ortalama", "Başarı %"],
      analysis.questionStats.map((q) => [
        q.label,
        bloomLabel(q.bloom),
        q.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).filter(Boolean).join(", "),
        q.maxPoints,
        num(q.avg, 2),
        `%${num(q.pct, 1)}`,
      ]),
      [10, 18, 22, 16, 16, 18],
      PORTRAIT_WIDTH,
      { alignCols: ["center", "left", "left", "center", "center", "center"] },
    ),
    sectionTitle("4. Öğrenme Çıktısı (ÖÇ) Gerçekleşme Düzeyleri"),
    para("Başarı(ÖÇ_k)% = Σ(i∈Q_k) X_i / Σ(i∈Q_k) P_i × 100  —  X_i: i. sorunun sınıf ortalaması, P_i: maksimum puanı.", { size: 9, italics: true }),
    simpleTable(
      ["ÖÇ", "Öğrenme Çıktısı", "Sorular", "Σ Ort / Σ Maks", "Başarı %", "5'lik", "Durum"],
      analysis.outcomeStats.map((o) => [
        o.code,
        o.text,
        o.questionLabels.join(", ") || "—",
        `${num(o.sumAvg, 1)} / ${o.sumMax}`,
        pct(o.pct),
        s5(o.scale5),
        o.pct === null ? "Ölçülmedi" : o.flagged ? "İYİLEŞTİRME GEREKLİ" : scaleLabel(o.pct),
      ]),
      [7, 37, 11, 13, 10, 8, 14],
      PORTRAIT_WIDTH,
      { size: 9, alignCols: ["center", "left", "center", "center", "center", "center", "center"] },
    ),
    sectionTitle("5. ÖÇ – PÇ İlişki Matrisi (0: İlişkisiz – 5: Çok Yüksek Katkı)"),
    simpleTable(
      ["ÖÇ", ...programOutcomes.map((p) => p.code.replace("PÇ-", "P"))],
      course.outcomes.map((o) => [o.code, ...programOutcomes.map((_, j) => course.ocPcMatrix[o.id]?.[j] ?? 0)]),
      [10, ...programOutcomes.map(() => 90 / Math.max(1, programOutcomes.length))],
      PORTRAIT_WIDTH,
      { size: 8.5, alignCols: ["center", ...programOutcomes.map(() => "center" as const)] },
    ),
    sectionTitle("6. Program Çıktısı (PÇ) Sağlanma Oranları"),
    para("Başarı(PÇ_j)% = Σ_k Başarı(ÖÇ_k)% × W_kj / Σ_k W_kj", { size: 9, italics: true }),
    simpleTable(
      ["PÇ", "Program Çıktısı", "Σ Ağırlık", "Sağlanma %", "5'lik", "Durum"],
      analysis.poStats.map((p) => [p.code, p.text, p.weightSum, pct(p.pct), s5(p.scale5), p.pct === null ? "Katkı yok" : p.flagged ? "Eşik altı" : scaleLabel(p.pct)]),
      [8, 50, 10, 12, 8, 12],
      PORTRAIT_WIDTH,
      { size: 9, alignCols: ["center", "left", "center", "center", "center", "center"] },
    ),
  ];

  const ia = analyzeItems(exam, ctx.sheet);
  if (ia.test.n >= 5) {
    blocks.push(sectionTitle("7. Madde (Soru) Analizi"));
    blocks.push(
      para(
        `Cronbach α = ${ia.test.alpha === null ? "—" : fixed(ia.test.alpha, 2)} (${ia.test.reliability}) · Ölçmenin standart hatası = ${ia.test.sem === null ? "—" : `±${num(ia.test.sem, 1)}`} puan · Ortalama güçlük p = ${fixed(ia.test.meanP, 2)} · Ortalama ayırt edicilik D = ${fixed(ia.test.meanD, 2)} (üst/alt %27 = ${ia.test.groupSize} öğrenci).`,
        { size: 9.5 },
      ),
    );
    blocks.push(
      simpleTable(
        ["Soru", "p", "Güçlük", "D", "Ayırt edicilik", "r", "α (çıkarılırsa)", "Karar"],
        ia.items.map((i) => [i.label, fixed(i.p, 2), i.difficulty, fixed(i.D, 2), i.discrimination, i.r === null ? "—" : fixed(i.r, 2), i.alphaIfDeleted === null ? "—" : fixed(i.alphaIfDeleted, 2), decisionLabel(i.decision)]),
        [8, 8, 13, 8, 16, 8, 16, 23],
        PORTRAIT_WIDTH,
        { size: 9, alignCols: ["center", "center", "left", "center", "left", "center", "center", "left"] },
      ),
    );
    blocks.push(para("Ebel ölçütleri: D ≥ 0,40 çok iyi; 0,30–0,39 iyi; 0,20–0,29 düzeltilmeli; < 0,20 zayıf. r: düzeltilmiş madde-toplam korelasyonu.", { size: 8.5, italics: true }));
  }

  const entries = resolvePuko(ctx);
  blocks.push(sectionTitle(`8. Sürekli İyileştirme (PUKÖ) Eylem Planı — Eşik: %${threshold}`));
  if (!entries.length) {
    blocks.push(para(`Tüm öğrenme çıktıları hedef eşik değerin (%${threshold}) üzerinde gerçekleşmiştir. Mevcut öğretim stratejilerinin sürdürülmesi önerilmektedir.`, { size: 10 }));
  }
  entries.forEach((e) => {
    const o = analysis.outcomeStats.find((x) => x.outcomeId === e.outcomeId)!;
    blocks.push(para(`${o.code} — ${o.text} (Gerçekleşme: ${pct(o.pct)})`, { bold: true, size: 10, spacingBefore: 120, keepNext: true }));
    blocks.push(
      simpleTable(
        ["Aşama", "Açıklama"],
        [
          ["Kök Neden Analizi", e.rootCause],
          ["P — Planla", e.plan],
          ["U — Uygula", e.doAction],
          ["K — Kontrol Et", e.check],
          ["Ö — Önlem Al", e.act],
        ],
        [20, 80],
        PORTRAIT_WIDTH,
        { size: 9.5 },
      ),
    );
  });
  blocks.push(sectionTitle("9. Genel Değerlendirme"));
  blocks.push(para(ctx.sheet.generalEvaluation || "—", { size: 10, align: "justify" }));
  blocks.push(
    signatureTable([
      { title: "Ders Sorumlusu", name: course.instructor },
      { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment },
      { title: "Bölüm Kalite Komisyonu", name: "" },
    ]),
  );
  return blocks;
}

export async function exportPukoDocx(ctx: PukoCtx) {
  const doc = buildDocument("PUKÖ Raporu", [{ children: pukoBlocks(ctx), footer: `${ctx.course.code} — ${ctx.inst.accreditationBody} PUKÖ Raporu` }]);
  await saveDocx(doc, `${safeFileName(`${ctx.course.code}_${ctx.exam.title}_PUKO_Raporu`)}.docx`);
}

// ---------------------------------------------------------------------------
// Not Excel şablonu
// ---------------------------------------------------------------------------

export function downloadGradeTemplate(exam: Exam, course: Course, rows: { no: string; name: string; scores?: Record<string, number | null> }[], fileTitle = "Not_Sablonu") {
  const header = ["Öğrenci No", "Adı Soyadı", ...exam.questions.map((q, i) => `S${i + 1} (${q.points})`), "Toplam"];
  const maxRow = ["MAKS. PUAN", "", ...exam.questions.map((q) => q.points), exam.questions.reduce((s, q) => s + q.points, 0)];
  const body = rows.map((r, ri) => {
    const rowNo = ri + 3;
    const lastCol = XLSX.utils.encode_col(1 + exam.questions.length);
    return [
      r.no,
      r.name,
      ...exam.questions.map((q) => r.scores?.[q.id] ?? ""),
      exam.questions.length ? { f: `SUM(C${rowNo}:${lastCol}${rowNo})` } : 0,
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, maxRow, ...body]);
  ws["!cols"] = [{ wch: 14 }, { wch: 26 }, ...exam.questions.map(() => ({ wch: 9 })), { wch: 9 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Notlar");
  const info = XLSX.utils.aoa_to_sheet([
    ["Ders", `${course.code} ${course.name}`],
    ["Sınav", exam.title],
    ...exam.questions.map((q, i) => [`S${i + 1}`, `${q.points} puan · ${q.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).join(", ")} · ${bloomLabel(q.bloom)}`]),
  ]);
  XLSX.utils.book_append_sheet(wb, info, "Soru Bilgisi");
  saveWorkbook(wb, `${safeFileName(`${course.code}_${exam.title}_${fileTitle}`)}.xlsx`);
}

export async function readGradeFile(file: File, exam: Exam): Promise<GradeRow[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets["Notlar"] ?? wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
  const headerIdx = rows.findIndex((r) => r.some((c) => /öğrenci no|ogrenci no|numara/i.test(String(c))));
  if (headerIdx < 0) throw new Error('"Öğrenci No" başlık satırı bulunamadı. Lütfen şablonu kullanın.');
  const header = rows[headerIdx].map((c) => String(c));
  const noCol = header.findIndex((h) => /öğrenci no|ogrenci no|numara/i.test(h));
  const nameCol = header.findIndex((h) => /ad/i.test(h) && !/no/i.test(h));
  const qCols = exam.questions.map((_, i) => header.findIndex((h) => new RegExp(`^S${i + 1}(\\b|\\s|\\()`, "i").test(h.trim())));
  const out: GradeRow[] = [];
  rows.slice(headerIdx + 1).forEach((r) => {
    const no = String(r[noCol] ?? "").trim();
    if (!/\d{3,}/.test(no)) return;
    const scores: Record<string, number | null> = {};
    exam.questions.forEach((q, i) => {
      const c = qCols[i];
      const raw = c >= 0 ? r[c] : "";
      const v = raw === "" || raw === null ? null : Number(String(raw).replace(",", "."));
      scores[q.id] = v === null || Number.isNaN(v) ? null : clamp(v, 0, q.points);
    });
    out.push({ id: uid("gr"), studentNo: no, fullName: nameCol >= 0 ? String(r[nameCol] ?? "").trim() : "", scores });
  });
  if (!out.length) throw new Error("Dosyada not satırı bulunamadı.");
  return out;
}

// ---------------------------------------------------------------------------
// Program Çıktıları Sağlanma Raporu (öz değerlendirme eki)
// ---------------------------------------------------------------------------

export async function exportProgramPanelDocx(data: VaultData) {
  const { rows, summary, threshold } = computeProgramPanel(data);
  const inst = data.institution;
  const pos = data.programOutcomes;
  const W = LANDSCAPE_WIDTH;
  const poW = (100 - 26) / Math.max(1, pos.length);
  const fmt = (v: number | null, planned: number) => (v === null ? (planned ? "?" : "—") : `${v < threshold ? "▼" : ""}${Math.round(v)}`);
  const children: Block[] = [
    ...letterhead(inst, "Program Çıktıları Sağlanma Raporu", `${inst.department} — ${inst.program} · ${inst.academicYear} ${inst.semester} Yarıyılı`, [`${inst.accreditationBody} öz değerlendirme eki`], W),
    sectionTitle("1. Program Düzeyi Özet"),
    simpleTable(
      ["PÇ", "Program Çıktısı", "Destekleyen Ders", "Ölçülen Ders", "Sağlanma %", "Durum"],
      summary.map((s) => [
        s.po.code,
        s.po.text,
        s.supportingCourses,
        s.measuredCourses,
        s.pct === null ? "—" : `%${num(s.pct, 1)}`,
        s.uncovered ? "DESTEKLENMİYOR" : s.pct === null ? "Ölçülmedi" : s.flagged ? "EŞİK ALTI" : "Hedefte",
      ]),
      [6, 52, 10, 10, 10, 12],
      W,
      { size: 9, alignCols: ["center", "left", "center", "center", "center", "center"] },
    ),
    para(`Program düzeyi sağlanma = Σ (ders PÇ% × dersin PÇ'ye toplam matris ağırlığı) / Σ ağırlık. Hedef eşik %${threshold}.`, { size: 8.5, italics: true }),
    sectionTitle("2. Dersler × PÇ — Gerçekleşen Başarı (%)"),
    simpleTable(
      ["Ders", ...pos.map((p) => p.code.replace("PÇ-", "P"))],
      rows.map((r) => [`${r.course.code} ${r.course.name}`, ...pos.map((_, j) => fmt(r.achieved[j], r.planned[j]))]),
      [26, ...pos.map(() => poW)],
      W,
      { size: 8.5, alignCols: ["left", ...pos.map(() => "center" as const)] },
    ),
    para("▼: hedef eşik altı · ?: katkı planlı, henüz ölçülmedi · —: katkı yok", { size: 8.5, italics: true }),
    sectionTitle("3. Dersler × PÇ — Planlanan Katkı (Σ ÖÇ-PÇ ağırlığı)"),
    simpleTable(
      ["Ders", ...pos.map((p) => p.code.replace("PÇ-", "P"))],
      rows.map((r) => [`${r.course.code} ${r.course.name}`, ...r.planned.map((v) => (v ? String(v) : "—"))]),
      [26, ...pos.map(() => poW)],
      W,
      { size: 8.5, alignCols: ["left", ...pos.map(() => "center" as const)] },
    ),
    signatureTable([{ title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }, { title: "Bölüm Kalite Komisyonu Başkanı" }], W),
  ];
  const doc = buildDocument("Program Çıktıları Sağlanma Raporu", [{ children, landscape: true, footer: `${inst.department} — Program Çıktıları Sağlanma Raporu` }]);
  await saveDocx(doc, `${safeFileName(`${inst.department}_PC_Saglanma_Raporu`)}.docx`);
}
