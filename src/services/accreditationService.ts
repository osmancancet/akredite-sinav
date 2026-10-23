// Akreditasyon Kanıt Merkezi servisleri: çerçeve yükleme, şifreli ekler, uygulama belgeleri,
// kanıt paketi (ZIP), öz değerlendirme iskeleti (.docx) ve kanıt matrisi (.xlsx).

import JSZip from "jszip";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { TableRow } from "docx";
import type { VaultData } from "@/lib/types";
import type { ActiveFramework, CustomEvidence, EvidenceAttachment, Framework, FrameworkIndexEntry, FwCriterion } from "@/lib/accreditation/types";
import { STATUS_LABEL } from "@/lib/accreditation/types";
import { assessmentUnits, criterionEvidence, estimatedScore, matKey, progressOf, recKey, selfAssessment } from "@/lib/accreditation/progress";
import { bytesToHex, deleteBlob, readBlob, writeBlob } from "@/lib/cryptoVault";
import { computeAnalysis } from "@/lib/medekMath";
import { formatTrDate, num, safeFileName, uid } from "@/lib/utils";
import {
  buildDocument,
  cell,
  collectOutputs,
  gridTable,
  infoTable,
  letterhead,
  para,
  PORTRAIT_WIDTH,
  saveDocx,
  saveWorkbook,
  sectionTitle,
  signatureTable,
  simpleTable,
  type Block,
  type CollectedFile,
} from "./docxCommon";
import { exportAnswerKeyDocx, exportExamDocx, exportOpticKeyXlsx } from "./examExportService";
import { exportPukoDocx, exportProgramPanelDocx, downloadGradeTemplate } from "./medekExportService";
import { exportRubricDocx } from "./rubricExportService";
import { exportAttendanceDocx, exportDoorListDocx, exportEvidenceCoversDocx, pickEvidenceSamples } from "./seatingExportService";
import { exportCourseFile, exportCourseInfoDocx, exportOdrTablesDocx } from "./courseFileService";
import type { AppDocKind } from "@/lib/accreditation/matcher";
import { exportBoardDocx } from "./scheduleExportService";
import { BRAND } from "@/lib/brand";

// ---------------------------------------------------------------------------
// Çerçeve kataloğu
// ---------------------------------------------------------------------------

export async function loadFrameworkIndex(): Promise<FrameworkIndexEntry[]> {
  const res = await fetch("/frameworks/index.json");
  if (!res.ok) throw new Error("Akreditasyon kataloğu yüklenemedi.");
  return res.json();
}

export async function loadFramework(slug: string): Promise<Framework> {
  const res = await fetch(`/frameworks/${encodeURIComponent(slug)}.json`);
  if (!res.ok) throw new Error("Ölçüt dosyası yüklenemedi.");
  return res.json();
}

// ---------------------------------------------------------------------------
// Şifreli ekler
// ---------------------------------------------------------------------------

export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export async function storeAttachment(
  key: CryptoKey,
  file: { name: string; type: string; data: ArrayBuffer },
  origin: EvidenceAttachment["origin"],
  extra: { period?: string; submittedBy?: string; addedAt?: string } = {},
): Promise<EvidenceAttachment> {
  if (file.data.byteLength > MAX_ATTACHMENT_BYTES) throw new Error(`${file.name}: 50 MB sınırını aşıyor.`);
  const id = uid("ev");
  const sha256 = bytesToHex(await crypto.subtle.digest("SHA-256", file.data));
  await writeBlob(key, id, file.data);
  return {
    id,
    name: file.name,
    size: file.data.byteLength,
    mime: file.type || "application/octet-stream",
    sha256,
    addedAt: extra.addedAt ?? new Date().toISOString(),
    origin,
    ...(extra.period ? { period: extra.period } : {}),
    ...(extra.submittedBy ? { submittedBy: extra.submittedBy } : {}),
  };
}

/** "2025-2026" → ["2026-2027", "2025-2026", "2024-2025", "2023-2024"] (seçim listesi) */
export function academicYears(current: string): string[] {
  const m = current.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  const y = m ? Number(m[1]) : new Date().getFullYear();
  return [1, 0, -1, -2, -3].map((d) => `${y + d}-${y + d + 1}`);
}

