// Madde (soru) analizi — klasik test kuramı.
// p: güçlük indeksi = ortalama / maksimum puan
// D: ayırt edicilik = (üst %27 ort. − alt %27 ort.) / maksimum puan
// r: düzeltilmiş madde-toplam korelasyonu = corr(madde, toplam − madde)
// α: Cronbach alfa = k/(k−1) · (1 − Σσ²ᵢ / σ²ₜ)  (ikili puanlamada KR-20'ye eşittir)
// SEM = σₜ · √(1 − α)

import type { Exam, GradeSheet } from "./types";
import { activeRows } from "./medekMath";

export type ItemDecision = "koru" | "gozden-gecir" | "yeniden-yaz" | "guclugu-ayarla";

export interface ItemStat {
  questionId: string;
  label: string;
  maxPoints: number;
  mean: number;
  p: number;
  D: number;
  r: number | null;
  alphaIfDeleted: number | null;
  difficulty: "Çok zor" | "Zor" | "Orta" | "Kolay" | "Çok kolay";
  discrimination: "Çok iyi" | "İyi" | "Düzeltilmeli" | "Zayıf";
  decision: ItemDecision;
}

export interface TestStats {
  n: number;
  k: number;
  groupSize: number;
  alpha: number | null;
  sem: number | null;
  meanP: number;
  meanD: number;
  reliability: "Yüksek" | "Kabul edilebilir" | "Sınırda" | "Düşük" | "Hesaplanamadı";
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const variance = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
};

export function pearson(a: number[], b: number[]): number | null {
  const ma = avg(a);
  const mb = avg(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
}

export function cronbachAlpha(matrix: number[][]): number | null {
  const k = matrix[0]?.length ?? 0;
  if (k < 2 || matrix.length < 2) return null;
  const itemVars = Array.from({ length: k }, (_, j) => variance(matrix.map((row) => row[j])));
  const totalVar = variance(matrix.map((row) => row.reduce((s, x) => s + x, 0)));
  if (totalVar <= 0) return null;
  return (k / (k - 1)) * (1 - itemVars.reduce((s, v) => s + v, 0) / totalVar);
}

function difficultyLabel(p: number): ItemStat["difficulty"] {
  if (p < 0.2) return "Çok zor";
  if (p < 0.4) return "Zor";
  if (p <= 0.7) return "Orta";
  if (p <= 0.9) return "Kolay";
  return "Çok kolay";
}

function discriminationLabel(D: number): ItemStat["discrimination"] {
  if (D >= 0.4) return "Çok iyi";
  if (D >= 0.3) return "İyi";
  if (D >= 0.2) return "Düzeltilmeli";
  return "Zayıf";
}

export function decisionLabel(d: ItemDecision): string {
  return { koru: "Koru", "gozden-gecir": "Gözden geçir", "yeniden-yaz": "Yeniden yaz / çıkar", "guclugu-ayarla": "Güçlüğü ayarla" }[d];
}

export function analyzeItems(exam: Exam, sheet: GradeSheet | undefined): { items: ItemStat[]; test: TestStats } {
  const rows = activeRows(sheet);
  const k = exam.questions.length;
  const matrix = rows.map((r) => exam.questions.map((q) => Math.max(0, Math.min(q.points, Number(r.scores[q.id]) || 0))));
  const totals = matrix.map((row) => row.reduce((s, x) => s + x, 0));
  const n = rows.length;
  const groupSize = n >= 2 ? Math.max(1, Math.round(n * 0.27)) : 0;
  const order = totals.map((t, i) => ({ t, i })).sort((a, b) => b.t - a.t);
  const upper = order.slice(0, groupSize).map((x) => x.i);
  const lower = order.slice(-groupSize).map((x) => x.i);
  const alpha = cronbachAlpha(matrix);

  const items: ItemStat[] = exam.questions.map((q, j) => {
    const col = matrix.map((row) => row[j]);
    const mean = avg(col);
    const p = q.points ? mean / q.points : 0;
    const D = q.points && groupSize ? (avg(upper.map((i) => matrix[i][j])) - avg(lower.map((i) => matrix[i][j]))) / q.points : 0;
    const rest = matrix.map((row, i) => totals[i] - row[j]);
    const r = n >= 3 ? pearson(col, rest) : null;
    const alphaIfDeleted = k > 2 ? cronbachAlpha(matrix.map((row) => row.filter((_, jj) => jj !== j))) : null;
    let decision: ItemDecision = "koru";
    if (D < 0.2 || (r !== null && r < 0.1)) decision = "yeniden-yaz";
    else if (D < 0.3) decision = "gozden-gecir";
    else if (p > 0.9 || p < 0.2) decision = "guclugu-ayarla";
    return {
      questionId: q.id,
      label: `S${j + 1}`,
      maxPoints: q.points,
      mean,
      p,
      D,
      r,
      alphaIfDeleted,
      difficulty: difficultyLabel(p),
      discrimination: discriminationLabel(D),
      decision,
    };
  });

  const sem = alpha !== null && alpha < 1 ? Math.sqrt(variance(totals)) * Math.sqrt(Math.max(0, 1 - alpha)) : null;
  const reliability: TestStats["reliability"] =
    alpha === null ? "Hesaplanamadı" : alpha >= 0.8 ? "Yüksek" : alpha >= 0.7 ? "Kabul edilebilir" : alpha >= 0.6 ? "Sınırda" : "Düşük";
  return {
    items,
    test: { n, k, groupSize, alpha, sem, meanP: avg(items.map((i) => i.p)), meanD: avg(items.map((i) => i.D)), reliability },
  };
}
