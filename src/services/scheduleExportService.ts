// Modül 3 Çıktıları: Bölüm İlan Panosu Sınav Takvimi (.docx/.xlsx), Gözetmen Görev Tebliğ Belgesi (.docx)
// ve tablo yönetimi için Excel içe/dışa aktarma.

import * as XLSX from "xlsx";
import type { Course, Institution, Invigilator, Room, Schedule, ScheduleSettings } from "@/lib/types";
import { dutiesOf, fairnessScore, invigilatorLoads, scheduleDates, slotKey } from "@/lib/scheduler";
import { docNumberPrefix, formatTrDate, formatTrLongDate, safeFileName, todayIso, trDayName, uid } from "@/lib/utils";
import {
  buildDocument,
  gridTable,
  cell,
  LANDSCAPE_WIDTH,
  letterhead,
  para,
  PORTRAIT_WIDTH,
  saveDocx,
  sectionTitle,
  signatureTable,
  simpleTable,
  spacer,
  type Block,
} from "./docxCommon";
import { TableRow } from "docx";

export interface ScheduleCtx {
  inst: Institution;
  schedule: Schedule;
  courses: Course[];
  rooms: Room[];
  invigilators: Invigilator[];
}

export interface BoardRow {
  date: string;
  day: string;
  time: string;
  code: string;
  name: string;
  classYear: number;
  students: number;
  rooms: string;
  invigilators: string;
  instructor: string;
  dayIndex: number;
  slotId: string;
}

export function boardRows(ctx: ScheduleCtx): BoardRow[] {
  const dates = scheduleDates(ctx.schedule.settings);
  const slotIdx = (id: string) => ctx.schedule.settings.slots.findIndex((s) => s.id === id);
  return [...ctx.schedule.entries]
    .sort((a, b) => a.dayIndex - b.dayIndex || slotIdx(a.slotId) - slotIdx(b.slotId))
    .map((e) => {
      const c = ctx.courses.find((x) => x.id === e.courseId);
      const s = ctx.schedule.settings.slots.find((x) => x.id === e.slotId);
      const date = dates[e.dayIndex] ?? "";
      return {
        date,
        day: date ? trDayName(date) : "",
        time: s ? `${s.start}–${s.end}` : "",
        code: c?.code ?? "",
        name: c?.name ?? "",
        classYear: c?.classYear ?? 0,
        students: c?.studentCount ?? 0,
        rooms: e.rooms.map((r) => `${ctx.rooms.find((x) => x.id === r.roomId)?.name ?? "?"} (${r.studentCount})`).join(" + "),
        invigilators: e.rooms
          .flatMap((r) => r.invigilatorIds)
          .map((id) => {
            const inv = ctx.invigilators.find((x) => x.id === id);
            return inv ? `${inv.title} ${inv.name}` : "";
          })
          .filter(Boolean)
          .join(", "),
        instructor: c?.instructor ?? "",
        dayIndex: e.dayIndex,
        slotId: e.slotId,
      };
    });
}

export async function exportBoardDocx(ctx: ScheduleCtx) {
  const { inst, schedule } = ctx;
  const rows = boardRows(ctx);
  const dates = scheduleDates(schedule.settings);
  const years = Array.from(new Set(ctx.courses.filter((c) => schedule.settings.courseIds.includes(c.id)).map((c) => c.classYear))).sort();

  const matrixRows: (string | number)[][] = dates.map((d, di) => [
    `${formatTrDate(d)}\n${trDayName(d)}`,
    ...schedule.settings.slots.map((s) =>
      rows
        .filter((r) => r.dayIndex === di && r.slotId === s.id)
        .map((r) => `${r.code} ${r.name} (${r.classYear}. Sınıf)\n${r.rooms}`)
        .join("\n\n"),
    ),
  ]);
  const slotW = (100 - 14) / Math.max(1, schedule.settings.slots.length);

  const children: Block[] = [
    ...letterhead(inst, `${schedule.settings.periodName} Sınav Programı`, `${inst.department} — ${inst.program}`, [`İlan tarihi: ${formatTrDate(todayIso())}`], LANDSCAPE_WIDTH),
    sectionTitle("Haftalık Sınav Takvimi (Gün × Saat)"),
    simpleTable(["Tarih", ...schedule.settings.slots.map((s) => `${s.start}–${s.end}`)], matrixRows, [14, ...schedule.settings.slots.map(() => slotW)], LANDSCAPE_WIDTH, { size: 8.5 }),
    sectionTitle("Ayrıntılı Sınav Listesi"),
    simpleTable(
      ["Tarih", "Gün", "Saat", "Ders Kodu", "Ders Adı", "Sınıf", "Öğr.", "Derslik(ler)", "Gözetmen(ler)", "Öğretim Elemanı"],
      rows.map((r) => [formatTrDate(r.date), r.day, r.time, r.code, r.name, `${r.classYear}.`, r.students, r.rooms, r.invigilators, r.instructor]),
      [8, 8, 8, 7, 16, 5, 5, 14, 17, 12],
      LANDSCAPE_WIDTH,
      { size: 8.5, alignCols: ["center", "center", "center", "center", "left", "center", "center", "left", "left", "left"] },
    ),
    para(
      `Sınıf düzeyleri: ${years.map((y) => `${y}. sınıf`).join(", ")}. Öğrencilerin sınav saatinden 15 dakika önce sınav salonunda bulunmaları, öğrenci kimlik kartlarını yanlarında getirmeleri gerekmektedir.`,
      { size: 9, spacingBefore: 160 },
    ),
    signatureTable([{ title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }], LANDSCAPE_WIDTH),
  ];
  const doc = buildDocument(`${schedule.settings.periodName} Sınav Programı`, [{ children, landscape: true, footer: `${inst.department} — ${schedule.settings.periodName}` }]);
  await saveDocx(doc, `${safeFileName(`${schedule.settings.periodName}_Ilan_Panosu`)}.docx`);
}

