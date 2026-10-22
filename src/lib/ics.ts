// iCalendar (.ics) üretici — Google Takvim, Outlook ve Apple Takvim ile uyumlu (RFC 5545).
// Türkiye 2016'dan beri kalıcı olarak UTC+3 kullandığı için yerel saatler UTC'ye çevrilerek yazılır.

import type { Course, Institution, Invigilator, Room, Schedule } from "./types";
import { dutiesOf, scheduleDates } from "./scheduler";
import { safeFileName } from "./utils";

const TR_OFFSET_HOURS = 3;

function toUtcStamp(isoDate: string, hhmm: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh - TR_OFFSET_HOURS, mm));
  return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545: satırlar 75 oktetten uzunsa katlanır */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let len = 0;
  for (const ch of line) {
    const l = new TextEncoder().encode(ch).length;
    if (len + l > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      len = 0;
    }
    current += ch;
    len += l;
  }
  out.push(current);
  return out.join("\r\n ");
}

interface IcsEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
  location?: string;
  description?: string;
}

function calendar(name: string, events: IcsEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AkrediteSinav//Sinav Programi//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Europe/Istanbul",
  ];
  events.forEach((e) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@akredite-sinav`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${e.start}`,
      `DTEND:${e.end}`,
      `SUMMARY:${escapeText(e.summary)}`,
      ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
      ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Sınav görevi yaklaşıyor",
      "TRIGGER:-PT30M",
      "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export interface IcsCtx {
  inst: Institution;
  schedule: Schedule;
  courses: Course[];
  rooms: Room[];
  invigilators: Invigilator[];
}

/** Bir gözetmenin tüm görevleri */
export function invigilatorIcs(ctx: IcsCtx, inv: Invigilator): { fileName: string; content: string } {
  const dates = scheduleDates(ctx.schedule.settings);
  const events: IcsEvent[] = dutiesOf(ctx.schedule, inv.id).map(({ entry, roomId }) => {
    const c = ctx.courses.find((x) => x.id === entry.courseId);
    const s = ctx.schedule.settings.slots.find((x) => x.id === entry.slotId);
    const room = ctx.rooms.find((r) => r.id === roomId);
    const alloc = entry.rooms.find((r) => r.roomId === roomId);
    const others = (alloc?.invigilatorIds ?? [])
      .filter((id) => id !== inv.id)
      .map((id) => ctx.invigilators.find((i) => i.id === id))
      .filter(Boolean)
      .map((i) => `${i!.title} ${i!.name}`);
    const date = dates[entry.dayIndex] ?? ctx.schedule.settings.startDate;
    return {
      uid: `${entry.id}-${roomId}-${inv.id}`,
      start: toUtcStamp(date, s?.start ?? "09:00"),
      end: toUtcStamp(date, s?.end ?? "10:00"),
      summary: `Gözetmenlik: ${c?.code ?? ""} ${c?.name ?? ""} — ${room?.name ?? ""}`,
      location: `${room?.name ?? ""}${room?.building ? `, ${room.building}` : ""} — ${ctx.inst.unitName}`,
      description: `${ctx.schedule.settings.periodName}\nÖğrenci: ${alloc?.studentCount ?? ""}\nBirlikte görevli: ${others.join(", ") || "—"}\nSınav evrakını 15 dk önce bölüm sekreterliğinden teslim alınız.`,
    };
  });
  return {
    fileName: `${safeFileName(`Gozetmenlik_${inv.name}`)}.ics`,
    content: calendar(`Gözetmenlik — ${inv.title} ${inv.name}`, events),
  };
}

/** Bölümün tüm sınav programı (ilan panosu takvimi) */
export function scheduleIcs(ctx: IcsCtx): { fileName: string; content: string } {
  const dates = scheduleDates(ctx.schedule.settings);
  const events: IcsEvent[] = ctx.schedule.entries.map((e) => {
    const c = ctx.courses.find((x) => x.id === e.courseId);
    const s = ctx.schedule.settings.slots.find((x) => x.id === e.slotId);
    const date = dates[e.dayIndex] ?? ctx.schedule.settings.startDate;
    const rooms = e.rooms.map((r) => ctx.rooms.find((x) => x.id === r.roomId)?.name).filter(Boolean).join(" + ");
    return {
      uid: `${e.id}-exam`,
      start: toUtcStamp(date, s?.start ?? "09:00"),
      end: toUtcStamp(date, s?.end ?? "10:00"),
      summary: `Sınav: ${c?.code ?? ""} ${c?.name ?? ""} (${c?.classYear ?? ""}. sınıf)`,
      location: rooms,
      description: `${ctx.schedule.settings.periodName}\nÖğretim elemanı: ${c?.instructor ?? ""}\nÖğrenci sayısı: ${c?.studentCount ?? ""}`,
    };
  });
  return {
    fileName: `${safeFileName(ctx.schedule.settings.periodName)}_Sinav_Takvimi.ics`,
    content: calendar(ctx.schedule.settings.periodName, events),
  };
}

export function downloadIcs(file: { fileName: string; content: string }) {
  const blob = new Blob([file.content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
