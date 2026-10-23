// Tek tıkla Ders Kanıt Klasörü (ZIP): bir sınava ait tüm resmi belgeler klasörlenmiş
// tek bir arşivde, SHA-256 bütünlük özetleriyle birlikte. Tamamen tarayıcıda üretilir.

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { VaultData } from "@/lib/types";
import { computeAnalysis } from "@/lib/medekMath";
import { bytesToHex } from "@/lib/cryptoVault";
import { formatTrDate, safeFileName } from "@/lib/utils";
import { collectOutputs } from "./docxCommon";
import { exportAnswerKeyDocx, exportExamDocx } from "./examExportService";
import { exportAttendanceDocx, exportDoorListDocx, exportEnvelopeDocx, exportEvidenceCoversDocx, pickEvidenceSamples } from "./seatingExportService";
import { exportRubricDocx } from "./rubricExportService";
import { downloadGradeTemplate, exportPukoDocx } from "./medekExportService";
import { exportOpticKeyXlsx } from "./examExportService";

export interface EvidencePackResult {
  fileName: string;
  files: number;
  skipped: string[];
}

export async function exportEvidencePack(data: VaultData, examId: string, onProgress?: (msg: string) => void): Promise<EvidencePackResult> {
  const exam = data.exams.find((e) => e.id === examId);
  const course = exam ? data.courses.find((c) => c.id === exam.courseId) : undefined;
  if (!exam || !course) throw new Error("Sınav veya ders bulunamadı.");
  const inst = data.institution;
  const zip = new JSZip();
  const root = safeFileName(`${course.code}_${exam.title}_Kanit_Klasoru`);
  const folder = zip.folder(root)!;
  const skipped: string[] = [];
  const manifest: { path: string; blob: Blob }[] = [];

  const add = async (dir: string, label: string, fn: () => Promise<void> | void) => {
    onProgress?.(label);
    const files = await collectOutputs(fn);
    files.forEach((f) => {
      let path = `${dir}/${f.fileName}`;
      // Aynı adlı dosyalar (ör. aynı başlıklı iki rubrik) birbirinin üzerine yazılmasın
      for (let n = 2; manifest.some((m) => m.path === path); n++) path = `${dir}/${f.fileName.replace(/(\.[a-z0-9]+)$/i, `_${n}$1`)}`;
      folder.file(path, f.blob);
      manifest.push({ path, blob: f.blob });
    });
  };

  await add("01_Sinav_Kagidi", "Sınav kağıdı (A/B)", () => exportExamDocx(inst, course, exam, ["A", "B"]));
  await add("02_Cevap_Anahtari_ve_Belirtke", "Cevap anahtarı ve belirtke", () => exportAnswerKeyDocx(inst, course, exam));
  if (exam.questions.some((q) => q.type === "mcq" || q.type === "truefalse")) {
    await add("02_Cevap_Anahtari_ve_Belirtke", "Optik cevap anahtarı", () => exportOpticKeyXlsx(course, exam));
  }

  const plan = data.seating[exam.id];
  if (plan) {
    const ctx = { inst, course, exam, plan, students: data.students[course.id] ?? [], rooms: data.rooms, invigilators: data.invigilators, schedule: data.schedule };
    await add("03_Kapi_Listesi_ve_Yoklama", "Kapı listesi ve tutanaklar", async () => {
      await exportDoorListDocx(ctx, true);
      await exportAttendanceDocx(ctx);
      await exportEnvelopeDocx(ctx);
    });
  } else {
    skipped.push("Kapı listesi / yoklama tutanağı / zarf etiketi — oturma planı oluşturulmamış (Modül 4).");
  }

  const rubrics = data.rubrics.filter((r) => r.courseId === course.id);
  if (rubrics.length) {
    await add("04_Rubrikler", "Rubrikler", async () => {
      for (const r of rubrics) await exportRubricDocx(inst, course, r);
    });
  } else {
    skipped.push("Rubrik — bu derse ait rubrik yok (Modül 5).");
  }

  const sheet = data.grades[exam.id];
  const threshold = inst.targetThreshold || 60;
  if (sheet && sheet.rows.length) {
    const analysis = computeAnalysis(exam, course, data.programOutcomes, sheet, threshold);
    await add("05_Notlar_ve_PUKO", "Notlar ve PUKÖ raporu", async () => {
      downloadGradeTemplate(exam, course, sheet.rows.map((r) => ({ no: r.studentNo, name: r.fullName, scores: r.scores })), "Not_Cizelgesi");
      await exportPukoDocx({ inst, course, exam, programOutcomes: data.programOutcomes, sheet, analysis, threshold });
    });
    const picked = pickEvidenceSamples(exam, sheet);
    if (picked.samples.length) {
      await add("06_Kanit_Klasoru_Kapaklari", "Kanıt klasörü kapakları", () => exportEvidenceCoversDocx({ inst, course, exam }, picked.samples, picked.classMean, false));
    }
  } else {
    skipped.push("Not çizelgesi, PUKÖ raporu ve kanıt kapakları — not girilmemiş (Modül 6).");
  }

  onProgress?.("Bütünlük özetleri");
  const lines = [
    `${inst.university} — ${inst.unitName}`,
    `${inst.department}`,
    "",
    `DERS KANIT KLASÖRÜ: ${course.code} ${course.name}`,
    `Ölçme aracı: ${exam.title} (${exam.examType}) — ${formatTrDate(exam.date)}`,
    `Öğretim elemanı: ${course.instructor}`,
    `Oluşturulma: ${new Date().toLocaleString("tr-TR")} (AkrediteSınav, tarayıcı içi)`,
    "",
    "İÇİNDEKİLER VE SHA-256 BÜTÜNLÜK ÖZETLERİ",
    "Bir dosyanın sonradan değiştirilmediğini doğrulamak için: shasum -a 256 <dosya> (macOS/Linux) veya certutil -hashfile <dosya> SHA256 (Windows)",
    "",
  ];
  for (const m of manifest) {
    const hash = bytesToHex(await crypto.subtle.digest("SHA-256", await m.blob.arrayBuffer()));
    lines.push(`${hash}  ${m.path}`);
  }
  if (skipped.length) {
    lines.push("", "EKSİK BELGELER (oluşturulamadı)", ...skipped.map((s) => `- ${s}`));
  }
  folder.file("ICINDEKILER.txt", lines.join("\r\n"));

  onProgress?.("ZIP paketleniyor");
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const fileName = `${root}.zip`;
  saveAs(blob, fileName);
  return { fileName, files: manifest.length, skipped };
}
