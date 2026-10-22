import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BloomLevel, QuestionType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}_${Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("")}`;
}

/** Deterministik PRNG (mulberry32) — kitapçık karıştırma ve simülasyonlar için. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = createRng(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Normal dağılımlı rastgele sayı (Box-Muller) */
export function gaussian(rng: () => number, mean = 0, sd = 1): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function round(n: number, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export const BLOOM_LEVELS: { value: BloomLevel; label: string; order: number; verbs: string }[] = [
  { value: "hatirlama", label: "Hatırlama", order: 1, verbs: "tanımlar, listeler, hatırlar" },
  { value: "anlama", label: "Anlama", order: 2, verbs: "açıklar, yorumlar, örneklendirir" },
  { value: "uygulama", label: "Uygulama", order: 3, verbs: "uygular, hesaplar, yazar" },
  { value: "analiz", label: "Analiz", order: 4, verbs: "çözümler, karşılaştırır, ayrıştırır" },
  { value: "degerlendirme", label: "Değerlendirme", order: 5, verbs: "eleştirir, savunur, değerlendirir" },
  { value: "yaratma", label: "Yaratma", order: 6, verbs: "tasarlar, geliştirir, üretir" },
];

export function bloomLabel(b: BloomLevel): string {
  return BLOOM_LEVELS.find((x) => x.value === b)?.label ?? b;
}

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "Çoktan Seçmeli" },
  { value: "open", label: "Klasik (Açık Uçlu)" },
  { value: "code", label: "Kod Bloğu" },
  { value: "truefalse", label: "Doğru / Yanlış" },
  { value: "fill", label: "Boşluk Doldurma" },
  { value: "latex", label: "LaTeX / Formül" },
];

export function questionTypeLabel(t: QuestionType): string {
  return QUESTION_TYPES.find((x) => x.value === t)?.label ?? t;
}

const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const TR_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTrDate(iso: string, withDay = false): string {
  if (!iso) return "";
  const d = parseIsoDate(iso);
  const base = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  return withDay ? `${base} ${TR_DAYS[d.getDay()]}` : base;
}

export function formatTrLongDate(iso: string): string {
  if (!iso) return "";
  const d = parseIsoDate(iso);
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()} ${TR_DAYS[d.getDay()]}`;
}

export function trDayName(iso: string): string {
  return TR_DAYS[parseIsoDate(iso).getDay()];
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** KVKK maskeleme: 230101045 -> 230101***, "Ahmet Yılmaz" -> "A*** Y***" */
export function maskStudentNo(no: string): string {
  if (no.length <= 3) return "***";
  return no.slice(0, Math.max(0, no.length - 3)) + "***";
}

export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + "***")
    .join(" ");
}

export function safeFileName(s: string): string {
  return s
    .replace(/[ğĞ]/g, "g").replace(/[üÜ]/g, "u").replace(/[şŞ]/g, "s")
    .replace(/[ıİ]/g, "i").replace(/[öÖ]/g, "o").replace(/[çÇ]/g, "c")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function trUpper(s: string): string {
  return s.toLocaleUpperCase("tr-TR");
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Resmi yazı sayı öneki: "Bilgisayar Teknolojileri Bölümü" -> "BTB" */
export function docNumberPrefix(department: string): string {
  const letters = department
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
  return letters || "BLM";
}
