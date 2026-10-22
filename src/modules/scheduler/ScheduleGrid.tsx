"use client";

import * as React from "react";
import { GripVertical, Lock, LockOpen, Users } from "lucide-react";
import type { Course, Invigilator, Room, Schedule } from "@/lib/types";
import { moveEntry, placeCourse, scheduleDates, type Conflict } from "@/lib/scheduler";
import { cn, formatTrDate, trDayName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

const CLASS_TONES = ["bg-sky-50 border-sky-200", "bg-violet-50 border-violet-200", "bg-amber-50 border-amber-200", "bg-teal-50 border-teal-200"];

export function ScheduleGrid({
  schedule,
  courses,
  rooms,
  invigilators,
  conflicts,
  onChange,
}: {
  schedule: Schedule;
  courses: Course[];
  rooms: Room[];
  invigilators: Invigilator[];
  conflicts: Conflict[];
  onChange: (s: Schedule) => void;
}) {
  const dates = scheduleDates(schedule.settings);
  const [over, setOver] = React.useState<string | null>(null);
  const conflictIds = new Set(conflicts.filter((c) => c.severity === "hard").flatMap((c) => c.entryIds));
  const softIds = new Set(conflicts.filter((c) => c.severity === "soft").flatMap((c) => c.entryIds));
  const unplaced = courses.filter((c) => schedule.settings.courseIds.includes(c.id) && !schedule.entries.some((e) => e.courseId === c.id));

  const onDrop = (e: React.DragEvent, day: number, slotId: string) => {
    e.preventDefault();
    setOver(null);
    const entryId = e.dataTransfer.getData("text/entry");
    const courseId = e.dataTransfer.getData("text/course");
    if (entryId) onChange(moveEntry(schedule, entryId, day, slotId, courses, rooms, invigilators));
    else if (courseId) onChange(placeCourse(schedule, courseId, day, slotId, courses, rooms, invigilators));
    toast.info("Sınav taşındı ve kilitlendi", "Derslik ve gözetmenler yeni dilime göre yeniden atandı.");
  };

  return (
    <div className="space-y-3">
      {unplaced.length > 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">
          <div className="mb-2 text-xs font-semibold text-amber-800">Yerleştirilmemiş dersler — takvime sürükleyin</div>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/course", c.id)}
                className="cursor-grab rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm"
              >
                {c.code} · {c.classYear}. sınıf · {c.studentCount} öğr.
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] table-fixed border-collapse">
          <thead>
            <tr>
              <th className="w-20 border-b border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-500">Saat</th>
              {dates.map((d) => (
                <th key={d} className="border-b border-l border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700">
                  {trDayName(d)}
                  <div className="font-normal text-slate-500">{formatTrDate(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.settings.slots.map((slot) => (
              <tr key={slot.id}>
                <td className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600">
                  {slot.start}
                  <div className="font-normal text-slate-400">{slot.end}</div>
                </td>
                {dates.map((d, di) => {
                  const key = `${di}|${slot.id}`;
                  const entries = schedule.entries.filter((e) => e.dayIndex === di && e.slotId === slot.id);
                  return (
                    <td
                      key={key}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setOver(key);
                      }}
                      onDragLeave={() => setOver((o) => (o === key ? null : o))}
                      onDrop={(e) => onDrop(e, di, slot.id)}
                      className={cn("h-28 border-b border-l border-slate-200 p-1.5 align-top transition-colors", over === key && "bg-indigo-50 ring-2 ring-inset ring-indigo-300")}
                    >
                      <div className="space-y-1.5">
                        {entries.map((e) => {
                          const c = courses.find((x) => x.id === e.courseId);
                          const invCount = e.rooms.reduce((s, r) => s + r.invigilatorIds.length, 0);
                          return (
                            <div
                              key={e.id}
                              draggable
                              onDragStart={(ev) => ev.dataTransfer.setData("text/entry", e.id)}
                              className={cn(
                                "group cursor-grab rounded-lg border px-2 py-1.5 text-[11px] shadow-sm active:cursor-grabbing",
                                CLASS_TONES[((c?.classYear ?? 1) - 1) % CLASS_TONES.length],
                                conflictIds.has(e.id) && "border-red-400 ring-2 ring-red-300",
                                !conflictIds.has(e.id) && softIds.has(e.id) && "ring-1 ring-amber-300",
                              )}
                              title={`${c?.name}\n${e.rooms
                                .map((r) => `${rooms.find((x) => x.id === r.roomId)?.name}: ${r.studentCount} öğr. — ${r.invigilatorIds.map((id) => invigilators.find((i) => i.id === id)?.name).join(", ")}`)
                                .join("\n")}`}
                            >
                              <div className="flex items-center gap-1">
                                <GripVertical className="h-3 w-3 text-slate-400" />
                                <span className="font-bold text-slate-900">{c?.code}</span>
                                <Badge className="px-1.5 py-0 text-[9.5px]">{c?.classYear}. sınıf</Badge>
                                <button
                                  className="ml-auto text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title={e.locked ? "Kilidi aç (otomatik dağıtım yeniden yerleştirebilir)" : "Kilitle (otomatik dağıtımda yerinde kalır)"}
                                  onClick={() => onChange({ ...schedule, entries: schedule.entries.map((x) => (x.id === e.id ? { ...x, locked: !x.locked } : x)) })}
                                >
                                  {e.locked ? <Lock className="h-3 w-3 text-indigo-600" /> : <LockOpen className="h-3 w-3" />}
                                </button>
                              </div>
                              <div className="truncate text-slate-700">{c?.name}</div>
                              <div className="mt-0.5 flex items-center justify-between text-slate-500">
                                <span className="truncate">{e.rooms.map((r) => rooms.find((x) => x.id === r.roomId)?.name).join(" + ")}</span>
                                <span className="flex items-center gap-0.5">
                                  <Users className="h-3 w-3" />
                                  {invCount}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