export function noticeBlocks(ctx: ScheduleCtx, inv: Invigilator): Block[] {
  const { inst, schedule } = ctx;
  const dates = scheduleDates(schedule.settings);
  const duties = dutiesOf(schedule, inv.id).sort(
    (a, b) =>
      a.entry.dayIndex - b.entry.dayIndex ||
      schedule.settings.slots.findIndex((s) => s.id === a.entry.slotId) - schedule.settings.slots.findIndex((s) => s.id === b.entry.slotId),
  );
  const rows = duties.map((d, i) => {
    const c = ctx.courses.find((x) => x.id === d.entry.courseId);
    const s = schedule.settings.slots.find((x) => x.id === d.entry.slotId);
    const alloc = d.entry.rooms.find((r) => r.roomId === d.roomId);
    const others = (alloc?.invigilatorIds ?? [])
      .filter((id) => id !== inv.id)
      .map((id) => ctx.invigilators.find((x) => x.id === id))
      .filter(Boolean)
      .map((x) => `${x!.title} ${x!.name}`)
      .join(", ");
    return [
      i + 1,
      formatTrDate(dates[d.entry.dayIndex] ?? "", true),
      s ? `${s.start}–${s.end}` : "",
      `${c?.code ?? ""} ${c?.name ?? ""}`,
      ctx.rooms.find((r) => r.id === d.roomId)?.name ?? "",
      alloc?.studentCount ?? "",
      others || "—",
    ];
  });
  return [
    ...letterhead(inst, undefined, undefined, [`Tarih: ${formatTrDate(todayIso())}`]),
    para(`Sayı  : ${docNumberPrefix(inst.department)}-${new Date().getFullYear()}/${String(ctx.invigilators.indexOf(inv) + 1).padStart(3, "0")}`, { size: 10.5, spacingAfter: 0, spacingBefore: 120 }),
    para("Konu  : Sınav Gözetmenlik Görevlendirmesi", { size: 10.5, spacingAfter: 240 }),
    para(`Sayın ${inv.title} ${inv.name},`, { bold: true, spacingAfter: 160 }),
    para(
      `${inst.unitName} ${inst.department} ${inst.academicYear} ${inst.semester} yarıyılı "${schedule.settings.periodName}" kapsamında aşağıda belirtilen sınavlarda gözetmen olarak görevlendirilmiş bulunmaktasınız. Sınav başlama saatinden en az 15 dakika önce sınav evrakını teslim almak üzere bölüm sekreterliğinde hazır bulunmanızı ve sınav sonunda yoklama tutanağı ile birlikte evrakı ders sorumlusuna teslim etmenizi rica ederim.`,
      { align: "justify", spacingAfter: 200 },
    ),
    simpleTable(["Sıra", "Tarih", "Saat", "Ders", "Derslik", "Öğr.", "Birlikte Görevli"], rows, [6, 18, 12, 28, 10, 7, 19], PORTRAIT_WIDTH, {
      size: 9.5,
      alignCols: ["center", "left", "center", "left", "center", "center", "left"],
    }),
    para(`Toplam görev sayısı: ${duties.length}`, { bold: true, size: 10, spacingBefore: 100 }),
    sectionTitle("Gözetmen Yönergesi"),
    ...[
      "Öğrenci kimlik kontrolü yapılarak yoklama tutanağı imzalatılır; sınava girmeyen öğrenciler tutanakta belirtilir.",
      "Kelebek oturma düzenine (kapı listesindeki sıra numaralarına) uyulması sağlanır; A/B kitapçıklar sıralı dağıtılır.",
      "Sınavın ilk 20 dakikası ve son 10 dakikasında öğrencinin salondan çıkmasına izin verilmez.",
      "Kopya girişiminde tutanak tutularak ders sorumlusu ve bölüm başkanlığına bildirilir.",
      "Sınav sonunda kağıt sayısı ile imza sayısı karşılaştırılarak sınav zarfı kapatılır.",
    ].map((t, i) => para(`${i + 1}. ${t}`, { size: 10, indent: 200, spacingAfter: 40 })),
    signatureTable([{ title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }]),
    spacer(200),
    gridTable(
      [
        new TableRow({
          children: [
            cell("TEBELLÜĞ EDEN", { bold: true, shade: true, align: "center", width: 3212 }),
            cell("Tarih", { bold: true, shade: true, align: "center", width: 3213 }),
            cell("İmza", { bold: true, shade: true, align: "center", width: 3213 }),
          ],
        }),
        new TableRow({
          height: { value: 700, rule: "atLeast" },
          children: [cell(`${inv.title} ${inv.name}`, { align: "center", width: 3212 }), cell("....../....../20......", { align: "center", width: 3213 }), cell("", { width: 3213 })],
        }),
      ],
      [3212, 3213, 3213],
    ),
  ];
}

