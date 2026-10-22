// MEDEK / MÜDEK / YÖKAK ÖÇ-PÇ başarı hesaplama motoru
// docs/MEDEK_AND_OPERATIONS_SPEC.md Bölüm 1-2 formüllerinin birebir uygulaması.

import type {
  BloomLevel,
  Course,
  Exam,
  GradeRow,
  GradeSheet,
  ProgramOutcome,
  PukoEntry,
  Question,
} from "./types";
import { BLOOM_LEVELS, bloomLabel, clamp, createRng, gaussian, hashString, mean, median, round, stdDev, uid } from "./utils";

// ---------------------------------------------------------------------------
// Belirtke Tablosu
// ---------------------------------------------------------------------------

export interface BlueprintRow {
  question: Question;
  label: string;
  /** ÖÇ id -> bu sorunun o ÖÇ'ye katkı puanı */
  cells: Record<string, number>;
}

export interface Blueprint {
  rows: BlueprintRow[];
  totals: Record<string, number>; // ÖÇ id -> toplam puan
  percents: Record<string, number>;
  totalPoints: number;
  uncovered: string[]; // kapsanmayan ÖÇ id'leri
  bloomTotals: Record<BloomLevel, number>;
  untagged: string[]; // ÖÇ atanmamış soru etiketleri
}

/**
 * Belirtke tablosu: Birden fazla ÖÇ ölçen soruda puan ÖÇ'ler arasında eşit paylaştırılır
 * (tablo toplamının sınav toplamına eşit kalması için). Başarı hesabında ise
 * spesifikasyon gereği sorunun tamamı ilgili her ÖÇ kümesine (Q_k) dahil edilir.
 */
export function buildBlueprint(exam: Exam, course: Course): Blueprint {
  const totals: Record<string, number> = {};
  course.outcomes.forEach((o) => (totals[o.id] = 0));
  const bloomTotals = Object.fromEntries(BLOOM_LEVELS.map((b) => [b.value, 0])) as Record<BloomLevel, number>;
  const untagged: string[] = [];
  const rows: BlueprintRow[] = exam.questions.map((q, i) => {
    const valid = q.outcomeIds.filter((id) => id in totals);
    const cells: Record<string, number> = {};
    if (valid.length === 0) untagged.push(`S${i + 1}`);
    valid.forEach((id) => {
      const share = q.points / valid.length;
      cells[id] = share;
      totals[id] += share;
    });
    bloomTotals[q.bloom] += q.points;
    return { question: q, label: `S${i + 1}`, cells };
  });
  const totalPoints = exam.questions.reduce((s, q) => s + (Number(q.points) || 0), 0);
  const percents: Record<string, number> = {};
  Object.entries(totals).forEach(([id, t]) => (percents[id] = totalPoints ? (t / totalPoints) * 100 : 0));
  const uncovered = course.outcomes.filter((o) => totals[o.id] === 0).map((o) => o.id);
  return { rows, totals, percents, totalPoints, uncovered, bloomTotals, untagged };
}

export interface ComplianceIssue {
  level: "error" | "warning" | "ok";
  message: string;
}

