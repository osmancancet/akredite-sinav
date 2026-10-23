// Program Çıktıları Panosu: dersler × PÇ planlanan katkı ve gerçekleşen başarı.
// Ders düzeyi PÇ% = dersin not girilmiş sınavlarındaki PÇ% değerlerinin ortalaması.
// Program düzeyi PÇ% = Σ_ders (PÇ%_ders × W_ders,j) / Σ_ders W_ders,j  (W = dersin o PÇ'ye toplam matris ağırlığı)

import type { Course, Exam, ProgramOutcome, VaultData } from "./types";
import { computeAnalysis } from "./medekMath";

export interface PanelRow {
  course: Course;
  gradedExams: Exam[];
  planned: number[]; // PÇ başına Σ ağırlık (0..)
  achieved: (number | null)[]; // PÇ başına %
}

export interface PoSummary {
  po: ProgramOutcome;
  plannedTotal: number;
  supportingCourses: number;
  measuredCourses: number;
  pct: number | null;
  flagged: boolean;
  uncovered: boolean;
}

export function computeProgramPanel(d: VaultData): { rows: PanelRow[]; summary: PoSummary[]; threshold: number } {
  const threshold = d.institution.targetThreshold || 60;
  const pos = d.programOutcomes;
  const rows: PanelRow[] = d.courses.map((course) => {
    const planned = pos.map((_, j) => course.outcomes.reduce((s, o) => s + (course.ocPcMatrix[o.id]?.[j] ?? 0), 0));
    const gradedExams = d.exams.filter((e) => e.courseId === course.id && (d.grades[e.id]?.rows.length ?? 0) > 0);
    const perExam = gradedExams.map((e) => computeAnalysis(e, course, pos, d.grades[e.id], threshold).poStats.map((p) => p.pct));
    const achieved = pos.map((_, j) => {
      const vals = perExam.map((row) => row[j]).filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    });
    return { course, gradedExams, planned, achieved };
  });

  const summary: PoSummary[] = pos.map((po, j) => {
    let num = 0;
    let den = 0;
    let measured = 0;
    rows.forEach((r) => {
      const v = r.achieved[j];
      if (v !== null && r.planned[j] > 0) {
        num += v * r.planned[j];
        den += r.planned[j];
        measured++;
      }
    });
    const plannedTotal = rows.reduce((s, r) => s + r.planned[j], 0);
    const pct = den > 0 ? num / den : null;
    return {
      po,
      plannedTotal,
      supportingCourses: rows.filter((r) => r.planned[j] > 0).length,
      measuredCourses: measured,
      pct,
      flagged: pct !== null && pct < threshold,
      uncovered: plannedTotal === 0,
    };
  });
  return { rows, summary, threshold };
}
