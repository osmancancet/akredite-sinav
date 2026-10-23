// Ders dosyası (ders başına bütün ölçme-değerlendirme kanıtları), ders bilgi formu ve MEDEK ÖDR tabloları.

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { VaultData } from "@/lib/types";
import { computeAnalysis } from "@/lib/medekMath";
import { bytesToHex } from "@/lib/cryptoVault";
import { BRAND } from "@/lib/brand";
import { formatTrDate, num, safeFileName } from "@/lib/utils";
import { ODR_SOURCE, T51_HEADER, T52_HEADER, T61_HEADER, T62_HEADER, table51, table52, table61, table62 } from "@/lib/accreditation/odrTables";
import {
  buildDocument,
  collectOutputs,
  infoTable,
  LANDSCAPE_WIDTH,
  letterhead,
  para,
  PORTRAIT_WIDTH,
  pushCollected,
  saveDocx,
  sectionTitle,
  signatureTable,
  simpleTable,
  type Block,
} from "./docxCommon";
import { addExamDocuments } from "./evidencePackService";
import { exportRubricDocx } from "./rubricExportService";

const EXAM_TYPE_ORDER = (t: string) => ["Kısa Sınav", "Ara Sınav", "Vize", "Proje", "Ödev", "Final", "Bütünleme"].indexOf(t);

/** Ders bilgi formu: ders künyesi, öğrenme çıktıları, ÖÇ–PÇ matrisi ve ölçme araçlarının ÖÇ kapsamı */
export async function exportCourseInfoDocx(data: VaultData, courseId: string) {
  const course = data.courses.find((c) => c.id === courseId);
  if (!course) throw new Error("Ders bulunamadı.");
  const inst = data.institution;
  const pcs = data.programOutcomes;
  const exams = data.exams.filter((e) => e.courseId === course.id).sort((a, b) => a.date.localeCompare(b.date) || EXAM_TYPE_ORDER(a.examType) - EXAM_TYPE_ORDER(b.examType));
  const threshold = inst.targetThreshold || 60;
  const students = data.students[course.id]?.length || course.studentCount;

  const blocks: Block[] = [
    ...letterhead(inst, "Ders Bilgi Formu", `${inst.academicYear} ${inst.semester} yarıyılı`),
    infoTable(
      [
        ["Ders kodu", course.code],
        ["Ders adı", course.name],
        ["Sınıf / yarıyıl", `${course.classYear}. sınıf / ${course.semesterNo}. yarıyıl`],
        ["Kredi / AKTS", `${course.credit} / ${course.ects}`],
        ["Öğretim elemanı", course.instructor],
        ["Öğrenci sayısı", students ? String(students) : "—"],
      ],
      PORTRAIT_WIDTH,
      2,
    ),
    sectionTitle("Dersin öğrenme çıktıları"),
    course.outcomes.length
      ? simpleTable(["Kod", "Öğrenme çıktısı"], course.outcomes.map((o) => [o.code, o.text]), [12, 88], PORTRAIT_WIDTH, { size: 9.5 })
      : para("Bu ders için öğrenme çıktısı tanımlanmamış.", { size: 9.5, italics: true }),
  ];

  if (course.outcomes.length && pcs.length) {
    blocks.push(sectionTitle("Öğrenme çıktıları – program çıktıları ilişki matrisi (0–5)"));
    const w = Math.max(4, Math.floor(80 / pcs.length));
    blocks.push(
      simpleTable(
        ["ÖÇ", ...pcs.map((p) => p.code.replace(/^PÇ-?/, "PÇ"))],
        course.outcomes.map((o) => [o.code, ...pcs.map((_, i) => String(course.ocPcMatrix[o.id]?.[i] ?? 0).replace(/^0$/, "–"))]),
        [100 - w * pcs.length, ...pcs.map(() => w)],
        PORTRAIT_WIDTH,
        { size: 8.5, alignCols: ["left", ...pcs.map(() => "center" as const)] },
      ),
    );
    blocks.push(para("0 = ilişki yok (–), 5 = çok güçlü ilişki. Program çıktıları:", { size: 8.5, italics: true, spacingBefore: 80 }));
    pcs.forEach((p) => blocks.push(para(`${p.code}: ${p.text}`, { size: 8.5, indent: 200, spacingAfter: 0 })));
  }

  blocks.push(sectionTitle("Ölçme araçları ve öğrenme çıktısı kapsamı"));
  if (exams.length) {
    blocks.push(
      simpleTable(
        ["Ölçme aracı", "Tür", "Tarih", "Soru", "Puan", "Ölçülen ÖÇ'ler", `ÖÇ gerçekleşme (eşik %${threshold})`],
        exams.map((e) => {
          const measured = course.outcomes.filter((o) => e.questions.some((q) => q.outcomeIds.includes(o.id))).map((o) => o.code);
          const sheet = data.grades[e.id];
          const a = sheet?.rows.length ? computeAnalysis(e, course, pcs, sheet, threshold) : null;
          const realized = a ? a.outcomeStats.filter((s) => s.pct != null).map((s) => `${s.code} %${num(s.pct!, 0)}${s.flagged ? " ▼" : ""}`).join(", ") : "Not girilmedi";
          return [e.title, e.examType, formatTrDate(e.date), String(e.questions.length), num(e.questions.reduce((t, q) => t + q.points, 0), 1), measured.join(", ") || "—", realized];
        }),
        [20, 10, 11, 7, 7, 17, 28],
        PORTRAIT_WIDTH,
        { size: 8.5 },
      ),
    );
    const unmeasured = course.outcomes.filter((o) => !exams.some((e) => e.questions.some((q) => q.outcomeIds.includes(o.id))));
    if (unmeasured.length) blocks.push(para(`Hiçbir ölçme aracında soru ile ölçülmeyen öğrenme çıktıları: ${unmeasured.map((o) => o.code).join(", ")}.`, { size: 9, bold: true, spacingBefore: 80 }));
  } else {
    blocks.push(para("Bu ders için ölçme aracı (sınav) kaydı yok.", { size: 9.5, italics: true }));
  }
  blocks.push(signatureTable([{ title: "Dersin Öğretim Elemanı", name: course.instructor }, { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }]));
  const doc = buildDocument(`${course.code} Ders Bilgi Formu`, [{ children: blocks, footer: `${course.code} ${course.name} — Ders Bilgi Formu` }]);
  await saveDocx(doc, `${safeFileName(`${course.code}_Ders_Bilgi_Formu`)}.docx`);
}

