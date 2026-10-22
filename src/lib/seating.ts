// Kelebek (Anti-Kopya) / Numara Sıralı Oturma Düzeni Motoru
// docs/MEDEK_AND_OPERATIONS_SPEC.md Bölüm 4

import type { Room, RoomSeating, SeatingMode, SeatingPlan, Student } from "./types";
import { seededShuffle } from "./utils";
import { splitStudents } from "./scheduler";

export function compareStudentNo(a: Student, b: Student) {
  return a.no.localeCompare(b.no, "tr", { numeric: true });
}

export function buildSeatingPlan(
  examId: string,
  students: Student[],
  rooms: Room[],
  mode: SeatingMode,
  seed: number,
  alternateBooklets = true,
): SeatingPlan {
  const ordered =
    mode === "butterfly" ? seededShuffle(students, seed) : [...students].sort(compareStudentNo);
  const counts = splitStudents(rooms, ordered.length);
  let cursor = 0;
  const roomSeatings: RoomSeating[] = rooms.map((room, ri) => {
    const slice = ordered.slice(cursor, cursor + counts[ri]);
    cursor += counts[ri];
    return {
      roomId: room.id,
      seats: slice.map((s, i) => ({
        seatNo: i + 1,
        studentId: s.id,
        // Kelebek düzeni: yan yana oturan öğrenciler farklı kitapçık alır (A-B-A-B)
        booklet: alternateBooklets ? (i % 2 === 0 ? "A" : "B") : "A",
      })),
    };
  });
  return {
    examId,
    mode,
    seed,
    roomIds: rooms.map((r) => r.id),
    rooms: roomSeatings,
    generatedAt: new Date().toISOString(),
  };
}

export function seatingCapacity(rooms: Room[]) {
  return rooms.reduce((s, r) => s + r.capacity, 0);
}

/** OBS listesini (xlsx/csv satırları) ayrıştırır. Başlık satırını otomatik tanır. */
export function parseStudentRows(rows: unknown[][]): Student[] {
  const norm = (v: unknown) => String(v ?? "").trim();
  const lower = (v: unknown) => norm(v).toLocaleLowerCase("tr-TR");
  let headerIdx = rows.findIndex((r) =>
    r.some((c) => /numara|öğrenci no|ogrenci no|no$|student/.test(lower(c))),
  );
  let noCol = 0;
  let nameCol = 1;
  let surnameCol = -1;
  if (headerIdx >= 0) {
    const h = rows[headerIdx].map(lower);
    noCol = h.findIndex((c) => /numara|öğrenci no|ogrenci no|^no$|student/.test(c));
    const fullIdx = h.findIndex((c) => /ad[ıi]?\s*soyad|ad soyad|isim|name/.test(c));
    const adIdx = h.findIndex((c) => /^ad[ıi]?$|^adı$|first/.test(c));
    const soyadIdx = h.findIndex((c) => /soyad|last/.test(c));
    if (fullIdx >= 0 && !(adIdx >= 0 && soyadIdx >= 0 && soyadIdx !== fullIdx)) {
      nameCol = fullIdx;
    } else if (adIdx >= 0) {
      nameCol = adIdx;
      surnameCol = soyadIdx;
    } else {
      nameCol = noCol === 0 ? 1 : 0;
    }
    if (noCol < 0) noCol = 0;
  } else {
    headerIdx = -1;
  }
  const out: Student[] = [];
  rows.slice(headerIdx + 1).forEach((r, i) => {
    const no = norm(r[noCol]).replace(/\.0$/, "");
    if (!/\d{3,}/.test(no)) return;
    let first = norm(r[nameCol]);
    let last = surnameCol >= 0 ? norm(r[surnameCol]) : "";
    if (!last && first.includes(" ")) {
      const parts = first.split(/\s+/);
      last = parts.pop() ?? "";
      first = parts.join(" ");
    }
    out.push({ id: `st_${no}_${i}`, no, firstName: first, lastName: last.toLocaleUpperCase("tr-TR") });
  });
  return dedupe(out);
}

/** Kopyala-yapıştır metni: "230101001 Ahmet Yılmaz" veya sekmeli/noktalı virgüllü satırlar. */
export function parseStudentText(text: string): Student[] {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes("\t")) return line.split("\t");
      if (line.includes(";")) return line.split(";");
      if (line.split(",").length >= 2 && /^\d+,/.test(line)) return line.split(",");
      const m = line.match(/^(\d{3,})\s+(.+)$/);
      return m ? [m[1], m[2]] : [line];
    });
  return parseStudentRows(rows);
}

function dedupe(list: Student[]): Student[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    if (seen.has(s.no)) return false;
    seen.add(s.no);
    return true;
  });
}

export function fullName(s: Student) {
  return `${s.firstName} ${s.lastName}`.trim();
}