export async function downloadAttachment(key: CryptoKey, a: EvidenceAttachment) {
  const data = await readBlob(key, a.id);
  if (!data) throw new Error("Dosya kasada bulunamadı.");
  saveAs(new Blob([data], { type: a.mime }), a.name);
}

export async function removeAttachment(a: EvidenceAttachment) {
  await deleteBlob(a.id);
}

// ---------------------------------------------------------------------------
// Uygulamanın ürettiği belgeler (kanıta tek tıkla eklenir)
// ---------------------------------------------------------------------------

export interface AppDocument {
  id: string;
  kind: AppDocKind;
  group: string;
  label: string;
  available: boolean;
  reason?: string;
  generate: () => Promise<CollectedFile[]>;
}

export function listAppDocuments(data: VaultData): AppDocument[] {
  const inst = data.institution;
  const out: AppDocument[] = [];
  const threshold = inst.targetThreshold || 60;
  data.courses.forEach((course) => {
    const g = `${course.code} ${course.name}`;
    const exams = data.exams.filter((e) => e.courseId === course.id);
    out.push(
      { id: `info-${course.id}`, kind: "courseInfo", group: g, label: "Ders bilgi formu (ÖÇ, ÖÇ–PÇ matrisi, ölçme araçları)", available: true, generate: () => collectOutputs(() => exportCourseInfoDocx(data, course.id)) },
      {
        id: `file-${course.id}`,
        kind: "courseFile",
        group: g,
        label: "Ders dosyası (.zip, tüm ölçme araçları)",
        available: exams.length > 0,
        reason: "Sınav yok",
        generate: () => collectOutputs(async () => void (await exportCourseFile(data, course.id))),
      },
    );
    exams.forEach((exam) => {
      const eg = `${course.code} — ${exam.title}`;
      const sheet = data.grades[exam.id];
      const plan = data.seating[exam.id];
      const hasGrades = (sheet?.rows.length ?? 0) > 0;
      out.push(
        { id: `exam-${exam.id}`, kind: "exam", group: eg, label: "Sınav kağıdı (A/B)", available: exam.questions.length > 0, reason: "Soru yok", generate: () => collectOutputs(() => exportExamDocx(inst, course, exam, ["A", "B"])) },
        { id: `key-${exam.id}`, kind: "answerKey", group: eg, label: "Cevap anahtarı, rubrik ve belirtke tablosu", available: exam.questions.length > 0, reason: "Soru yok", generate: () => collectOutputs(() => exportAnswerKeyDocx(inst, course, exam)) },
        {
          id: `optic-${exam.id}`,
          kind: "answerKey",
          group: eg,
          label: "Optik cevap anahtarı",
          available: exam.questions.some((q) => q.type === "mcq" || q.type === "truefalse"),
          reason: "Nesnel soru yok",
          generate: () => collectOutputs(() => exportOpticKeyXlsx(course, exam)),
        },
        {
          id: `puko-${exam.id}`,
          kind: "puko",
          group: eg,
          label: "ÖÇ/PÇ analizi, madde analizi ve PUKÖ raporu",
          available: hasGrades,
          reason: "Not girilmemiş",
          generate: () => collectOutputs(() => exportPukoDocx({ inst, course, exam, programOutcomes: data.programOutcomes, sheet: sheet!, analysis: computeAnalysis(exam, course, data.programOutcomes, sheet, threshold), threshold })),
        },
        {
          id: `grades-${exam.id}`,
          kind: "grades",
          group: eg,
          label: "Soru bazlı not çizelgesi",
          available: hasGrades,
          reason: "Not girilmemiş",
          generate: () => collectOutputs(() => downloadGradeTemplate(exam, course, sheet!.rows.map((r) => ({ no: r.studentNo, name: r.fullName, scores: r.scores })), "Not_Cizelgesi")),
        },
        {
          id: `covers-${exam.id}`,
          kind: "covers",
          group: eg,
          label: "En yüksek / orta / en düşük kağıt kapakları",
          available: hasGrades,
          reason: "Not girilmemiş",
          generate: () =>
            collectOutputs(() => {
              const picked = pickEvidenceSamples(exam, sheet);
              return exportEvidenceCoversDocx({ inst, course, exam }, picked.samples, picked.classMean, false);
            }),
        },
      );
      if (plan) {
        const ctx = { inst, course, exam, plan, students: data.students[course.id] ?? [], rooms: data.rooms, invigilators: data.invigilators, schedule: data.schedule };
        out.push(
          { id: `att-${exam.id}`, kind: "attendance", group: eg, label: "Sınav yoklama ve imza tutanağı", available: true, generate: () => collectOutputs(() => exportAttendanceDocx(ctx)) },
          { id: `door-${exam.id}`, kind: "attendance", group: eg, label: "Kapı listesi (KVKK maskeli)", available: true, generate: () => collectOutputs(() => exportDoorListDocx(ctx, true)) },
        );
      }
    });
  });
  data.rubrics.forEach((r) => {
    const course = data.courses.find((c) => c.id === r.courseId);
    out.push({ id: `rubric-${r.id}`, kind: "rubric", group: "Rubrikler", label: r.title, available: r.criteria.length > 0, reason: "Kriter yok", generate: () => collectOutputs(() => exportRubricDocx(inst, course, r)) });
  });
  out.push(
    { id: "program-panel", kind: "programPanel", group: "Program düzeyi", label: "Program çıktıları sağlanma raporu", available: data.courses.length > 0, reason: "Ders yok", generate: () => collectOutputs(() => exportProgramPanelDocx(data)) },
    { id: "odr-tables", kind: "odrTables", group: "Program düzeyi", label: "MEDEK ÖDR Tablo 5.1, 5.2, 6.1, 6.2 (ön doldurulmuş)", available: data.courses.length > 0, reason: "Ders yok", generate: () => collectOutputs(() => exportOdrTablesDocx(data)) },
    {
      id: "board",
      kind: "board",
      group: "Program düzeyi",
      label: "Sınav programı (ilan panosu)",
      available: data.schedule.entries.length > 0,
      reason: "Program boş",
      generate: () => collectOutputs(() => exportBoardDocx({ inst, schedule: data.schedule, courses: data.courses, rooms: data.rooms, invigilators: data.invigilators })),
    },
  );
  return out;
}