export async function exportNoticesDocx(ctx: ScheduleCtx, invigilatorIds: string[]) {
  const list = ctx.invigilators.filter((i) => invigilatorIds.includes(i.id));
  const doc = buildDocument("Gözetmen Görev Tebliğ Belgesi", list.map((inv) => ({ children: noticeBlocks(ctx, inv), footer: `Gözetmen Görev Tebliği — ${inv.title} ${inv.name}` })));
  const name = list.length === 1 ? `Gorev_Tebligi_${list[0].name}` : `Gozetmen_Gorev_Tebligleri_${list.length}_kisi`;
  await saveDocx(doc, `${safeFileName(name)}.docx`);
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

function unavailableToText(inv: Invigilator, settings: ScheduleSettings): string {
  return inv.unavailable
    .map((k) => {
      const [d, sid] = k.split("|");
      const s = settings.slots.find((x) => x.id === sid);
      return s ? `G${Number(d) + 1}-${s.start}` : "";
    })
    .filter(Boolean)
    .join(";");
}

function textToUnavailable(text: string, settings: ScheduleSettings): string[] {
  const out = new Set<string>();
  String(text ?? "")
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .forEach((tok) => {
      const m = tok.match(/^G(\d+)-(\*|\d{1,2}:\d{2})$/i);
      if (!m) return;
      const day = Number(m[1]) - 1;
      if (m[2] === "*") settings.slots.forEach((s) => out.add(slotKey(day, s.id)));
      else {
        const s = settings.slots.find((x) => x.start === m[2].padStart(5, "0"));
        if (s) out.add(slotKey(day, s.id));
      }
    });
  return Array.from(out);
}

export function exportScheduleXlsx(ctx: ScheduleCtx) {
  const { schedule } = ctx;
  const wb = XLSX.utils.book_new();
  const rows = boardRows(ctx);
  const program = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Tarih: formatTrDate(r.date),
      Gün: r.day,
      Saat: r.time,
      "Ders Kodu": r.code,
      "Ders Adı": r.name,
      Sınıf: r.classYear,
      "Öğrenci Sayısı": r.students,
      "Derslik(ler)": r.rooms,
      "Gözetmen(ler)": r.invigilators,
      "Öğretim Elemanı": r.instructor,
    })),
  );
  program["!cols"] = [10, 10, 12, 10, 34, 6, 10, 26, 40, 28].map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, program, "Program");

  const dates = scheduleDates(schedule.settings);
  const matrix = [
    ["Tarih", ...schedule.settings.slots.map((s) => `${s.start}-${s.end}`)],
    ...dates.map((d, di) => [
      `${formatTrDate(d)} ${trDayName(d)}`,
      ...schedule.settings.slots.map((s) =>
        rows
          .filter((r) => r.dayIndex === di && r.slotId === s.id)
          .map((r) => `${r.code} (${r.classYear}. sınıf) ${r.rooms}`)
          .join(" | "),
      ),
    ]),
  ];
  const ms = XLSX.utils.aoa_to_sheet(matrix);
  ms["!cols"] = [{ wch: 20 }, ...schedule.settings.slots.map(() => ({ wch: 42 }))];
  XLSX.utils.book_append_sheet(wb, ms, "Takvim");

  const loads = invigilatorLoads(schedule, ctx.invigilators);
  const loadSheet = XLSX.utils.json_to_sheet([
    ...loads.map((l) => ({ Gözetmen: `${l.inv.title} ${l.inv.name}`, "Görev Sayısı": l.count })),
    { Gözetmen: "Adalet Skoru (%)", "Görev Sayısı": Number(fairnessScore(loads.map((l) => l.count)).toFixed(1)) },
  ]);
  XLSX.utils.book_append_sheet(wb, loadSheet, "Gözetmen Yükü");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      ctx.courses.map((c) => ({
        "Ders Kodu": c.code,
        "Ders Adı": c.name,
        Sınıf: c.classYear,
        "Öğrenci Sayısı": c.studentCount,
        "Öğretim Elemanı": c.instructor,
        "Programa Dahil": schedule.settings.courseIds.includes(c.id) ? "Evet" : "Hayır",
      })),
    ),
    "Dersler",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(ctx.rooms.map((r) => ({ Derslik: r.name, Bina: r.building, Kapasite: r.capacity, "Gözetmen Sayısı": r.invigilatorsNeeded }))),
    "Derslikler",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      ctx.invigilators.map((i) => ({
        Unvan: i.title,
        "Ad Soyad": i.name,
        "E-posta": i.email,
        "Günlük Maks. Görev": i.maxDailyDuties,
        "Müsait Değil (G<gün>-<saat>; örn. G1-09:00;G4-*)": unavailableToText(i, schedule.settings),
      })),
    ),
    "Gözetmenler",
  );
  XLSX.writeFile(wb, `${safeFileName(`${schedule.settings.periodName}_Sinav_Programi`)}.xlsx`);
}