/** Ders dosyası (ZIP): bilgi formu + her ölçme aracının resmi belgeleri + rubrikler, SHA-256 içindekiler */
export async function exportCourseFile(data: VaultData, courseId: string, onProgress?: (m: string) => void): Promise<{ fileName: string; files: number; skipped: string[] }> {
  const course = data.courses.find((c) => c.id === courseId);
  if (!course) throw new Error("Ders bulunamadı.");
  const inst = data.institution;
  const zip = new JSZip();
  const root = safeFileName(`${course.code}_Ders_Dosyasi_${inst.academicYear}`);
  const folder = zip.folder(root)!;
  const manifest: { path: string; blob: Blob }[] = [];
  const skipped: string[] = [];
  const addTo = (prefix: string) => async (dir: string, label: string, fn: () => Promise<void> | void) => {
    onProgress?.(label);
    const files = await collectOutputs(fn);
    files.forEach((f) => {
      const ext = f.fileName.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
      const stem = ext ? f.fileName.slice(0, -ext.length) : f.fileName;
      let path = `${prefix}${dir}/${f.fileName}`;
      for (let n = 2; manifest.some((m) => m.path === path); n++) path = `${prefix}${dir}/${stem}_${n}${ext}`;
      folder.file(path, f.blob);
      manifest.push({ path, blob: f.blob });
    });
  };

  await addTo("")("00_Ders_Bilgi_Formu", "Ders bilgi formu", () => exportCourseInfoDocx(data, course.id));
  const exams = data.exams.filter((e) => e.courseId === course.id).sort((a, b) => a.date.localeCompare(b.date));
  for (const [i, exam] of exams.entries()) {
    const local: string[] = [];
    await addExamDocuments(data, exam, course, addTo(`${String(i + 1).padStart(2, "0")}_${safeFileName(exam.title).slice(0, 40)}/`), local, { rubrics: false });
    skipped.push(...local.map((x) => `${exam.title}: ${x}`));
  }
  if (!exams.length) skipped.push("Bu ders için ölçme aracı (sınav) yok.");
  const rubrics = data.rubrics.filter((r) => r.courseId === course.id);
  if (rubrics.length) {
    await addTo("")("90_Rubrikler", "Rubrikler", async () => {
      for (const r of rubrics) await exportRubricDocx(inst, course, r);
    });
  }

  onProgress?.("Bütünlük özetleri");
  const lines = [
    `${inst.university} — ${inst.unitName}`,
    `${inst.department}${inst.program ? ` · ${inst.program}` : ""}`,
    "",
    `DERS DOSYASI: ${course.code} ${course.name} (${inst.academicYear} ${inst.semester})`,
    `Öğretim elemanı: ${course.instructor}`,
    `Ölçme araçları: ${exams.map((e) => `${e.title} (${formatTrDate(e.date)})`).join("; ") || "—"}`,
    `Oluşturulma: ${new Date().toLocaleString("tr-TR")} (${BRAND.name}, tarayıcı içi)`,
    "",
    "İÇİNDEKİLER VE SHA-256 BÜTÜNLÜK ÖZETLERİ",
    "Doğrulama: shasum -a 256 <dosya> (macOS/Linux) veya certutil -hashfile <dosya> SHA256 (Windows)",
    "",
  ];
  for (const m of manifest) lines.push(`${bytesToHex(await crypto.subtle.digest("SHA-256", await m.blob.arrayBuffer()))}  ${m.path}`);
  if (skipped.length) lines.push("", "OLUŞTURULAMAYAN BELGELER", ...skipped.map((x) => `- ${x}`));
  folder.file("ICINDEKILER.txt", lines.join("\r\n"));
  onProgress?.("ZIP paketleniyor");
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const fileName = `${root}.zip`;
  // collectOutputs içinde çağrıldığında (kanıta ekleme) indirme yerine toplanır
  if (!pushCollected(fileName, blob)) saveAs(blob, fileName);
  return { fileName, files: manifest.length, skipped };
}