// ---------------------------------------------------------------------------
// Çıktılar
// ---------------------------------------------------------------------------

const ref = (fw: ActiveFramework, evidenceId: string) => `[${fw.snapshot.code}:${evidenceId}]`;

function kindLabel(kind: string, custom: boolean) {
  if (custom) return "Kurum ekledi";
  return kind === "explicit" ? "Kuruluşun örnek kanıtı" : "Ölçütten türetilmiş";
}

function isCustom(custom: CustomEvidence[] | undefined, id: string) {
  return !!custom?.some((c) => c.id === id);
}

/** Kanıt matrisi (.xlsx): her kanıt kalemi bir satır. */
export function exportEvidenceMatrix(data: VaultData, fw: ActiveFramework) {
  const ws = data.accreditation;
  const rows: (string | number)[][] = [];
  fw.snapshot.criteria.forEach((c) => {
    criterionEvidence(ws, fw, c).forEach((e) => {
      const r = ws.records[recKey(fw.slug, e.id)];
      rows.push([
        c.id,
        c.title,
        e.sub ?? "",
        e.id,
        e.title,
        kindLabel(e.kind, isCustom(ws.custom[fw.slug], e.id)),
        STATUS_LABEL[r?.status ?? "missing"],
        r?.owner ?? "",
        r?.due ? formatTrDate(r.due) : "",
        r?.attachments.length ?? 0,
        (r?.attachments ?? []).map((a) => `${a.name}${a.period ? ` [${a.period}]` : ""}${a.submittedBy ? ` (teslim: ${a.submittedBy})` : ""}`).join("; "),
        r?.note ?? "",
        e.source,
      ]);
    });
  });
  const sheet = XLSX.utils.aoa_to_sheet([
    [`${fw.snapshot.code} — ${fw.snapshot.name ?? ""}`, "", "", "", `Kapsam: ${fw.scopeLabel}`],
    [],
    ["Ölçüt", "Ölçüt adı", "Alt ölçüt", "Kanıt no", "Kanıt", "Tür", "Durum", "Sorumlu", "Son tarih", "Dosya", "Dosya adları", "Not", "Kaynak"],
    ...rows,
  ]);
  sheet["!cols"] = [8, 28, 9, 12, 60, 20, 13, 18, 11, 6, 40, 30, 50].map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: `A3:M${rows.length + 3}` };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Kanıt Matrisi");
  const p = progressOf(ws, fw);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Özet", ""],
      ["Toplam kanıt kalemi", p.total],
      ["Hazır", p.ready],
      ["Hazırlanıyor", p.inProgress],
      ["Eksik", p.missing],
      ["Uygulanamaz", p.na],
      ["Tamamlanma (%)", Number(p.pct.toFixed(1))],
      ["Ekli dosya", p.attachments],
    ]),
    "Özet",
  );
  const acts = ws.actions?.[fw.slug] ?? [];
  if (acts.length) {
    const aSheet = XLSX.utils.aoa_to_sheet([
      ["Ölçüt", "Satır / alt ölçüt", "Eylem", "Sorumlu", "Son tarih", "Durum", "Açılış", "Tamamlanma"],
      ...acts.map((a) => [a.criterionId, a.unitId ?? "", a.title, a.owner ?? "", a.due ? formatTrDate(a.due) : "", a.status === "done" ? "Tamamlandı" : "Açık", formatTrDate(a.createdAt.slice(0, 10)), a.doneAt ? formatTrDate(a.doneAt.slice(0, 10)) : ""]),
    ]);
    aSheet["!cols"] = [10, 12, 70, 20, 11, 11, 11, 11].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, aSheet, "İyileştirme Eylemleri");
  }
  const units = assessmentUnits(fw);
  if (units.length) {
    const scale = fw.snapshot.scale;
    const rowsSa = fw.snapshot.criteria.flatMap((c) =>
      (c.sub ?? []).flatMap((s) => {
        const items = s.rubric?.length ? s.rubric.map((r) => ({ id: r.id, text: r.statement, levels: r.levels })) : s.maturity ? [{ id: s.id, text: s.title ?? s.text, levels: s.maturity }] : [];
        return items.map((it) => {
          const v = ws.maturity[matKey(fw.slug, it.id)];
          return [c.id, it.id, it.text, v ?? "", v && scale?.[String(v)] ? scale[String(v)] : "", v ? (it.levels[String(v)] ?? "") : ""];
        });
      }),
    );
    const saSheet = XLSX.utils.aoa_to_sheet([["Ölçüt", "Kod", "İfade", "Düzey", "Ölçek", "Düzey tanımı"], ...rowsSa]);
    saSheet["!cols"] = [10, 9, 70, 7, 16, 70].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, saSheet, "Öz Değerlendirme");
  }
  saveWorkbook(wb, `${safeFileName(`${fw.snapshot.code}_Kanit_Matrisi`)}.xlsx`);
}

