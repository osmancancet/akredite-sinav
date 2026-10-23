// Word/PDF'ten yapıştırılan sınav metnini soru nesnelerine ayrıştırır.
// Desteklenen biçimler: "1.", "1)", "Soru 1:", "S1." numaraları; "(10 puan)", "[10 P]" puanları;
// alt alta veya tek satırda "A) … B) …" şıkları; "Cevap: C", "*" veya "(doğru)" ile doğru şık;
// ``` ile çevrili kod blokları; ____ / ...... boşlukları; D/Y soruları.

import type { BloomLevel, QuestionType } from "./types";

export interface ParsedQuestion {
  type: QuestionType;
  text: string;
  points: number | null;
  options: string[];
  correctIndex?: number;
  correctBool?: boolean;
  answerKey: string;
  code?: string;
  bloom: BloomLevel;
}

const Q_START = /^\s*(?:(?:soru|s)\s*)?(\d{1,3})\s*[.)\-:]\s*(.*)$/i;
const OPTION = /^\s*\(?([A-Fa-f])\s*[).:\-]\s+(.*)$/;
const INLINE_OPT = /(?:^|\s)\(?([A-F])\)\s*/g;
const ANSWER = /^\s*(?:doğru\s*cevap|cevap\s*anahtarı|cevap|yanıt|cvp|answer)\s*[:\-=]\s*(.+)$/i;
const POINTS = /[(\[]\s*(\d+(?:[.,]\d+)?)\s*(?:puan|p\.?|pts?|points?)\s*[)\]]|(?:^|\s)(\d+(?:[.,]\d+)?)\s*puan\b/i;
const BLANK = /_{3,}|\.{5,}|…{2,}/;
// Not: Türkçe küçük harf "ı" JS \b için kelime karakteri sayılmadığından açık sınır kullanılır
const TF_ANSWER = /^(doğru|yanlış|d|y|true|false)(?=$|[\s.,;:!)])/;
const TF_TRUE = /^(doğru|d|true)(?=$|[\s.,;:!)])/;
const MARKED = /^\*\s*|\s*\*$|\s*\((?:doğru|d|✓)\)\s*$|\s*✓\s*$/i;

const BLOOM_VERBS: [BloomLevel, RegExp][] = [
  ["yaratma", /tasarla|geliştir|oluştur|üret|planla|kurgula|öner(iniz|in)\b/i],
  ["degerlendirme", /değerlendir|eleştir|savun|gerekçelendir|tartış|karar ver|hangisi daha uygun|yargıla/i],
  ["analiz", /analiz|karşılaştır|ayırt|incele|çözümle|ilişkilendir|sınıflandır|neden.*sonuç/i],
  ["uygulama", /hesapla|uygula|yazınız|yaz\b|çiz|çöz|göster|kullan|dönüştür|sorgu/i],
  ["anlama", /açıkla|yorumla|özetle|örnek ver|ne anlama|farkı nedir|neden/i],
  ["hatirlama", /tanımla|listele|say(ınız|ın)\b|nedir|hangisidir|adlandır|belirt|hatırla/i],
];

export function guessBloom(text: string, type: QuestionType): BloomLevel {
  for (const [level, re] of BLOOM_VERBS) if (re.test(text)) return level;
  return type === "mcq" || type === "truefalse" ? "hatirlama" : "anlama";
}

function extractPoints(line: string): { line: string; points: number | null } {
  const m = line.match(POINTS);
  if (!m) return { line, points: null };
  const value = Number((m[1] ?? m[2]).replace(",", "."));
  return { line: line.replace(m[0], " ").replace(/\s{2,}/g, " ").trim(), points: Number.isFinite(value) ? value : null };
}

/** Tek satırdaki "A) … B) … C) …" şıklarını ayırır; şıklardan önceki metin soru kökü sayılır. */
function splitInlineOptions(line: string): { prefix: string; options: string[] } | null {
  const all = Array.from(line.matchAll(INLINE_OPT));
  const firstA = all.findIndex((m) => m[1] === "A");
  if (firstA < 0) return null;
  const matches = all.slice(firstA);
  if (matches.length < 2 || matches.some((m, i) => m[1].charCodeAt(0) !== 65 + i)) return null;
  const options = matches.map((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? line.length : line.length;
    return line.slice(start, end).trim();
  });
  return { prefix: line.slice(0, matches[0].index ?? 0).trim(), options };
}