/** MEDEK ÖDR v1.1 Tablo 5.1, 5.2, 6.1, 6.2 — uygulama verisiyle önceden doldurulmuş */
export async function exportOdrTablesDocx(data: VaultData) {
  const inst = data.institution;
  const program = inst.program || "[Programın Adı]";
  const W = LANDSCAPE_WIDTH;
  const note = (t: string) => para(t, { size: 8, italics: true, spacingBefore: 60 });
  const blocks: Block[] = [
    ...letterhead(inst, "MEDEK Öz Değerlendirme Raporu Tabloları", `${program} · ${inst.academicYear}`, [], W),
    para(
      `Sütunlar MEDEK ÖDR v1.1 şablonuyla aynıdır (${ODR_SOURCE}). Uygulamada verisi bulunan hücreler doldurulmuştur; boş hücreler kurum tarafından doldurulmalıdır. Satır ekleyebilirsiniz.`,
      { size: 8.5, italics: true },
    ),
    sectionTitle(`Tablo 5.1. Öğretim Planı — ${program}`),
  ];
  const t51 = table51(data);
  const t51rows: string[][] = [];
  t51.forEach((g) => {
    t51rows.push([`${g.semester}. Yarıyıl`, "", "", "", "", "", "", ""]);
    g.rows.forEach((r) => t51rows.push([...r.cells, String(r.ects)]));
  });
  blocks.push(
    simpleTable([...T51_HEADER, "Katalogdaki AKTS*"], t51rows.length ? t51rows : [["", "", "", "", "", "", "", ""]], [22, 8, 8, 13, 13, 16, 10, 10], W, { size: 8 }),
    note("* Uygulamanın ders kataloğundaki AKTS değeridir; şablon gereği ilgili kategori sütun(lar)ına taşınmalıdır. Aynı ders birden fazla kategoride gösterilebilir."),
    sectionTitle(`Tablo 5.2 Ders ve Sınıf Büyüklükleri — ${program}`),
    simpleTable(T52_HEADER, table52(data), [12, 34, 18, 9, 9, 9, 9], W, { size: 8.5 }),
    note("Öğrenci sayısı: uygulamaya yüklenen öğrenci listesi (yoksa ders kartındaki sayı). Şablon son iki yarıyılın toplamını ister; önceki yarıyıl eklenmelidir. Dersin türü sütunları yüzde olarak verilir (%75 sınıf dersi, %25 laboratuvar gibi)."),
    sectionTitle(`Tablo 6.1. Öğretim Kadrosunun Analizi — ${program}`),
    simpleTable(T61_HEADER, table61(data), [34, 18, 16, 16, 16], W, { size: 8.5 }),
    note("Ad ve unvan ders kataloğundaki öğretim elemanı alanından alınmıştır. Programdaki ders vermeyen öğretim elemanları da eklenmelidir."),
    sectionTitle(`Tablo 6.2. Öğretim Kadrosu Yük Özeti — ${program}`),
    simpleTable(T62_HEADER, table62(data), [24, 46, 10, 10, 10], W, { size: 8.5 }),
    note("Verdiği dersler bu uygulamadaki dönem kataloğundan alınmıştır; şablon son iki dönemde başka programlarda verilen dersler dahil tüm dersleri ister. Etkinlik dağılımı: Öğretim (%) = Verilen toplam ders sayısı / (Verilen toplam ders sayısı + Toplam araştırma faaliyeti sayısı) × 100."),
  );
  const doc = buildDocument("MEDEK ÖDR Tabloları", [{ children: blocks, landscape: true, footer: `MEDEK ÖDR Tablo 5.1, 5.2, 6.1, 6.2 — ${program}` }]);
  await saveDocx(doc, `${safeFileName("MEDEK_ODR_Tablolari_5_1_5_2_6_1_6_2")}.docx`);
}