/** Öz değerlendirme / KİDR iskelet raporu (.docx) */
export async function exportSelfStudyDocx(data: VaultData, fw: ActiveFramework) {
  const ws = data.accreditation;
  const inst = data.institution;
  const p = progressOf(ws, fw);
  const est = estimatedScore(ws, fw);
  const docs = fw.snapshot.documents ?? [];
  const scale = fw.snapshot.scale;
  const sa = selfAssessment(ws, fw);
  const blocks: Block[] = [
    ...letterhead(inst, `${fw.snapshot.code} Öz Değerlendirme Çalışma Raporu`, `${fw.scopeLabel} · ${inst.academicYear} ${inst.semester}`, ["Çalışma taslağı"]),
    infoTable(
      [
        ["Akreditasyon kuruluşu", fw.snapshot.name ?? fw.snapshot.code],
        ["Kapsam", fw.scopeLabel],
        ["Ölçüt belgesi", docs.map((d) => `${d.title ?? ""} ${d.version ?? ""}`.trim()).filter(Boolean).join(" · ") || "—"],
        ["Kanıt durumu", `${p.ready} hazır / ${p.total - p.na} gerekli (%${num(p.pct, 1)}) · ${p.attachments} dosya`],
        ...(sa.rated ? ([["Öz değerlendirme ortalaması", `${num(sa.mean, 2)} / 5 — ${sa.rated}/${sa.total} rehber satırı`]] as [string, string][]) : []),
        ...(est ? ([["Tahmini puan (resmi değil)", `${num(est.score, 0)} / ${est.max} — ${est.rated}/${est.totalSubs} alt ölçüt değerlendirildi`]] as [string, string][]) : []),
      ],
      PORTRAIT_WIDTH,
      1,
    ),
    para(
      "Bu belge, ilgili akreditasyon kuruluşunun yayımladığı ölçütlere göre kanıt hazırlık durumunu gösteren bir çalışma taslağıdır; kuruluşun resmi öz değerlendirme raporu şablonunun yerine geçmez. Ölçüt metinleri kaynak belgelerden alınmıştır.",
      { size: 8.5, italics: true, spacingBefore: 120 },
    ),
  ];
  if (fw.snapshot.report?.sections?.length) {
    blocks.push(sectionTitle("Kuruluşun öz değerlendirme raporu bölümleri"));
    fw.snapshot.report.sections.forEach((s) => blocks.push(para(`• ${s}`, { size: 9.5, indent: 200, spacingAfter: 20 })));
  }
  let lastHeading = "";
  fw.snapshot.criteria.forEach((c: FwCriterion) => {
    if (c.heading && c.heading !== lastHeading) {
      blocks.push(para(c.heading, { bold: true, size: 13, spacingBefore: 320, keepNext: true }));
      lastHeading = c.heading;
    }
    const cp = progressOf(ws, fw, [c]);
    blocks.push(sectionTitle(`${c.id} ${c.title}${typeof c.points === "number" ? ` (${c.points} puan)` : ""} — %${num(cp.pct, 0)} hazır`));
    if (c.description) blocks.push(para(c.description, { size: 9.5, italics: true }));
    (c.sub ?? []).forEach((s) => {
      const lvl = ws.maturity[matKey(fw.slug, s.id)];
      blocks.push(para(`${s.id} ${s.title ?? ""}`.trim(), { bold: true, size: 10, spacingBefore: 120, keepNext: true }));
      blocks.push(para(s.text, { size: 9, align: "justify" }));
      if (s.maturity) {
        blocks.push(para(lvl ? `Öz değerlendirme olgunluk düzeyi: ${lvl} — ${s.maturity[String(lvl)] ?? ""}` : "Öz değerlendirme olgunluk düzeyi: belirlenmedi", { size: 9, bold: !!lvl }));
      }
      if (s.rubric?.length) {
        blocks.push(
          simpleTable(
            ["Rehber ifadesi", "Düzey", "Düzey tanımı"],
            s.rubric.map((r) => {
              const v = ws.maturity[matKey(fw.slug, r.id)];
              return [r.statement, v ? `${v}${scale?.[String(v)] ? ` (${scale[String(v)]})` : ""}` : "—", v ? (r.levels[String(v)] ?? "") : "Belirlenmedi"];
            }),
            [38, 14, 48],
            PORTRAIT_WIDTH,
            { size: 8.5 },
          ),
        );
      }
    });
    const ev = criterionEvidence(ws, fw, c);
    if (ev.length) {
      blocks.push(
        simpleTable(
          ["Atıf", "Kanıt", "Durum", "Dosyalar"],
          ev.map((e) => {
            const r = ws.records[recKey(fw.slug, e.id)];
            return [ref(fw, e.id), e.title, STATUS_LABEL[r?.status ?? "missing"], (r?.attachments ?? []).map((a) => a.name).join(", ") || "—"];
          }),
          [16, 50, 12, 22],
          PORTRAIT_WIDTH,
          { size: 8.5 },
        ),
      );
    }
    const cActs = (ws.actions?.[fw.slug] ?? []).filter((a) => a.criterionId === c.id);
    if (cActs.length) {
      blocks.push(para("İyileştirme eylemleri (PUKÖ):", { size: 9.5, bold: true, spacingBefore: 120, keepNext: true }));
      blocks.push(
        simpleTable(
          ["Eylem", "Sorumlu", "Son tarih", "Durum"],
          cActs.map((a) => [a.title, a.owner ?? "—", a.due ? formatTrDate(a.due) : "—", a.status === "done" ? `Tamamlandı${a.doneAt ? ` (${formatTrDate(a.doneAt.slice(0, 10))})` : ""}` : "Açık"]),
          [56, 18, 12, 14],
          PORTRAIT_WIDTH,
          { size: 8.5 },
        ),
      );
    }
    blocks.push(para("Değerlendirme (kurum tarafından doldurulacak):", { size: 9.5, bold: true, spacingBefore: 120 }));
    const notes = ev.map((e) => ws.records[recKey(fw.slug, e.id)]?.note).filter(Boolean) as string[];
    blocks.push(
      gridTable([new TableRow({ height: { value: 1200, rule: "atLeast" }, children: [cell(notes.length ? notes.map((n) => `• ${n}`).join("\n") : " ", { size: 9.5, vAlign: "top" })] })], [PORTRAIT_WIDTH]),
    );
  });
  blocks.push(signatureTable([{ title: "Kalite Komisyonu Başkanı" }, { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }]));
  const doc = buildDocument(`${fw.snapshot.code} Öz Değerlendirme Çalışma Raporu`, [{ children: blocks, footer: `${fw.snapshot.code} öz değerlendirme çalışma raporu — ${fw.scopeLabel}` }]);
  await saveDocx(doc, `${safeFileName(`${fw.snapshot.code}_Oz_Degerlendirme_Calisma_Raporu`)}.docx`);
}

