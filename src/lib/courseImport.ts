// Ders kataloğu içe/dışa aktarma: Excel/CSV şablonu ve Bologna bilgi paketi metni ayrıştırıcı.

import * as XLSX from "xlsx";
import type { Course, ProgramOutcome } from "./types";
import { parseOutcomeLines } from "./textTools";
import { uid } from "./utils";

export interface CourseDraft {
  code: string;
  name: string;
  classYear: number;
  semesterNo: number;
  credit: number;
  ects: number;
  instructor: string;
  studentCount: number;
  examDurationMin: number;
  outcomes: string[];
  /** ÖÇ sırasına göre PÇ ağırlıkları (varsa) */
  matrix?: number[][];
}

export const emptyDraft = (): CourseDraft => ({
  code: "",
  name: "",
  classYear: 1,
  semesterNo: 1,
  credit: 3,
  ects: 4,
  instructor: "",
  studentCount: 40,
  examDurationMin: 60,
  outcomes: [],
});

const num = (v: unknown, d: number) => {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : d;
};

const normCode = (c: string) => c.toLocaleUpperCase("tr-TR").replace(/\s+/g, "").trim();

// ---------------------------------------------------------------------------
// Excel / CSV
// ---------------------------------------------------------------------------

const COURSE_HEADERS = ["Ders Kodu", "Ders Adı", "Sınıf", "Yarıyıl", "Kredi", "AKTS", "Öğretim Elemanı", "Öğrenci Sayısı", "Sınav Süresi (dk)"];

export function exportCatalogXlsx(courses: Course[], programOutcomes: ProgramOutcome[], fileName = "Ders_Katalogu.xlsx") {
  const wb = XLSX.utils.book_new();
  const rows = courses.length
    ? courses.map((c) => [c.code, c.name, c.classYear, c.semesterNo, c.credit, c.ects, c.instructor, c.studentCount, c.examDurationMin])
    : [["BLP201", "Veri Tabanı Yönetim Sistemleri", 2, 3, 4, 5, "Öğr. Gör. Dr. Ad SOYAD", 75, 60]];
  const ws = XLSX.utils.aoa_to_sheet([COURSE_HEADERS, ...rows]);
  ws["!cols"] = [12, 38, 7, 8, 7, 7, 30, 14, 16].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, "Dersler");

  const ocRows = courses.length
    ? courses.flatMap((c) => c.outcomes.map((o, i) => [c.code, i + 1, o.text]))
    : [
        ["BLP201", 1, "Veri tabanı kavramlarını ve VTYS mimarisini açıklar."],
        ["BLP201", 2, "Varlık-İlişki diyagramı çizerek ilişkisel veri tabanı tasarlar."],
      ];
  const os = XLSX.utils.aoa_to_sheet([["Ders Kodu", "ÖÇ No", "Öğrenme Çıktısı"], ...ocRows]);
  os["!cols"] = [{ wch: 12 }, { wch: 7 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, os, "Öğrenme Çıktıları");

  const mRows = courses.flatMap((c) => c.outcomes.map((o, i) => [c.code, i + 1, ...programOutcomes.map((_, j) => c.ocPcMatrix[o.id]?.[j] ?? 0)]));
  const ms = XLSX.utils.aoa_to_sheet([["Ders Kodu", "ÖÇ No", ...programOutcomes.map((p) => p.code)], ...mRows]);
  XLSX.utils.book_append_sheet(wb, ms, "ÖÇ-PÇ Matrisi");
  XLSX.writeFile(wb, fileName);
}

function sheetRows(wb: XLSX.WorkBook, names: string[]): Record<string, unknown>[] | null {
  const fold = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]/g, "");
  const target = names.map(fold);
  const name = wb.SheetNames.find((n) => target.includes(fold(n)));
  return name ? XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], { defval: "" }) : null;
}

function pick(row: Record<string, unknown>, ...prefixes: string[]): unknown {
  for (const k of Object.keys(row)) {
    const lk = k.toLocaleLowerCase("tr-TR").trim();
    if (prefixes.some((p) => lk.startsWith(p))) return row[k];
  }
  return "";
}

