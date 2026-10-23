// Modül 4 Çıktıları: KVKK maskeli Kapı Listesi, Resmi Yoklama ve İmza Tutanağı,
// Sınav Zarfı Üst Etiketi, MEDEK Kanıt Klasörü Kapakları (.docx)

import { TableRow } from "docx";
import * as XLSX from "xlsx";
import type { Course, Exam, GradeSheet, Institution, Invigilator, Room, Schedule, SeatingPlan, Student } from "@/lib/types";
import { activeRows, rowTotal } from "@/lib/medekMath";
import { fullName } from "@/lib/seating";
import { formatTrDate, maskName, maskStudentNo, mean, safeFileName, num } from "@/lib/utils";
import {
  buildDocument,
  cell,
  gridTable,
  infoTable,
  letterhead,
  para,
  PORTRAIT_WIDTH,
  saveDocx,
  saveWorkbook,
  signatureTable,
  simpleTable,
  spacer,
  type Block,
} from "./docxCommon";

export interface SeatingCtx {
  inst: Institution;
  course: Course;
  exam: Exam;
  plan: SeatingPlan;
  students: Student[];
  rooms: Room[];
  invigilators: Invigilator[];
  schedule: Schedule;
}

export interface RoomSheet {
  room: Room;
  rows: { seatNo: number; no: string; name: string; booklet: "A" | "B" }[];
  invigilatorNames: string[];
  countA: number;
  countB: number;
}

export function roomSheets(ctx: SeatingCtx, mask = false): RoomSheet[] {
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const entry = ctx.schedule.entries.find((e) => e.courseId === ctx.course.id);
  return ctx.plan.rooms
    .map((rs) => {
      const room = ctx.rooms.find((r) => r.id === rs.roomId);
      if (!room) return null;
      const rows = rs.seats.map((seat) => {
        const st = byId.get(seat.studentId);
        const name = st ? fullName(st) : "—";
        const no = st?.no ?? "—";
        return { seatNo: seat.seatNo, no: mask ? maskStudentNo(no) : no, name: mask ? maskName(name) : name, booklet: seat.booklet };
      });
      const alloc = entry?.rooms.find((r) => r.roomId === room.id);
      const invigilatorNames = (alloc?.invigilatorIds ?? [])
        .map((id) => ctx.invigilators.find((i) => i.id === id))
        .filter(Boolean)
        .map((i) => `${i!.title} ${i!.name}`);
      return {
        room,
        rows,
        invigilatorNames,
        countA: rows.filter((r) => r.booklet === "A").length,
        countB: rows.filter((r) => r.booklet === "B").length,
      };
    })
    .filter((x): x is RoomSheet => !!x);
}

function examInfo(ctx: SeatingCtx, sheet: RoomSheet): Block {
  return infoTable([
    ["Ders", `${ctx.course.code} — ${ctx.course.name}`],
    ["Sınav", `${ctx.exam.title} (${ctx.exam.examType})`],
    ["Tarih / Saat", `${formatTrDate(ctx.exam.date, true)} · ${ctx.exam.startTime} (${ctx.exam.durationMin} dk)`],
    ["Derslik", `${sheet.room.name}${sheet.room.building ? ` (${sheet.room.building})` : ""}`],
    ["Öğrenci Sayısı", `${sheet.rows.length} (A: ${sheet.countA} · B: ${sheet.countB})`],
    ["Gözetmen(ler)", sheet.invigilatorNames.join(", ") || "—"],
  ]);
}

const modeLabel = (p: SeatingPlan) => (p.mode === "butterfly" ? "Kelebek (rastgele, anti-kopya)" : "Numara sıralı");

export async function exportDoorListDocx(ctx: SeatingCtx, mask: boolean) {
  const sheets = roomSheets(ctx, mask);
  const doc = buildDocument("Sınav Kapı Listesi", sheets.map((s) => ({
    footer: `Kapı Listesi — ${s.room.name}${mask ? " — KVKK maskeli" : ""}`,
    children: [
      ...letterhead(ctx.inst, "Sınav Kapı Listesi", `${s.room.name} — Oturma düzeni: ${modeLabel(ctx.plan)}`, ["KAPIYA ASILACAKTIR"]),
      examInfo(ctx, s),
      spacer(100),
      simpleTable(["Sıra No", "Öğrenci No", "Adı Soyadı", "Kitapçık"], s.rows.map((r) => [r.seatNo, r.no, r.name, r.booklet]), [12, 26, 48, 14], PORTRAIT_WIDTH, {
        size: 10,
        alignCols: ["center", "center", "left", "center"],
      }),
      ...(mask ? [para("Kişisel veriler 6698 sayılı KVKK kapsamında maskelenmiştir.", { size: 8.5, italics: true, spacingBefore: 80 })] : []),
    ],
  })));
  await saveDocx(doc, `${safeFileName(`${ctx.course.code}_Kapi_Listesi${mask ? "_KVKK" : ""}`)}.docx`);
}