/** Ölçüt yapısına göre klasörlenmiş, SHA-256 içindekili kanıt paketi */
export async function exportEvidencePackage(data: VaultData, fw: ActiveFramework, key: CryptoKey, onProgress?: (m: string) => void): Promise<{ files: number; missing: number }> {
  const ws = data.accreditation;
  const zip = new JSZip();
  const root = safeFileName(`${fw.snapshot.code}_Kanit_Paketi`);
  const folder = zip.folder(root)!;
  const lines: string[] = [
    `${data.institution.university} — ${data.institution.unitName}`,
    `AKREDİTASYON KANIT PAKETİ: ${fw.snapshot.code} — ${fw.snapshot.name ?? ""}`,
    `Kapsam: ${fw.scopeLabel}`,
    `Oluşturulma: ${new Date().toLocaleString("tr-TR")} (${BRAND.name}, tarayıcı içi)`,
    "",
    "Doğrulama: shasum -a 256 <dosya> (macOS/Linux) veya certutil -hashfile <dosya> SHA256 (Windows)",
    "",
  ];
  let files = 0;
  let missing = 0;
  for (const c of fw.snapshot.criteria) {
    const cDir = safeFileName(`${c.id}_${c.title}`).slice(0, 60);
    lines.push(`== ${c.id} ${c.title}`);
    for (const e of criterionEvidence(ws, fw, c)) {
      const r = ws.records[recKey(fw.slug, e.id)];
      const st = STATUS_LABEL[r?.status ?? "missing"];
      if (!r?.attachments.length) {
        if ((r?.status ?? "missing") !== "na") missing++;
        lines.push(`   [${st}] ${e.id} ${e.title} — dosya yok`);
        continue;
      }
      const eDir = `${cDir}/${safeFileName(`${e.id}_${e.title}`).slice(0, 70)}`;
      for (const a of r.attachments) {
        onProgress?.(a.name);
        const plain = await readBlob(key, a.id);
        if (!plain) continue;
        const base = safeFileName(a.name.replace(/\.[^.]+$/, "")).slice(0, 60) || "dosya";
        const ext = (a.name.match(/\.[A-Za-z0-9]{1,8}$/)?.[0] ?? "").toLowerCase();
        let name = base + ext;
        for (let n = 2; folder.file(`${eDir}/${name}`); n++) name = `${base}_${n}${ext}`;
        folder.file(`${eDir}/${name}`, plain);
        files++;
        const meta = [st, a.period, a.submittedBy && `teslim: ${a.submittedBy}`].filter(Boolean).join(" · ");
        lines.push(`   [${meta}] ${a.sha256}  ${eDir}/${name}`);
      }
    }
  }
  lines.push("", `Toplam ${files} dosya; dosyası olmayan gerekli kanıt kalemi: ${missing}.`);
  folder.file("ICINDEKILER.txt", lines.join("\r\n"));
  onProgress?.("ZIP paketleniyor");
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  saveAs(blob, `${root}.zip`);
  return { files, missing };
}