export async function readCatalogFile(file: File): Promise<CourseDraft[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const courseRows = sheetRows(wb, ["Dersler", "Ders", "Courses"]) ?? XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  const drafts = new Map<string, CourseDraft>();
  courseRows.forEach((r) => {
    const code = normCode(String(pick(r, "ders kodu", "kod", "code")));
    const name = String(pick(r, "ders adı", "ders adi", "ad", "name")).trim();
    if (!code || !name) return;
    drafts.set(code, {
      code,
      name,
      classYear: num(pick(r, "sınıf", "sinif", "class"), 1),
      semesterNo: num(pick(r, "yarıyıl", "yariyil", "dönem", "semester"), 1),
      credit: num(pick(r, "kredi", "credit"), 3),
      ects: num(pick(r, "akts", "ects"), 4),
      instructor: String(pick(r, "öğretim", "ogretim", "instructor", "hoca")).trim(),
      studentCount: num(pick(r, "öğrenci", "ogrenci", "student"), 40),
      examDurationMin: num(pick(r, "sınav süresi", "sinav suresi", "süre", "duration"), 60),
      outcomes: [],
    });
  });
  const ocRows = sheetRows(wb, ["Öğrenme Çıktıları", "Ogrenme Ciktilari", "ÖÇ", "Outcomes"]);
  ocRows?.forEach((r) => {
    const d = drafts.get(normCode(String(pick(r, "ders kodu", "kod", "code"))));
    const text = String(pick(r, "öğrenme çıktısı", "ogrenme ciktisi", "çıktı", "outcome", "metin")).trim();
    if (!d || !text) return;
    const no = num(pick(r, "öç no", "oc no", "no", "sıra"), d.outcomes.length + 1);
    d.outcomes[no - 1] = text;
  });
  drafts.forEach((d) => (d.outcomes = d.outcomes.filter(Boolean)));
  const mRows = sheetRows(wb, ["ÖÇ-PÇ Matrisi", "OC-PC Matrisi", "Matris"]);
  mRows?.forEach((r) => {
    const d = drafts.get(normCode(String(pick(r, "ders kodu", "kod"))));
    if (!d) return;
    const no = num(pick(r, "öç no", "oc no", "no"), 0);
    if (!no) return;
    const weights = Object.keys(r)
      .filter((k) => /^p[çc]\s*-?\s*\d+/i.test(k.trim()))
      .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")))
      .map((k) => Math.max(0, Math.min(5, num(r[k], 0))));
    d.matrix = d.matrix ?? [];
    d.matrix[no - 1] = weights;
  });
  if (!drafts.size) throw new Error('Dosyada ders bulunamadı. "Ders Kodu" ve "Ders Adı" sütunları gerekli — şablonu indirip kullanabilirsiniz.');
  return Array.from(drafts.values());
}

// ---------------------------------------------------------------------------
// Bologna bilgi paketi metni
// ---------------------------------------------------------------------------

const SECTION_END =
  /^(dersin içeriği|ders içeriği|haftalık|program çıktıları|program yeterlilikleri|değerlendirme|ölçme|akts \/ iş yükü|akts iş yükü|iş yükü|kaynaklar|ders kitabı|önerilen kaynaklar|ön koşul|dersin amacı|course contents|weekly|assessment)/i;

function valueAfter(text: string, labels: RegExp): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(labels);
    if (!m) continue;
    const rest = lines[i].slice((m.index ?? 0) + m[0].length).replace(/^[\s:\t|-]+/, "").trim();
    if (rest) return rest.split("\t")[0].trim();
    const next = lines.slice(i + 1).find((l) => l.length > 0);
    if (next) return next.split("\t")[0].trim();
  }
  return "";
}

/** Başlık satırı + değer satırı biçimindeki tabloları (Ders Adı ⇥ Kodu ⇥ AKTS …) sözlüğe çevirir. */
function headerTable(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    const head = lines[i].split("\t").map((c) => c.trim());
    if (head.length < 3 || !head.some((h) => /^(ders\s*ad[ıi]|kodu?|ders\s*kodu|akts|kredi|yar[ıi]y[ıi]l)$/i.test(h))) continue;
    const vals = lines[i + 1].split("\t").map((c) => c.trim());
    if (vals.length < head.length - 1) continue;
    head.forEach((h, j) => {
      if (h && vals[j] !== undefined && !(h.toLocaleLowerCase("tr-TR") in out)) out[h.toLocaleLowerCase("tr-TR")] = vals[j];
    });
  }
  return out;
}