export interface ImportedTables {
  courses?: Course[];
  rooms?: Room[];
  invigilators?: Invigilator[];
  summary: string[];
}

function rowsOf(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] | null {
  const sheetName = wb.SheetNames.find((n) => n.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"));
  if (!sheetName) return null;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });
}

function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of Object.keys(row)) {
    const lk = k.toLocaleLowerCase("tr-TR");
    if (keys.some((x) => lk.startsWith(x))) return String(row[k] ?? "").trim();
  }
  return "";
}

export async function importScheduleTables(file: File, existing: ScheduleCtx): Promise<ImportedTables> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const out: ImportedTables = { summary: [] };
  const cr = rowsOf(wb, "Dersler");
  if (cr) {
    out.courses = cr
      .filter((r) => pick(r, "ders kodu", "kod"))
      .map((r) => {
        const code = pick(r, "ders kodu", "kod");
        const prev = existing.courses.find((c) => c.code === code);
        return {
          ...(prev ?? {
            id: uid("crs"),
            semesterNo: 1,
            credit: 3,
            ects: 4,
            examDurationMin: 60,
            outcomes: [],
            ocPcMatrix: {},
          }),
          code,
          name: pick(r, "ders adı", "ad") || prev?.name || code,
          classYear: Number(pick(r, "sınıf", "sinif")) || prev?.classYear || 1,
          studentCount: Number(pick(r, "öğrenci", "ogrenci")) || prev?.studentCount || 0,
          instructor: pick(r, "öğretim", "ogretim", "hoca") || prev?.instructor || "",
        } as Course;
      });
    out.summary.push(`${out.courses.length} ders`);
  }
  const rr = rowsOf(wb, "Derslikler");
  if (rr) {
    out.rooms = rr
      .filter((r) => pick(r, "derslik", "ad"))
      .map((r) => {
        const name = pick(r, "derslik", "ad");
        const prev = existing.rooms.find((x) => x.name === name);
        return {
          id: prev?.id ?? uid("rm"),
          name,
          building: pick(r, "bina", "blok"),
          capacity: Number(pick(r, "kapasite")) || 30,
          invigilatorsNeeded: Number(pick(r, "gözetmen", "gozetmen")) || 1,
        };
      });
    out.summary.push(`${out.rooms.length} derslik`);
  }
  const ir = rowsOf(wb, "Gözetmenler") ?? rowsOf(wb, "Gozetmenler");
  if (ir) {
    out.invigilators = ir
      .filter((r) => pick(r, "ad soyad", "ad"))
      .map((r) => {
        const name = pick(r, "ad soyad", "ad");
        const prev = existing.invigilators.find((x) => x.name === name);
        return {
          id: prev?.id ?? uid("inv"),
          title: pick(r, "unvan"),
          name,
          email: pick(r, "e-posta", "eposta", "mail"),
          maxDailyDuties: Number(pick(r, "günlük", "gunluk")) || 3,
          unavailable: textToUnavailable(pick(r, "müsait", "musait"), existing.schedule.settings),
        };
      });
    out.summary.push(`${out.invigilators.length} gözetmen`);
  }
  if (!out.summary.length) throw new Error('Excel dosyasında "Dersler", "Derslikler" veya "Gözetmenler" sayfası bulunamadı.');
  return out;
}

export function longDateLabel(iso: string) {
  return formatTrLongDate(iso);
}
