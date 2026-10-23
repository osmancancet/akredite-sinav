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
const INLINE_OPT = /(?:^|\s)\(?([A-Fa-f])\)\s*/g;
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

/**
 * Satırdaki "A) … B) … C) …" şıklarını ayırır. İlk harf, beklenen sıradaki şık olmalıdır
 * (ilk satırda A, sonraki satırda C gibi) — "A) 4   B) 6 / C) 7   D) 8" düzeni desteklenir.
 * Şıklardan önce gelen metin soru kökü sayılır.
 */
function splitInlineOptions(line: string, nextIndex: number): { prefix: string; options: string[] } | null {
  const all = Array.from(line.matchAll(INLINE_OPT));
  const firstLetter = String.fromCharCode(65 + nextIndex);
  const start = all.findIndex((m) => m[1].toUpperCase() === firstLetter);
  if (start < 0) return null;
  const matches = all.slice(start);
  if (matches.length < 2 || matches.some((m, i) => m[1].toUpperCase().charCodeAt(0) !== 65 + nextIndex + i)) return null;
  const options = matches.map((m, i) => {
    const s0 = (m.index ?? 0) + m[0].length;
    const e0 = i + 1 < matches.length ? matches[i + 1].index ?? line.length : line.length;
    return line.slice(s0, e0).trim();
  });
  const prefix = line.slice(0, matches[0].index ?? 0).trim();
  if (nextIndex > 0 && prefix) return null; // satır ortasında devam eden şıklar yalnızca satır başından kabul edilir
  return { prefix, options };
}

function parseBlock(lines: string[]): ParsedQuestion | null {
  const textParts: string[] = [];
  const options: string[] = [];
  const optionRaw: string[] = [];
  const codeLines: string[] = [];
  const answerLines: string[] = [];
  let marked: number | undefined;
  let points: number | null = null;
  let inCode = false;
  let inAnswer = false;
  let blankAfterOptions = false;
  let afterAnswer = false;

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
    if (!line) {
      if (options.length) blankAfterOptions = true;
      if (inAnswer) {
        inAnswer = false;
        afterAnswer = true; // cevaptan sonra boş satırla ayrılan metin (bölüm başlığı vb.) yok sayılır
      }
      continue;
    }
    if (afterAnswer) continue;

    const ans = line.match(ANSWER);
    if (ans) {
      answerLines.push(ans[1].trim());
      inAnswer = true;
      continue;
    }
    // "Cevap:" satırından sonraki satırlar (sonraki soruya kadar) cevabın devamıdır
    if (inAnswer) {
      answerLines.push(line);
      continue;
    }
    const inline = blankAfterOptions ? null : splitInlineOptions(line, options.length);
    if (inline) {
      if (inline.prefix) textParts.push(inline.prefix);
      inline.options.forEach((o) => {
        if (MARKED.test(o)) marked = options.length;
        options.push(o.replace(MARKED, "").trim());
        optionRaw.push(`${String.fromCharCode(65 + optionRaw.length)}) ${o}`);
      });
      continue;
    }
    const opt = blankAfterOptions ? null : line.match(OPTION);
    if (opt && opt[1].toUpperCase().charCodeAt(0) - 65 === options.length) {
      if (MARKED.test(opt[2])) marked = options.length;
      options.push(opt[2].replace(MARKED, "").trim());
      optionRaw.push(line);
      continue;
    }
    // Şıklardan sonra boş satırla ayrılmış metin (bölüm başlığı, "Başarılar" vb.) soruya ait değildir
    if (blankAfterOptions) continue;
    if (options.length) options[options.length - 1] += ` ${line}`;
    else textParts.push(line);
  }

  let answer = answerLines.join("\n").trim();
  let text = textParts.join("\n").trim();

  // Alt sorular (a) … ? b) … ?) veya tek "şık": çoktan seçmeli değil, metnin parçasıdır
  const subQuestions = options.length >= 2 && marked === undefined && !/^\(?[A-Fa-f]\b/.test(answer) && options.every((o) => /\?\s*$/.test(o));
  if (options.length === 1 || subQuestions) {
    text = [text, ...optionRaw].filter(Boolean).join("\n");
    options.length = 0;
  }
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
    answer = answer.split("\n")[0];
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
  const lines = raw.replace(/\r/g, "").replace(/\u00a0/g, " ").split("\n");
  const blocks: string[][] = [];
  let current: string[] | null = null;
  let inCode = false;
  let expected = 1;
  for (const line of lines) {
    if (/^\s*```/.test(line)) inCode = !inCode;
    const m = !inCode ? line.match(Q_START) : null;
    const n = m ? Number(m[1]) : 0;
    // Yeni soru: beklenen numara, küçük bir atlama (eksik soru) veya bölüm başında yeniden 1'den başlama
    if (m && m[2].trim() && (!current || n === expected || n === 1 || (n > expected && n - expected <= 3))) {
      if (current) blocks.push(current);
      current = [m[2]];
      expected = n + 1;
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