/** Bologna ders sayfasından kopyalanan metni ders taslağına çevirir (en iyi çaba). */
export function parseBolognaText(text: string): CourseDraft {
  const d = emptyDraft();
  const flat = text.replace(/\u00a0/g, " ");
  const table = headerTable(flat);
  const fromTable = (re: RegExp) => Object.entries(table).find(([k]) => re.test(k))?.[1] ?? "";

  const codeLabeled = fromTable(/^(ders\s*)?kodu?$/i) || valueAfter(flat, /ders(in)?\s*kodu|course code/i);
  const codeMatch = (codeLabeled || flat).match(/\b([A-ZÇĞİÖŞÜ]{2,6}\s?-?\d{3,4}[A-Z]?)\b/);
  d.code = codeMatch ? normCode(codeMatch[1]) : "";

  d.name = (fromTable(/^ders\s*ad[ıi]$/i) || valueAfter(flat, /ders(in)?\s*ad[ıi]|course (title|name)/i)).replace(/\s{2,}.*/, "");
  if (!d.name) {
    const firstLine = flat.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 4 && !/kodu|bilgi paketi/i.test(l));
    d.name = (firstLine ?? "").replace(d.code, "").replace(/^[\s:-]+/, "").trim();
  }

  const tEcts = fromTable(/^akts$/i);
  const tCredit = fromTable(/^(ulusal\s*)?kredi(si)?$/i);
  const tSem = fromTable(/^yar[ıi]y[ıi]l$/i);
  const ects = tEcts ? [tEcts, tEcts] : flat.match(/AKTS(?:\s*Kredisi)?\s*[:\t ]\s*(\d+(?:[.,]\d+)?)/i) ?? flat.match(/ECTS\s*[:\t ]\s*(\d+(?:[.,]\d+)?)/i);
  if (ects) d.ects = num(ects[1], d.ects);
  const credit = tCredit ? [tCredit, tCredit] : flat.match(/(?:Ulusal\s*)?Kredi(?:si)?\s*[:\t ]\s*(\d+(?:[.,]\d+)?)/i);
  if (credit) d.credit = num(credit[1], d.credit);
  const sem = tSem.match(/(\d+)/) ?? flat.match(/Yar[ıi]y[ıi]l(?:ı)?\s*[:\t ]\s*(\d+)/i) ?? flat.match(/(\d)\.\s*Yar[ıi]y[ıi]l/i);
  if (sem) {
    d.semesterNo = num(sem[1], 1);
    d.classYear = Math.max(1, Math.ceil(d.semesterNo / 2));
  }
  d.instructor = valueAfter(flat, /dersi\s*veren(\s*öğretim\s*eleman(lar)?ı)?|öğretim\s*eleman[ıi]|dersin\s*koordinatörü|koordinatör|instructor/i);

  const lines = flat.split(/\r?\n/);
  const start = lines.findIndex((l) => /öğrenme\s*çıktı(lar)?ı|learning\s*outcomes/i.test(l));
  if (start >= 0) {
    const body: string[] = [];
    for (const raw of lines.slice(start + 1)) {
      const l = raw.trim();
      if (!l) continue;
      if (SECTION_END.test(l.toLocaleLowerCase("tr-TR")) && body.length) break;
      body.push(l.split("\t").find((cell) => cell.trim().length > 12) ?? l);
    }
    d.outcomes = parseOutcomeLines(body.join("\n")).filter((o) => !/^(öğrenme çıktıları|program çıktıları|öğretim yöntemleri|ölçme yöntemleri)/i.test(o));
  }
  return d;
}

// ---------------------------------------------------------------------------
// Kataloğa birleştirme
// ---------------------------------------------------------------------------

export function mergeDrafts(existing: Course[], drafts: CourseDraft[], poCount: number): { courses: Course[]; added: string[]; updated: string[] } {
  const byCode = new Map(existing.map((c) => [normCode(c.code), c]));
  const added: string[] = [];
  const updated: string[] = [];
  drafts.forEach((d) => {
    const key = normCode(d.code);
    if (!key) return;
    const prev = byCode.get(key);
    const outcomes = d.outcomes.length
      ? d.outcomes.map((text, i) => ({ id: prev?.outcomes[i]?.id ?? uid("oc"), code: `ÖÇ-${i + 1}`, text }))
      : prev?.outcomes ?? [];
    const matrix: Record<string, number[]> = {};
    outcomes.forEach((o, i) => {
      const row = d.matrix?.[i] ?? prev?.ocPcMatrix[o.id];
      if (row) matrix[o.id] = Array.from({ length: poCount }, (_, j) => row[j] ?? 0);
    });
    const course: Course = {
      id: prev?.id ?? uid("crs"),
      code: d.code,
      name: d.name || prev?.name || d.code,
      classYear: d.classYear,
      semesterNo: d.semesterNo,
      credit: d.credit,
      ects: d.ects,
      instructor: d.instructor || prev?.instructor || "",
      studentCount: d.studentCount,
      examDurationMin: d.examDurationMin,
      outcomes,
      ocPcMatrix: matrix,
    };
    byCode.set(key, course);
    (prev ? updated : added).push(d.code);
  });
  const order = existing.map((c) => normCode(c.code));
  const courses = [
    ...order.map((k) => byCode.get(k)!).filter(Boolean),
    ...Array.from(byCode.entries())
      .filter(([k]) => !order.includes(k))
      .map(([, c]) => c),
  ];
  return { courses, added, updated };
}
