// Dönem iş akışı: kasadaki veriden her adımın durumunu türetir (Genel Bakış ekranı).

import type { VaultData } from "./types";
import { auditExam } from "./medekMath";
import { detectConflicts } from "./scheduler";

export type StepStatus = "done" | "partial" | "todo";

export interface WorkflowStep {
  id: string;
  title: string;
  detail: string;
  status: StepStatus;
  module: "kasa" | "sinav" | "program" | "oturma" | "rubrik" | "medek";
  action: string;
}

export function workflowSteps(d: VaultData): WorkflowStep[] {
  const inst = d.institution;
  const instDone = !!(inst.university && inst.unitName && inst.department);
  const coursesWithOc = d.courses.filter((c) => c.outcomes.some((o) => o.text.trim().length > 5));
  const examsReady = d.exams.filter((e) => {
    const c = d.courses.find((x) => x.id === e.courseId);
    return c && e.questions.length > 0 && !auditExam(e, c).some((i) => i.level === "error");
  });
  const hard = detectConflicts(d.schedule, d.courses, d.rooms, d.invigilators, d.students).filter((c) => c.severity === "hard");
  const rosterCourses = Object.entries(d.students).filter(([, l]) => l.length > 0).length;
  const plans = Object.keys(d.seating).filter((id) => d.exams.some((e) => e.id === id)).length;
  const graded = Object.values(d.grades).filter((g) => g.rows.length > 0 && d.exams.some((e) => e.id === g.examId));
  const puko = graded.filter((g) => g.generalEvaluation.trim().length > 20 || Object.keys(g.puko).length > 0);

  const s = (cond: boolean, partial: boolean): StepStatus => (cond ? "done" : partial ? "partial" : "todo");
  return [
    {
      id: "antet",
      title: "Kurum anteti",
      detail: instDone ? `${inst.university}${inst.logoDataUrl ? " · logolu" : " · logo yok"}` : "Üniversite, birim ve bölüm bilgisi",
      status: s(instDone && !!inst.logoDataUrl, instDone),
      module: "kasa",
      action: "Anteti düzenle",
    },
    {
      id: "dersler",
      title: "Ders kataloğu",
      detail: d.courses.length ? `${d.courses.length} ders` : "Bologna'dan yapıştır veya Excel ile aktar",
      status: s(d.courses.length > 0, false),
      module: "kasa",
      action: "Ders aktar",
    },
    {
      id: "oc",
      title: "Öğrenme çıktıları",
      detail: d.courses.length ? `${coursesWithOc.length}/${d.courses.length} derste ÖÇ tanımlı` : "Önce ders ekleyin",
      status: s(d.courses.length > 0 && coursesWithOc.length === d.courses.length, coursesWithOc.length > 0),
      module: "sinav",
      action: "ÖÇ düzenle",
    },
    {
      id: "sinav",
      title: "Sınav kağıtları",
      detail: d.exams.length ? `${examsReady.length}/${d.exams.length} sınav MEDEK denetiminden geçti` : "Henüz sınav yok",
      status: s(d.exams.length > 0 && examsReady.length === d.exams.length, d.exams.length > 0),
      module: "sinav",
      action: "Sınav hazırla",
    },
    {
      id: "program",
      title: "Sınav programı",
      detail: d.schedule.entries.length ? `${d.schedule.entries.length} sınav · ${hard.length} kesin çakışma` : "Otomatik dağıtım bekliyor",
      status: s(d.schedule.entries.length > 0 && hard.length === 0, d.schedule.entries.length > 0),
      module: "program",
      action: "Programı aç",
    },
    {
      id: "ogrenci",
      title: "Öğrenci listeleri",
      detail: rosterCourses ? `${rosterCourses} dersin OBS listesi yüklü` : "OBS Excel'i yükleyin",
      status: s(rosterCourses > 0 && plans > 0, rosterCourses > 0),
      module: "oturma",
      action: plans ? "Kapı listeleri" : "Oturma düzeni",
    },
    {
      id: "not",
      title: "Notlar ve analiz",
      detail: graded.length ? `${graded.length} sınavın notu girildi` : "Soru bazlı not girişi",
      status: s(graded.length > 0, false),
      module: "medek",
      action: "Not gir",
    },
    {
      id: "puko",
      title: "PUKÖ raporu",
      detail: puko.length ? `${puko.length} raporda değerlendirme yazıldı` : "Eşik altı ÖÇ'ler için eylem planı",
      status: s(puko.length > 0 && puko.length === graded.length, puko.length > 0),
      module: "medek",
      action: "Raporu hazırla",
    },
  ];
}

export function workflowProgress(steps: WorkflowStep[]): number {
  const score = steps.reduce((s, x) => s + (x.status === "done" ? 1 : x.status === "partial" ? 0.5 : 0), 0);
  return Math.round((score / steps.length) * 100);
}