export function attendanceBlocks(ctx: SeatingCtx, s: RoomSheet): Block[] {
  const w = [900, 1900, 3838, 1100, 1900];
  const header = new TableRow({
    tableHeader: true,
    children: ["Sıra No", "Öğrenci No", "Adı Soyadı", "Kitapçık", "İmza"].map((h, i) => cell(h, { bold: true, shade: true, align: "center", width: w[i], size: 9.5 })),
  });
  const rows = s.rows.map(
    (r) =>
      new TableRow({
        height: { value: 400, rule: "atLeast" },
        cantSplit: true,
        children: [
          cell(String(r.seatNo), { align: "center", width: w[0], size: 9.5 }),
          cell(r.no, { align: "center", width: w[1], size: 9.5 }),
          cell(r.name, { width: w[2], size: 9.5 }),
          cell(r.booklet, { align: "center", width: w[3], size: 9.5 }),
          cell("", { width: w[4] }),
        ],
      }),
  );
  const third = Math.floor(PORTRAIT_WIDTH / 3);
  const footer = gridTable(
    [
      new TableRow({
        children: [
          cell(`Sınava Kayıtlı: ${s.rows.length}`, { bold: true, width: third, size: 10 }),
          cell("Sınava Giren: [ ........ ]", { bold: true, width: third, size: 10 }),
          cell("Girmeyen: [ ........ ]", { bold: true, width: PORTRAIT_WIDTH - 2 * third, size: 10 }),
        ],
      }),
      new TableRow({
        children: [
          cell(`Teslim Edilen Evrak: [ ........ ] adet cevap kağıdı  (A: ${s.countA} / B: ${s.countB} basıldı)`, { width: PORTRAIT_WIDTH, colSpan: 3, size: 10 }),
        ],
      }),
      new TableRow({
        children: [cell("Tutanak / Açıklama (kopya girişimi, sağlık sorunu vb.):\n\n", { width: PORTRAIT_WIDTH, colSpan: 3, size: 9.5 })],
      }),
    ],
    [third, third, PORTRAIT_WIDTH - 2 * third],
  );
  const signers = [
    ...(s.invigilatorNames.length ? s.invigilatorNames : ["", ""]).map((n, i) => ({ title: `Gözetmen ${i + 1}`, name: n })),
    { title: "Ders Sorumlusu", name: ctx.course.instructor },
  ];
  return [
    ...letterhead(ctx.inst, "Sınav Yoklama ve İmza Tutanağı", s.room.name, ["RESMİ TUTANAK"]),
    examInfo(ctx, s),
    spacer(100),
    gridTable([header, ...rows], w),
    spacer(120),
    footer,
    signatureTable(signers),
  ];
}

export async function exportAttendanceDocx(ctx: SeatingCtx) {
  const sheets = roomSheets(ctx, false);
  const doc = buildDocument("Sınav Yoklama Tutanağı", sheets.map((s) => ({ children: attendanceBlocks(ctx, s), footer: `Yoklama Tutanağı — ${s.room.name}` })));
  await saveDocx(doc, `${safeFileName(`${ctx.course.code}_Yoklama_Tutanagi`)}.docx`);
}

export async function exportEnvelopeDocx(ctx: SeatingCtx) {
  const sheets = roomSheets(ctx, false);
  const children: Block[] = [];
  sheets.forEach((s, i) => {
    const w = [3000, PORTRAIT_WIDTH - 3000];
    const row = (k: string, v: string, big = false) =>
      new TableRow({ children: [cell(k, { bold: true, shade: "F3F4F6", width: w[0], size: big ? 12 : 10.5 }), cell(v, { width: w[1], size: big ? 14 : 10.5, bold: big })] });
    children.push(
      para(ctx.inst.university.toLocaleUpperCase("tr-TR"), { bold: true, size: 13, align: "center", spacingAfter: 0, spacingBefore: i ? 300 : 0 }),
      para(`${ctx.inst.unitName} — ${ctx.inst.department}`, { size: 10.5, align: "center", spacingAfter: 0 }),
      para("SINAV EVRAK ZARFI", { bold: true, size: 18, align: "center", spacingAfter: 120 }),
      gridTable(
        [
          row("Ders", `${ctx.course.code} — ${ctx.course.name}`, true),
          row("Sınav Türü", `${ctx.exam.examType} · ${ctx.inst.academicYear} ${ctx.inst.semester}`),
          row("Tarih / Saat", `${formatTrDate(ctx.exam.date, true)} · ${ctx.exam.startTime}`),
          row("Derslik", s.room.name, true),
          row("Kayıtlı Öğrenci", String(s.rows.length)),
          row("Kitapçık Dağılımı", `A: ${s.countA}   B: ${s.countB}`),
          row("Sınava Giren / Girmeyen", ".......... / .........."),
          row("Zarftaki Kağıt Sayısı", ".........."),
          row("Gözetmen(ler)", s.invigilatorNames.join(", ") || "—"),
          row("Ders Sorumlusu", ctx.course.instructor),
        ],
        w,
      ),
      signatureTable([
        { title: "Teslim Eden (Gözetmen)", name: s.invigilatorNames[0] ?? "" },
        { title: "Teslim Alan (Ders Sorumlusu)", name: ctx.course.instructor },
      ]),
    );
  });
  const doc = buildDocument("Sınav Zarfı Etiketi", [{ children, footer: `${ctx.course.code} — Sınav Zarfı Etiketleri` }]);
  await saveDocx(doc, `${safeFileName(`${ctx.course.code}_Sinav_Zarfi_Etiketi`)}.docx`);
}