export function auditExam(exam: Exam, course: Course): ComplianceIssue[] {
  const bp = buildBlueprint(exam, course);
  const issues: ComplianceIssue[] = [];
  if (Math.abs(bp.totalPoints - 100) > 0.001) {
    issues.push({ level: "error", message: `Toplam puan ${round(bp.totalPoints, 2)}; MEDEK uygulamasında 100 olmalıdır.` });
  } else {
    issues.push({ level: "ok", message: "Toplam puan 100 — uygun." });
  }
  if (bp.uncovered.length) {
    const codes = course.outcomes.filter((o) => bp.uncovered.includes(o.id)).map((o) => o.code);
    issues.push({ level: "warning", message: `Kapsanmayan öğrenme çıktısı: ${codes.join(", ")}` });
  } else if (course.outcomes.length) {
    issues.push({ level: "ok", message: "Tüm öğrenme çıktıları en az bir soruyla ölçülüyor." });
  }
  if (bp.untagged.length) {
    issues.push({ level: "error", message: `ÖÇ eşleştirmesi olmayan soru: ${bp.untagged.join(", ")}` });
  }
  exam.questions.forEach((q, i) => {
    if (!q.text.trim()) issues.push({ level: "error", message: `S${i + 1}: Soru metni boş.` });
    if (q.type === "mcq" && !q.correctOptionId) issues.push({ level: "error", message: `S${i + 1}: Doğru şık işaretlenmemiş.` });
    if ((q.type === "open" || q.type === "code" || q.type === "latex") && q.rubric.length === 0) {
      issues.push({ level: "warning", message: `S${i + 1}: Kısmi puanlama rubriği tanımlanmamış.` });
    }
    const rubricSum = q.rubric.reduce((s, r) => s + (Number(r.points) || 0), 0);
    if (q.rubric.length && Math.abs(rubricSum - q.points) > 0.001) {
      issues.push({ level: "warning", message: `S${i + 1}: Rubrik toplamı (${rubricSum}) soru puanına (${q.points}) eşit değil.` });
    }
  });
  const highOrder = exam.questions
    .filter((q) => (BLOOM_LEVELS.find((b) => b.value === q.bloom)?.order ?? 0) >= 4)
    .reduce((s, q) => s + q.points, 0);
  if (bp.totalPoints > 0 && highOrder / bp.totalPoints < 0.2) {
    issues.push({ level: "warning", message: "Üst düzey bilişsel (Analiz ve üzeri) soru ağırlığı %20'nin altında." });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Sınav sonu başarı analizi
// ---------------------------------------------------------------------------

export interface QuestionStat {
  questionId: string;
  label: string;
  maxPoints: number;
  avg: number;
  pct: number;
  outcomeIds: string[];
  bloom: BloomLevel;
}

export interface OutcomeStat {
  outcomeId: string;
  code: string;
  text: string;
  sumAvg: number;
  sumMax: number;
  pct: number | null;
  scale5: number | null;
  flagged: boolean;
  questionLabels: string[];
}

export interface ProgramOutcomeStat {
  poId: string;
  code: string;
  text: string;
  weightSum: number;
  pct: number | null;
  scale5: number | null;
  flagged: boolean;
}

export interface ExamStatistics {
  n: number;
  totalMax: number;
  mean: number;
  median: number;
  sd: number;
  max: number;
  min: number;
  passRate: number; // 50 ve üzeri yüzdesi
  histogram: number[]; // 10 aralık
}

export interface Analysis {
  questionStats: QuestionStat[];
  outcomeStats: OutcomeStat[];
  poStats: ProgramOutcomeStat[];
  stats: ExamStatistics;
  studentTotals: { row: GradeRow; total: number }[];
}

export function activeRows(sheet: GradeSheet | undefined): GradeRow[] {
  if (!sheet) return [];
  return sheet.rows.filter((r) => Object.values(r.scores).some((v) => v !== null && v !== undefined && !Number.isNaN(v)));
}

export function rowTotal(row: GradeRow, exam: Exam): number {
  return exam.questions.reduce((s, q) => s + (Number(row.scores[q.id]) || 0), 0);
}

export function computeAnalysis(
  exam: Exam,
  course: Course,
  programOutcomes: ProgramOutcome[],
  sheet: GradeSheet | undefined,
  threshold: number,
): Analysis {
  const rows = activeRows(sheet);
  const questionStats: QuestionStat[] = exam.questions.map((q, i) => {
    const vals = rows.map((r) => clamp(Number(r.scores[q.id]) || 0, 0, q.points));
    const avg = mean(vals);
    return {
      questionId: q.id,
      label: `S${i + 1}`,
      maxPoints: q.points,
      avg,
      pct: q.points ? (avg / q.points) * 100 : 0,
      outcomeIds: q.outcomeIds,
      bloom: q.bloom,
    };
  });

  // Başarı(ÖÇ_k)% = Σ_{i∈Q_k} X_i / Σ_{i∈Q_k} P_i × 100
  const outcomeStats: OutcomeStat[] = course.outcomes.map((o) => {
    const qs = questionStats.filter((s) => s.outcomeIds.includes(o.id));
    const sumAvg = qs.reduce((s, x) => s + x.avg, 0);
    const sumMax = qs.reduce((s, x) => s + x.maxPoints, 0);
    const pct = sumMax > 0 && rows.length > 0 ? (sumAvg / sumMax) * 100 : null;
    return {
      outcomeId: o.id,
      code: o.code,
      text: o.text,
      sumAvg,
      sumMax,
      pct,
      scale5: pct === null ? null : pct / 20,
      flagged: pct !== null && pct < threshold,
      questionLabels: qs.map((x) => x.label),
    };
  });

  // Başarı(PÇ_j)% = Σ_k Başarı(ÖÇ_k)% × W_kj / Σ_k W_kj
  const poStats: ProgramOutcomeStat[] = programOutcomes.map((po, j) => {
    let num = 0;
    let den = 0;
    outcomeStats.forEach((os) => {
      const w = course.ocPcMatrix[os.outcomeId]?.[j] ?? 0;
      if (w > 0 && os.pct !== null) {
        num += os.pct * w;
        den += w;
      }
    });
    const pct = den > 0 ? num / den : null;
    return {
      poId: po.id,
      code: po.code,
      text: po.text,
      weightSum: den,
      pct,
      scale5: pct === null ? null : pct / 20,
      flagged: pct !== null && pct < threshold,
    };
  });

  const totalMax = exam.questions.reduce((s, q) => s + q.points, 0);
  const studentTotals = rows.map((row) => ({ row, total: rowTotal(row, exam) }));
  const totals = studentTotals.map((s) => s.total);
  const histogram = new Array(10).fill(0);
  totals.forEach((t) => {
    const pct = totalMax ? (t / totalMax) * 100 : 0;
    histogram[Math.min(9, Math.floor(pct / 10))]++;
  });
  const stats: ExamStatistics = {
    n: rows.length,
    totalMax,
    mean: mean(totals),
    median: median(totals),
    sd: stdDev(totals),
    max: totals.length ? Math.max(...totals) : 0,
    min: totals.length ? Math.min(...totals) : 0,
    passRate: totals.length ? (totals.filter((t) => (totalMax ? (t / totalMax) * 100 : 0) >= 50).length / totals.length) * 100 : 0,
    histogram,
  };

  return { questionStats, outcomeStats, poStats, stats, studentTotals };
}

// ---------------------------------------------------------------------------
// 40 öğrencilik gerçekçi not simülasyonu
// ---------------------------------------------------------------------------

const BLOOM_DIFFICULTY: Record<BloomLevel, number> = {
  hatirlama: 1.18,
  anlama: 1.08,
  uygulama: 0.98,
  analiz: 0.86,
  degerlendirme: 0.74,
  yaratma: 0.7,
};

export function simulateGrades(
  exam: Exam,
  roster: { no: string; fullName: string }[],
  count: number,
  seed: number,
): GradeRow[] {
  const rng = createRng(seed);
  const rows: GradeRow[] = [];
  for (let s = 0; s < count; s++) {
    const person = roster[s] ?? { no: `2510${String(9000 + s)}`, fullName: `Öğrenci ${s + 1}` };
    const ability = clamp(gaussian(rng, 0.68, 0.17), 0.12, 1);
    const scores: Record<string, number | null> = {};
    exam.questions.forEach((q) => {
      const jitter = 0.94 + ((hashString(q.id) % 1000) / 1000) * 0.12;
      const p = clamp(ability * BLOOM_DIFFICULTY[q.bloom] * jitter, 0.02, 0.99);
      if (q.type === "mcq" || q.type === "truefalse") {
        scores[q.id] = rng() < p ? q.points : 0;
      } else {
        const raw = clamp(gaussian(rng, p, 0.12), 0, 1) * q.points;
        scores[q.id] = Math.round(raw * 2) / 2;
      }
    });
    rows.push({ id: uid("gr"), studentNo: person.no, fullName: person.fullName, scores });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// PUKÖ (Planla-Uygula-Kontrol Et-Önlem Al) otomatik öneri motoru
// ---------------------------------------------------------------------------

export function suggestPuko(
  outcome: OutcomeStat,
  exam: Exam,
  analysis: Analysis,
  threshold: number,
): PukoEntry {
  const related = exam.questions
    .map((q, i) => ({ q, stat: analysis.questionStats[i] }))
    .filter(({ q }) => q.outcomeIds.includes(outcome.outcomeId));
  const weakest = [...related].sort((a, b) => a.stat.pct - b.stat.pct)[0];
  const highOrder = related.some(({ q }) => (BLOOM_LEVELS.find((b) => b.value === q.bloom)?.order ?? 0) >= 4);
  const hasCode = related.some(({ q }) => q.type === "code");
  const hasOpen = related.some(({ q }) => q.type === "open" || q.type === "latex");
  const gap = round(threshold - (outcome.pct ?? 0), 1);

  const causes: string[] = [];
  causes.push(
    `${outcome.code} gerçekleşme düzeyi %${round(outcome.pct ?? 0, 1)} olup hedef eşik %${threshold} değerinin ${gap} puan altında kalmıştır.`,
  );
  if (weakest) {
    causes.push(
      `En düşük başarı ${weakest.stat.label} sorusunda (%${round(weakest.stat.pct, 1)}, ${bloomLabel(weakest.q.bloom)} düzeyi) gözlenmiştir.`,
    );
  }
  if (highOrder) causes.push("Çıktı, üst düzey bilişsel beceri (analiz/değerlendirme) gerektirdiğinden öğrencilerin kavramsal bilgiyi transfer etmekte zorlandığı değerlendirilmektedir.");
  if (hasCode) causes.push("Uygulamalı kodlama/sorgu yazma pratiğinin ders saatleri içinde yetersiz kaldığı düşünülmektedir.");
  if (hasOpen) causes.push("Açık uçlu sorularda adım adım çözüm ve gerekçelendirme becerisinin zayıf olduğu tespit edilmiştir.");

  return {
    outcomeId: outcome.outcomeId,
    rootCause: causes.join(" "),
    plan: `Gelecek dönem ders planında ${outcome.code} konusuna ayrılan süre 1 hafta artırılacak; konu, örnek olay (vaka) temelli etkinliklerle yeniden yapılandırılacaktır.`,
    doAction: `${hasCode ? "Laboratuvar oturumlarında haftalık uygulama föyleri, " : ""}ara değerlendirme öncesi biçimlendirici kısa sınavlar (quiz) ve çözümlü örnek soru setleri uygulanacaktır.`,
    check: `Dönem ortasında ${outcome.code} için kısa sınav yapılarak başarı oranı izlenecek; hedef eşik (%${threshold}) karşılanmazsa ek telafi saati planlanacaktır.`,
    act: `Bir sonraki dönemin ders öğretim planı (izlence) ve ölçme araçları revize edilerek Bölüm Kalite Komisyonu'na raporlanacaktır.`,
  };
}

export function scaleLabel(pct: number | null): string {
  if (pct === null) return "Ölçülmedi";
  if (pct >= 85) return "Çok İyi";
  if (pct >= 70) return "İyi";
  if (pct >= 60) return "Yeterli";
  if (pct >= 45) return "Geliştirilmeli";
  return "Yetersiz";
}
