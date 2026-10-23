// MEDEK Öz Değerlendirme Raporu v1.1 (RP-002) tabloları: sütunlar şablondakiyle birebir.
// Yalnızca uygulamada verisi bulunan hücreler doldurulur; diğerleri kurum tarafından doldurulmak üzere boş kalır.

import type { Course, VaultData } from "@/lib/types";

export const ODR_SOURCE = "https://www.medek.org.tr/belgeler/3b671af3-be27-415b-b635-132b40768372/indir (ÖDR v1.1, s. 7–8)";

export const T51_HEADER = [
  "Ders Adı",
  "Öğretim Dili",
  "Zorunlu/ Seçmeli (Z/S)",
  "Kategori: Programa/alana özgü mesleki dersler (AKTS)",
  "Dış paydaş önerilerinin dikkate alındığı dersler (AKTS)",
  "İşletmede Mesleki Eğitim, Staj ve Uygulamalı Ders ve/veya güncel mesleki program/yazılım içeren ders/dersler (AKTS)",
  "Diğer Dersler (AKTS)",
];
export const T52_HEADER = ["Dersin Kodu", "Dersin Adı", "Son İki Yarıyılda Dersi Seçen Öğrenci Sayısı", "Sınıf Dersi", "Laboratuvar", "Uygulama", "Diğer"];
export const T61_HEADER = ["Öğretim Elemanının Adı", "Unvanı", "Kamu/ Sanayi Deneyimi (yıl)", "Öğretim Deneyimi (yıl)", "Bu Kurumdaki Deneyimi (yıl)"];
export const T62_HEADER = ["Öğretim Elemanının Adı Soyadı (Unvanı)", "Verdiği Dersler (Dersin Kodu/ Kredisi/ Dönemi/ Yılı)", "Öğretim (%)", "Araştırma (%)", "Diğer (%)"];

const TITLES = [
  "Prof. Dr.",
  "Doç. Dr.",
  "Dr. Öğr. Üyesi",
  "Öğr. Gör. Dr.",
  "Dr. Öğr. Gör.",
  "Öğr. Gör.",
  "Arş. Gör. Dr.",
  "Arş. Gör.",
  "Uzm.",
  "Okt.",
];

/** "Dr. Öğr. Üyesi Ayşe Yılmaz" → { title: "Dr. Öğr. Üyesi", name: "Ayşe Yılmaz" } */
export function splitTitle(full: string): { title: string; name: string } {
  const s = full.trim().replace(/\s+/g, " ");
  for (const t of TITLES) if (s.startsWith(t + " ")) return { title: t, name: s.slice(t.length + 1) };
  return { title: "", name: s };
}

const bySemester = (a: Course, b: Course) => a.semesterNo - b.semesterNo || a.code.localeCompare(b.code, "tr");

export interface T51Group {
  semester: number;
  rows: { cells: string[]; ects: number }[];
}

/** Tablo 5.1: yarıyıl grupları; AKTS ilgili kategori sütununa kurumca taşınmak üzere ayrıca verilir */
export function table51(data: Pick<VaultData, "courses">): T51Group[] {
  const groups = new Map<number, T51Group>();
  [...data.courses].sort(bySemester).forEach((c) => {
    const g = groups.get(c.semesterNo) ?? { semester: c.semesterNo, rows: [] };
    g.rows.push({ cells: [c.name, "", "", "", "", "", ""], ects: c.ects });
    groups.set(c.semesterNo, g);
  });
  return [...groups.values()].sort((a, b) => a.semester - b.semester);
}

/** Tablo 5.2: öğrenci sayısı = uygulamadaki kayıtlı öğrenci listesi (yoksa ders kartındaki sayı) */
export function table52(data: Pick<VaultData, "courses" | "students">): string[][] {
  return [...data.courses].sort(bySemester).map((c) => {
    const n = data.students[c.id]?.length || c.studentCount || 0;
    return [c.code, c.name, n ? String(n) : "", "", "", "", ""];
  });
}

function instructors(data: Pick<VaultData, "courses">): { full: string; courses: Course[] }[] {
  const map = new Map<string, Course[]>();
  [...data.courses].sort(bySemester).forEach((c) => {
    const k = c.instructor.trim();
    if (!k) return;
    map.set(k, [...(map.get(k) ?? []), c]);
  });
  return [...map.entries()].map(([full, courses]) => ({ full, courses })).sort((a, b) => splitTitle(a.full).name.localeCompare(splitTitle(b.full).name, "tr"));
}

export function table61(data: Pick<VaultData, "courses">): string[][] {
  return instructors(data).map(({ full }) => {
    const { title, name } = splitTitle(full);
    return [name, title, "", "", ""];
  });
}

export function table62(data: Pick<VaultData, "courses" | "institution">): string[][] {
  const year = data.institution.academicYear;
  return instructors(data).map(({ full, courses }) => {
    const { title, name } = splitTitle(full);
    const list = courses.map((c) => `${c.code} / ${c.credit} kredi, ${c.ects} AKTS / ${c.semesterNo}. yarıyıl / ${year}`).join("; ");
    return [title ? `${name} (${title})` : name, list, "", "", ""];
  });
}