// ---------------------------------------------------------------------------
// MEDEK Kanıt Klasörü Kapakları
// ---------------------------------------------------------------------------

export interface EvidenceSample {
  kind: "En Yüksek" | "Ortalama" | "En Düşük";
  studentNo: string;
  fullName: string;
  score: number;
}

export function pickEvidenceSamples(exam: Exam, sheet: GradeSheet | undefined): { samples: EvidenceSample[]; classMean: number } {
  const rows = activeRows(sheet);
  if (!rows.length) return { samples: [], classMean: 0 };
  const totals = rows.map((r) => ({ r, t: rowTotal(r, exam) }));
  const m = mean(totals.map((x) => x.t));
  const sorted = [...totals].sort((a, b) => b.t - a.t);
  const avg = [...totals].sort((a, b) => Math.abs(a.t - m) - Math.abs(b.t - m))[0];
  const mk = (kind: EvidenceSample["kind"], x: { r: (typeof rows)[number]; t: number }): EvidenceSample => ({ kind, studentNo: x.r.studentNo, fullName: x.r.fullName, score: x.t });
  return { samples: [mk("En Yüksek", sorted[0]), mk("Ortalama", avg), mk("En Düşük", sorted[sorted.length - 1])], classMean: m };
}

export async function exportEvidenceCoversDocx(ctx: { inst: Institution; course: Course; exam: Exam }, samples: EvidenceSample[], classMean: number, mask: boolean) {
  const doc = buildDocument("MEDEK Kanıt Klasörü Kapakları", samples.map((s) => ({
    footer: `${ctx.inst.accreditationBody} Kanıt Klasörü — ${ctx.course.code}`,
    children: [
      ...letterhead(ctx.inst, `${ctx.inst.accreditationBody} Kanıt Klasörü`, `${ctx.inst.academicYear} ${ctx.inst.semester} Yarıyılı`),
      spacer(600),
      para(`${s.kind.toLocaleUpperCase("tr-TR")} NOTLU`, { bold: true, size: 30, align: "center", spacingAfter: 0 }),
      para("SINAV KAĞIDI ÖRNEĞİ", { bold: true, size: 26, align: "center", spacingAfter: 600 }),
      infoTable(
        [
          ["Ders Kodu / Adı", `${ctx.course.code} — ${ctx.course.name}`],
          ["Ölçme Aracı", `${ctx.exam.title} (${ctx.exam.examType})`],
          ["Sınav Tarihi", formatTrDate(ctx.exam.date, true)],
          ["Öğretim Elemanı", ctx.course.instructor],
          ["Öğrenci No", mask ? maskStudentNo(s.studentNo) : s.studentNo],
          ["Adı Soyadı", mask ? maskName(s.fullName) : s.fullName],
          ["Aldığı Puan", `${num(s.score, 1)} / ${ctx.exam.questions.reduce((a, q) => a + q.points, 0)}`],
          ["Sınıf Ortalaması", num(classMean, 2).toString()],
          ["Ölçülen ÖÇ'ler", ctx.course.outcomes.map((o) => o.code).join(", ")],
        ],
        PORTRAIT_WIDTH,
        1,
      ),
      spacer(300),
      para("Klasör İçeriği Kontrol Listesi", { bold: true, size: 11 }),
      ...["Öğrencinin sınav kağıdı (aslı)", "Sınav soruları ve cevap anahtarı", "MEDEK puanlama rubriği", "Belirtke tablosu (ÖÇ × soru)", "ÖÇ/PÇ başarı analizi ve PUKÖ raporu"].map((t) => para(`☐  ${t}`, { size: 10.5, indent: 300, spacingAfter: 40 })),
      signatureTable([{ title: "Ders Sorumlusu", name: ctx.course.instructor }, { title: ctx.inst.headTitle || "Bölüm Başkanı", name: ctx.inst.headOfDepartment }]),
    ],
  })));
  await saveDocx(doc, `${safeFileName(`${ctx.course.code}_MEDEK_Kanit_Klasoru_Kapaklari`)}.docx`);
}

export function downloadStudentTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Öğrenci No", "Adı", "Soyadı"],
    ["251010001", "Ahmet", "YILMAZ"],
    ["251010002", "Ayşe", "KAYA"],
  ]);
  ws["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "OBS Listesi");
  saveWorkbook(wb, "OBS_Ogrenci_Listesi_Sablonu.xlsx");
}

export async function readStudentFile(file: File): Promise<unknown[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
}
