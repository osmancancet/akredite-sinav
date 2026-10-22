// Çakışmasız Sınav Programı & Adil Gözetmen Dağıtım Motoru
// docs/MEDEK_AND_OPERATIONS_SPEC.md Bölüm 3 — kesin ve yumuşak kısıtlar.

import type {
  Course,
  Invigilator,
  Room,
  Schedule,
  ScheduleEntry,
  ScheduleRoomAllocation,
  ScheduleSettings,
} from "./types";
import { createRng, mean, parseIsoDate, stdDev, toIsoDate, uid } from "./utils";

export const slotKey = (dayIndex: number, slotId: string) => `${dayIndex}|${slotId}`;

/** Programdaki gün indekslerinin takvim tarihleri (hafta sonu atlama dahil). */
export function scheduleDates(settings: ScheduleSettings): string[] {
  const out: string[] = [];
  if (!settings.startDate) return out;
  const d = parseIsoDate(settings.startDate);
  let guard = 0;
  while (out.length < settings.dayCount && guard < 400) {
    const dow = d.getDay();
    if (!settings.skipWeekends || (dow !== 0 && dow !== 6)) out.push(toIsoDate(d));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Doluluk durumu (occupancy) takibi
// ---------------------------------------------------------------------------

class Occupancy {
  rooms = new Set<string>();
  classes = new Map<string, Set<number>>();
  classDay = new Map<string, number>();
  inv = new Set<string>();
  invCount = new Map<string, number>();
  invDaily = new Map<string, number>();
  dayLoad = new Map<number, number>();

  constructor(private courseById: Map<string, Course>) {}

  addEntry(e: ScheduleEntry, withInvigilators = true) {
    const course = this.courseById.get(e.courseId);
    const key = slotKey(e.dayIndex, e.slotId);
    e.rooms.forEach((r) => this.rooms.add(`${key}#${r.roomId}`));
    if (course) {
      if (!this.classes.has(key)) this.classes.set(key, new Set());
      this.classes.get(key)!.add(course.classYear);
      const cd = `${e.dayIndex}#${course.classYear}`;
      this.classDay.set(cd, (this.classDay.get(cd) ?? 0) + 1);
    }
    this.dayLoad.set(e.dayIndex, (this.dayLoad.get(e.dayIndex) ?? 0) + 1);
    if (withInvigilators) e.rooms.forEach((r) => r.invigilatorIds.forEach((id) => this.addDuty(id, e.dayIndex, e.slotId)));
  }

  addDuty(invId: string, dayIndex: number, slotId: string) {
    this.inv.add(`${slotKey(dayIndex, slotId)}#${invId}`);
    this.invCount.set(invId, (this.invCount.get(invId) ?? 0) + 1);
    const dk = `${invId}#${dayIndex}`;
    this.invDaily.set(dk, (this.invDaily.get(dk) ?? 0) + 1);
  }

  removeDuty(invId: string, dayIndex: number, slotId: string) {
    this.inv.delete(`${slotKey(dayIndex, slotId)}#${invId}`);
    this.invCount.set(invId, (this.invCount.get(invId) ?? 1) - 1);
    const dk = `${invId}#${dayIndex}`;
    this.invDaily.set(dk, (this.invDaily.get(dk) ?? 1) - 1);
  }

  invFree(inv: Invigilator, dayIndex: number, slotId: string): boolean {
    const key = slotKey(dayIndex, slotId);
    if (inv.unavailable.includes(key)) return false;
    if (this.inv.has(`${key}#${inv.id}`)) return false;
    if ((this.invDaily.get(`${inv.id}#${dayIndex}`) ?? 0) >= Math.max(1, inv.maxDailyDuties)) return false;
    return true;
  }
}

// ---------------------------------------------------------------------------
// Derslik bölme
// ---------------------------------------------------------------------------

export function allocateRooms(freeRooms: Room[], students: number): Room[] | null {
  if (students <= 0) return [];
  const single = freeRooms.filter((r) => r.capacity >= students).sort((a, b) => a.capacity - b.capacity)[0];
  if (single) return [single];
  const sorted = [...freeRooms].sort((a, b) => b.capacity - a.capacity);
  const picked: Room[] = [];
  let sum = 0;
  for (const r of sorted) {
    if (sum >= students) break;
    picked.push(r);
    sum += r.capacity;
  }
  if (sum < students) return null;
  // Son seçilen dersliği, ihtiyacı karşılayan en küçük derslikle değiştirerek israfı azalt.
  const last = picked[picked.length - 1];
  const need = students - (sum - last.capacity);
  const better = freeRooms
    .filter((r) => !picked.includes(r) && r.capacity >= need && r.capacity < last.capacity)
    .sort((a, b) => a.capacity - b.capacity)[0];
  if (better) picked[picked.length - 1] = better;
  return picked;
}

export function splitStudents(rooms: Room[], students: number): number[] {
  const capSum = rooms.reduce((s, r) => s + r.capacity, 0);
  if (!capSum) return rooms.map(() => 0);
  const counts = rooms.map((r) => Math.min(r.capacity, Math.floor((students * r.capacity) / capSum)));
  let rest = students - counts.reduce((s, c) => s + c, 0);
  let i = 0;
  while (rest > 0 && i < rooms.length * 4) {
    const idx = i % rooms.length;
    if (counts[idx] < rooms[idx].capacity) {
      counts[idx]++;
      rest--;
    }
    i++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Ana çözücü
// ---------------------------------------------------------------------------

export interface SolverInput {
  courses: Course[];
  rooms: Room[];
  invigilators: Invigilator[];
  settings: ScheduleSettings;
  keepLocked?: ScheduleEntry[];
  seed?: number;
}

export function solveSchedule(input: SolverInput): Schedule {
  const { rooms, invigilators, settings } = input;
  const courses = input.courses.filter((c) => settings.courseIds.includes(c.id));
  const courseById = new Map(input.courses.map((c) => [c.id, c]));
  const occ = new Occupancy(courseById);
  const dates = scheduleDates(settings);
  const log: string[] = [];
  const entries: ScheduleEntry[] = [];
  const unplaced: string[] = [];
  const rng = createRng(input.seed ?? 20251117);

  // 1) Kilitli (elle taşınmış) girdileri koru
  const locked = (input.keepLocked ?? []).filter((e) => e.locked && courses.some((c) => c.id === e.courseId));
  locked.forEach((e) => {
    const copy: ScheduleEntry = { ...e, rooms: e.rooms.map((r) => ({ ...r, invigilatorIds: [] })) };
    entries.push(copy);
    occ.addEntry(copy, false);
  });
  if (locked.length) log.push(`${locked.length} kilitli sınav yerinde tutuldu.`);

  // 2) Zor dersleri önce yerleştir (kalabalık + aynı sınıf düzeyinde yoğun)
  const classLoad = new Map<number, number>();
  courses.forEach((c) => classLoad.set(c.classYear, (classLoad.get(c.classYear) ?? 0) + 1));
  const queue = courses
    .filter((c) => !locked.some((l) => l.courseId === c.id))
    .sort((a, b) => b.studentCount - a.studentCount || (classLoad.get(b.classYear) ?? 0) - (classLoad.get(a.classYear) ?? 0));

  for (const course of queue) {
    let best: { cost: number; day: number; slotId: string; picked: Room[] } | null = null;
    for (let day = 0; day < dates.length; day++) {
      settings.slots.forEach((slot, slotIdx) => {
        const key = slotKey(day, slot.id);
        // Kesin kısıt 1: Sınıf çakışması
        if (occ.classes.get(key)?.has(course.classYear)) return;
        // Kesin kısıt 2: Derslik çakışması ve kapasite
        const free = rooms.filter((r) => !occ.rooms.has(`${key}#${r.id}`));
        const picked = allocateRooms(free, course.studentCount);
        if (!picked) return;
        // Kesin kısıt 3: Yeterli müsait gözetmen
        const needed = picked.reduce((s, r) => s + Math.max(1, r.invigilatorsNeeded), 0);
        const availableInv = invigilators.filter((inv) => occ.invFree(inv, day, slot.id)).length;
        const committed = rooms
          .filter((r) => occ.rooms.has(`${key}#${r.id}`))
          .reduce((s, r) => s + Math.max(1, r.invigilatorsNeeded), 0);
        if (availableInv - committed < needed) return;

        // Yumuşak kısıtlar
        let cost = 0;
        const sameDay = occ.classDay.get(`${day}#${course.classYear}`) ?? 0;
        if (sameDay >= settings.maxExamsPerClassPerDay) cost += 1000;
        else cost += sameDay * 40;
        const neighbours = [settings.slots[slotIdx - 1], settings.slots[slotIdx + 1]].filter(Boolean);
        neighbours.forEach((n) => {
          if (occ.classes.get(slotKey(day, n.id))?.has(course.classYear)) cost += 25; // arada boş saat yok
        });
        cost += (occ.dayLoad.get(day) ?? 0) * 6; // günlere yay
        const capSum = picked.reduce((s, r) => s + r.capacity, 0);
        cost += (capSum - course.studentCount) / 8; // derslik israfı
        cost += picked.length * 3; // gereksiz bölmeden kaçın
        cost += slotIdx * 0.5 + day * 0.2 + rng() * 0.1;
        if (!best || cost < best.cost) best = { cost, day, slotId: slot.id, picked };
      });
    }
    if (!best) {
      unplaced.push(course.id);
      log.push(`⚠ ${course.code} ${course.name}: Kısıtları sağlayan uygun gün/saat/derslik bulunamadı.`);
      continue;
    }
    const chosen: { cost: number; day: number; slotId: string; picked: Room[] } = best;
    const counts = splitStudents(chosen.picked, course.studentCount);
    const entry: ScheduleEntry = {
      id: uid("se"),
      courseId: course.id,
      dayIndex: chosen.day,
      slotId: chosen.slotId,
      rooms: chosen.picked.map((r, i) => ({ roomId: r.id, studentCount: counts[i], invigilatorIds: [] })),
      locked: false,
    };
    entries.push(entry);
    occ.addEntry(entry, false);
    if (chosen.picked.length > 1) {
      log.push(`${course.code}: ${course.studentCount} öğrenci ${chosen.picked.map((r) => r.name).join(" + ")} dersliklerine bölündü.`);
    }
  }

  entries.sort((a, b) => a.dayIndex - b.dayIndex || settings.slots.findIndex((s) => s.id === a.slotId) - settings.slots.findIndex((s) => s.id === b.slotId));
  const result: Schedule = { settings, entries, unplaced, generatedAt: new Date().toISOString(), log };
  const balanced = assignInvigilators(result, rooms, invigilators, input.seed ?? 7);
  balanced.log.unshift(
    `${entries.length - locked.length} sınav otomatik yerleştirildi, ${unplaced.length} yerleştirilemedi.`,
  );
  return balanced;
}

// ---------------------------------------------------------------------------
// Adil gözetmen ataması (açgözlü + yerel iyileştirme ile standart sapma minimizasyonu)
// ---------------------------------------------------------------------------

export function assignInvigilators(
  schedule: Schedule,
  rooms: Room[],
  invigilators: Invigilator[],
  seed = 7,
): Schedule {
  const rng = createRng(seed);
  const tiebreak = new Map(invigilators.map((i) => [i.id, rng()]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const occ = new Occupancy(new Map());
  const entries = schedule.entries.map((e) => ({
    ...e,
    rooms: e.rooms.map((r) => ({ ...r, invigilatorIds: [] as string[] })),
  }));
  const log = [...schedule.log];
  let missing = 0;

  for (const e of entries) {
    for (const alloc of e.rooms) {
      const need = Math.max(1, roomById.get(alloc.roomId)?.invigilatorsNeeded ?? 1);
      for (let k = 0; k < need; k++) {
        const cand = invigilators
          .filter((inv) => occ.invFree(inv, e.dayIndex, e.slotId))
          .sort(
            (a, b) =>
              (occ.invCount.get(a.id) ?? 0) - (occ.invCount.get(b.id) ?? 0) ||
              (occ.invDaily.get(`${a.id}#${e.dayIndex}`) ?? 0) - (occ.invDaily.get(`${b.id}#${e.dayIndex}`) ?? 0) ||
              (tiebreak.get(a.id) ?? 0) - (tiebreak.get(b.id) ?? 0),
          )[0];
        if (!cand) {
          missing++;
          continue;
        }
        alloc.invigilatorIds.push(cand.id);
        occ.addDuty(cand.id, e.dayIndex, e.slotId);
      }
    }
  }

  // Yerel iyileştirme: en yüklüden en az yüklüye görev aktar
  let improved = true;
  let iter = 0;
  while (improved && iter < 500) {
    improved = false;
    iter++;
    const sorted = [...invigilators].sort((a, b) => (occ.invCount.get(b.id) ?? 0) - (occ.invCount.get(a.id) ?? 0));
    outer: for (const heavy of sorted) {
      for (const light of [...sorted].reverse()) {
        const diff = (occ.invCount.get(heavy.id) ?? 0) - (occ.invCount.get(light.id) ?? 0);
        if (diff < 2) continue;
        for (const e of entries) {
          for (const alloc of e.rooms) {
            const idx = alloc.invigilatorIds.indexOf(heavy.id);
            if (idx === -1) continue;
            if (!occ.invFree(light, e.dayIndex, e.slotId)) continue;
            alloc.invigilatorIds[idx] = light.id;
            occ.removeDuty(heavy.id, e.dayIndex, e.slotId);
            occ.addDuty(light.id, e.dayIndex, e.slotId);
            improved = true;
            break outer;
          }
        }
      }
    }
  }

  const filtered = log.filter((l) => !l.startsWith("Gözetmen"));
  filtered.push(
    missing
      ? `Gözetmen ataması: ${missing} görev için müsait gözetmen bulunamadı.`
      : `Gözetmen ataması tamamlandı. Adalet skoru: %${fairnessScore(invigilatorLoads({ ...schedule, entries }, invigilators).map((l) => l.count)).toFixed(1)}`,
  );
  return { ...schedule, entries, log: filtered };
}

// ---------------------------------------------------------------------------
// Elle taşıma (sürükle-bırak)
// ---------------------------------------------------------------------------

export function moveEntry(
  schedule: Schedule,
  entryId: string,
  dayIndex: number,
  slotId: string,
  courses: Course[],
  rooms: Room[],
  invigilators: Invigilator[],
): Schedule {
  const entry = schedule.entries.find((e) => e.id === entryId);
  if (!entry) return schedule;
  const course = courses.find((c) => c.id === entry.courseId);
  const others = schedule.entries.filter((e) => e.id !== entryId);
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const occ = new Occupancy(courseById);
  others.forEach((e) => occ.addEntry(e, true));
  const key = slotKey(dayIndex, slotId);
  const free = rooms.filter((r) => !occ.rooms.has(`${key}#${r.id}`));

  let allocs: ScheduleRoomAllocation[];
  const sameRoomsFree = entry.rooms.every((r) => free.some((f) => f.id === r.roomId));
  if (sameRoomsFree) {
    allocs = entry.rooms.map((r) => ({ ...r, invigilatorIds: [] }));
  } else {
    const picked = allocateRooms(free, course?.studentCount ?? 0);
    if (picked) {
      const counts = splitStudents(picked, course?.studentCount ?? 0);
      allocs = picked.map((r, i) => ({ roomId: r.id, studentCount: counts[i], invigilatorIds: [] }));
    } else {
      allocs = entry.rooms.map((r) => ({ ...r, invigilatorIds: [] })); // çakışma denetçisi raporlar
    }
  }
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  allocs.forEach((alloc) => {
    const previous = entry.rooms.flatMap((r) => r.invigilatorIds);
    const need = Math.max(1, roomById.get(alloc.roomId)?.invigilatorsNeeded ?? 1);
    for (let k = 0; k < need; k++) {
      const pool = invigilators.filter((inv) => occ.invFree(inv, dayIndex, slotId));
      const keep = pool.find((p) => previous.includes(p.id));
      const pick = keep ?? pool.sort((a, b) => (occ.invCount.get(a.id) ?? 0) - (occ.invCount.get(b.id) ?? 0))[0];
      if (!pick) break;
      alloc.invigilatorIds.push(pick.id);
      occ.addDuty(pick.id, dayIndex, slotId);
    }
  });
  const moved: ScheduleEntry = { ...entry, dayIndex, slotId, rooms: allocs, locked: true };
  const entries = [...others, moved].sort(
    (a, b) =>
      a.dayIndex - b.dayIndex ||
      schedule.settings.slots.findIndex((s) => s.id === a.slotId) - schedule.settings.slots.findIndex((s) => s.id === b.slotId),
  );
  return {
    ...schedule,
    entries,
    unplaced: schedule.unplaced.filter((id) => id !== entry.courseId),
    log: [...schedule.log.slice(-30), `${course?.code ?? "Sınav"} elle taşındı ve kilitlendi.`],
  };
}

/** Yerleştirilemeyen bir dersi seçilen hücreye elle ekler. */
export function placeCourse(
  schedule: Schedule,
  courseId: string,
  dayIndex: number,
  slotId: string,
  courses: Course[],
  rooms: Room[],
  invigilators: Invigilator[],
): Schedule {
  const temp: ScheduleEntry = { id: uid("se"), courseId, dayIndex, slotId, rooms: [], locked: true };
  const withTemp = { ...schedule, entries: [...schedule.entries, temp] };
  const course = courses.find((c) => c.id === courseId);
  const occRooms = new Set(
    schedule.entries.filter((e) => e.dayIndex === dayIndex && e.slotId === slotId).flatMap((e) => e.rooms.map((r) => r.roomId)),
  );
  const picked = allocateRooms(rooms.filter((r) => !occRooms.has(r.id)), course?.studentCount ?? 0) ?? [];
  const counts = splitStudents(picked, course?.studentCount ?? 0);
  temp.rooms = picked.map((r, i) => ({ roomId: r.id, studentCount: counts[i], invigilatorIds: [] }));
  return moveEntry(withTemp, temp.id, dayIndex, slotId, courses, rooms, invigilators);
}

// ---------------------------------------------------------------------------
// Çakışma denetçisi ve adalet ölçümü
// ---------------------------------------------------------------------------

export interface Conflict {
  severity: "hard" | "soft";
  message: string;
  entryIds: string[];
}

export function detectConflicts(
  schedule: Schedule,
  courses: Course[],
  rooms: Room[],
  invigilators: Invigilator[],
): Conflict[] {
  const out: Conflict[] = [];
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const invById = new Map(invigilators.map((i) => [i.id, i]));
  const dates = scheduleDates(schedule.settings);
  const slotLabel = (e: ScheduleEntry) => {
    const s = schedule.settings.slots.find((x) => x.id === e.slotId);
    return `${dates[e.dayIndex] ?? `Gün ${e.dayIndex + 1}`} ${s?.start ?? ""}`;
  };

  const bySlot = new Map<string, ScheduleEntry[]>();
  schedule.entries.forEach((e) => {
    const k = slotKey(e.dayIndex, e.slotId);
    if (!bySlot.has(k)) bySlot.set(k, []);
    bySlot.get(k)!.push(e);
  });

  bySlot.forEach((list) => {
    // Sınıf çakışması
    const byClass = new Map<number, ScheduleEntry[]>();
    list.forEach((e) => {
      const c = courseById.get(e.courseId);
      if (!c) return;
      if (!byClass.has(c.classYear)) byClass.set(c.classYear, []);
      byClass.get(c.classYear)!.push(e);
    });
    byClass.forEach((es, year) => {
      if (es.length > 1) {
        out.push({
          severity: "hard",
          message: `${slotLabel(es[0])}: ${year}. sınıfın ${es.map((e) => courseById.get(e.courseId)?.code).join(", ")} sınavları çakışıyor.`,
          entryIds: es.map((e) => e.id),
        });
      }
    });
    // Derslik çakışması
    const byRoom = new Map<string, ScheduleEntry[]>();
    list.forEach((e) =>
      e.rooms.forEach((r) => {
        if (!byRoom.has(r.roomId)) byRoom.set(r.roomId, []);
        byRoom.get(r.roomId)!.push(e);
      }),
    );
    byRoom.forEach((es, roomId) => {
      if (es.length > 1) {
        out.push({
          severity: "hard",
          message: `${slotLabel(es[0])}: ${roomById.get(roomId)?.name} dersliğinde aynı anda ${es.length} sınav var.`,
          entryIds: es.map((e) => e.id),
        });
      }
    });
    // Gözetmen çakışması
    const byInv = new Map<string, ScheduleEntry[]>();
    list.forEach((e) =>
      e.rooms.forEach((r) =>
        r.invigilatorIds.forEach((id) => {
          if (!byInv.has(id)) byInv.set(id, []);
          byInv.get(id)!.push(e);
        }),
      ),
    );
    byInv.forEach((es, invId) => {
      if (es.length > 1) {
        out.push({
          severity: "hard",
          message: `${slotLabel(es[0])}: ${invById.get(invId)?.name} aynı saatte ${es.length} göreve atanmış.`,
          entryIds: es.map((e) => e.id),
        });
      }
    });
  });

  schedule.entries.forEach((e) => {
    const c = courseById.get(e.courseId);
    const label = c ? `${c.code} ${c.name}` : "Sınav";
    const seats = e.rooms.reduce((s, r) => s + r.studentCount, 0);
    e.rooms.forEach((r) => {
      const room = roomById.get(r.roomId);
      if (room && r.studentCount > room.capacity) {
        out.push({ severity: "hard", message: `${label}: ${room.name} kapasitesi (${room.capacity}) aşıldı (${r.studentCount}).`, entryIds: [e.id] });
      }
      const need = Math.max(1, room?.invigilatorsNeeded ?? 1);
      if (r.invigilatorIds.length < need) {
        out.push({ severity: "hard", message: `${label}: ${room?.name} için ${need - r.invigilatorIds.length} gözetmen eksik.`, entryIds: [e.id] });
      }
      r.invigilatorIds.forEach((id) => {
        const inv = invById.get(id);
        if (inv?.unavailable.includes(slotKey(e.dayIndex, e.slotId))) {
          out.push({ severity: "hard", message: `${label}: ${inv.name} bu saatte "Müsait Değil" olarak işaretli.`, entryIds: [e.id] });
        }
      });
    });
    if (c && seats < c.studentCount) {
      out.push({ severity: "hard", message: `${label}: ${c.studentCount} öğrenciye karşın ${seats} sıra ayrılmış.`, entryIds: [e.id] });
    }
  });

  // Yumuşak kısıt: günde en fazla N sınav
  const classDay = new Map<string, ScheduleEntry[]>();
  schedule.entries.forEach((e) => {
    const c = courseById.get(e.courseId);
    if (!c) return;
    const k = `${e.dayIndex}#${c.classYear}`;
    if (!classDay.has(k)) classDay.set(k, []);
    classDay.get(k)!.push(e);
  });
  classDay.forEach((es, k) => {
    const [day, year] = k.split("#");
    if (es.length > schedule.settings.maxExamsPerClassPerDay) {
      out.push({
        severity: "soft",
        message: `${dates[Number(day)] ?? ""}: ${year}. sınıfa aynı gün ${es.length} sınav konulmuş (öneri ≤ ${schedule.settings.maxExamsPerClassPerDay}).`,
        entryIds: es.map((e) => e.id),
      });
    }
  });
  return out;
}

export function invigilatorLoads(schedule: Schedule, invigilators: Invigilator[]) {
  const counts = new Map(invigilators.map((i) => [i.id, 0]));
  schedule.entries.forEach((e) => e.rooms.forEach((r) => r.invigilatorIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))));
  return invigilators.map((inv) => ({ inv, count: counts.get(inv.id) ?? 0 }));
}

/** Adalet Skoru = 100 × (1 − σ/μ) — tüm görev sayıları eşitse %100. */
export function fairnessScore(counts: number[]): number {
  const m = mean(counts);
  if (m === 0) return 100;
  return Math.max(0, 100 * (1 - stdDev(counts) / m));
}

export function dutiesOf(schedule: Schedule, invigilatorId: string) {
  const out: { entry: ScheduleEntry; roomId: string }[] = [];
  schedule.entries.forEach((e) =>
    e.rooms.forEach((r) => {
      if (r.invigilatorIds.includes(invigilatorId)) out.push({ entry: e, roomId: r.roomId });
    }),
  );
  return out;
}