function parseBlock(lines: string[]): ParsedQuestion | null {
  const textParts: string[] = [];
  const options: string[] = [];
  const codeLines: string[] = [];
  let marked: number | undefined;
  let answer = "";
  let points: number | null = null;
  let inCode = false;

  for (const raw of lines) {
    if (/^\s*```/.test(raw)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeLines.push(raw.replace(/\s+$/, ""));
      continue;
    }
    const pt = extractPoints(raw);
    if (pt.points !== null && points === null) points = pt.points;
    const line = pt.line.trim();
    if (!line) continue;

    const ans = line.match(ANSWER);
    if (ans) {
      answer = ans[1].trim();
      continue;
    }
    const inline = splitInlineOptions(line);
    if (inline && !options.length) {
      if (inline.prefix) textParts.push(inline.prefix);
      inline.options.forEach((o) => {
        if (MARKED.test(o)) marked = options.length;
        options.push(o.replace(MARKED, "").trim());
      });
      continue;
    }
    const opt = line.match(OPTION);
    if (opt && opt[1].toUpperCase().charCodeAt(0) - 65 === options.length) {
      if (MARKED.test(opt[2])) marked = options.length;
      options.push(opt[2].replace(MARKED, "").trim());
      continue;
    }
    if (options.length) options[options.length - 1] += ` ${line}`;
    else textParts.push(line);
  }

  const text = textParts.join("\n").trim();
  if (!text && !options.length) return null;

  let type: QuestionType = "open";
  let correctIndex: number | undefined;
  let correctBool: boolean | undefined;
  const ansLower = answer.toLocaleLowerCase("tr-TR");

  if (options.length >= 2) {
    type = "mcq";
    const letter = answer.match(/^\(?([A-Fa-f])\b/);
    correctIndex = letter ? letter[1].toUpperCase().charCodeAt(0) - 65 : marked;
    if (correctIndex !== undefined && correctIndex >= options.length) correctIndex = undefined;
  } else if (codeLines.length) {
    type = "code";
  } else if (BLANK.test(text)) {
    type = "fill";
  } else if (TF_ANSWER.test(ansLower) || /\(\s*D\s*\/\s*Y\s*\)|\(\s*\)\s*doğru|doğru\s*\/\s*yanlış/i.test(text)) {
    type = "truefalse";
    if (ansLower) correctBool = TF_TRUE.test(ansLower);
  }

  const cleanText = text.replace(/\(\s*D\s*\/\s*Y\s*\)/i, "").trim();
  return {
    type,
    text: cleanText,
    points,
    options: type === "mcq" ? options : [],
    correctIndex,
    correctBool,
    answerKey: type === "mcq" ? (correctIndex !== undefined ? `${String.fromCharCode(65 + correctIndex)}) ${options[correctIndex]}` : "") : answer,
    code: type === "code" ? codeLines.join("\n").replace(/^\n+|\n+$/g, "") : undefined,
    bloom: guessBloom(cleanText, type),
  };
}

export function parseQuestionsText(raw: string): ParsedQuestion[] {
  const lines = raw.replace(/\r/g, "").replace(/ /g, " ").split("\n");
  const blocks: string[][] = [];
  let current: string[] | null = null;
  let inCode = false;
  let expected = 1;
  for (const line of lines) {
    if (/^\s*```/.test(line)) inCode = !inCode;
    const m = !inCode ? line.match(Q_START) : null;
    // Yeni soru: beklenen numara (veya ilk soru) ile başlayan satır
    if (m && (Number(m[1]) === expected || (!current && Number(m[1]) >= 1))) {
      if (current) blocks.push(current);
      current = [m[2]];
      expected = Number(m[1]) + 1;
      continue;
    }
    if (current) current.push(line);
  }
  if (current) blocks.push(current);
  return blocks.map(parseBlock).filter((q): q is ParsedQuestion => !!q);
}

/** Puanı belirtilmemiş sorulara kalan puanı eşit dağıtır (0,5'e yuvarlar; toplam hedefi korur). */
export function distributePoints(qs: ParsedQuestion[], total = 100): number[] {
  const known = qs.reduce((s, q) => s + (q.points ?? 0), 0);
  const unknown = qs.filter((q) => q.points === null).length;
  if (!unknown) return qs.map((q) => q.points ?? 0);
  const each = Math.max(0.5, Math.floor(((total - known) / unknown) * 2) / 2);
  const out = qs.map((q) => q.points ?? each);
  const diff = total - out.reduce((s, v) => s + v, 0);
  const lastUnknown = qs.map((q, i) => (q.points === null ? i : -1)).filter((i) => i >= 0).pop();
  if (lastUnknown !== undefined && diff > 0) out[lastUnknown] += diff;
  return out;
}
