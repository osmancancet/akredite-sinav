"use client";

import { useCallback } from "react";
import { useData, useVault } from "@/lib/store";
import type { Course, Exam, Question, QuestionType } from "@/lib/types";
import { todayIso, uid } from "@/lib/utils";

export function blankQuestion(type: QuestionType, outcomeIds: string[] = []): Question {
  const base: Question = {
    id: uid("q"),
    type,
    text: "",
    points: 10,
    outcomeIds,
    bloom: type === "mcq" || type === "truefalse" ? "hatirlama" : "uygulama",
    options: [],
    answerKey: "",
    rubric: [],
    answerLines: type === "open" || type === "code" || type === "latex" ? 8 : 0,
  };
  if (type === "mcq") {
    base.options = ["", "", "", "", ""].map(() => ({ id: uid("op"), text: "" }));
    base.rubric = [{ id: uid("rl"), description: "Doğru şıkkın işaretlenmesi", points: 10 }];
  }
  if (type === "truefalse") {
    base.correctBool = true;
    base.rubric = [{ id: uid("rl"), description: "Doğru yanıt", points: 10 }];
  }
  if (type === "code") {
    base.code = "";
    base.codeLanguage = "sql";
  }
  if (type === "latex") base.latex = "";
  if (type === "fill") base.text = "Cümle içinde ________ boşluğu bulunan ifade.";
  return base;
}

export function blankExam(course: Course): Exam {
  const now = new Date().toISOString();
  return {
    id: uid("exam"),
    courseId: course.id,
    title: `${course.name} Ara Sınavı`,
    examType: "Ara Sınav",
    date: todayIso(),
    startTime: "10:00",
    durationMin: course.examDurationMin || 60,
    instructions: "Sınav süresi 60 dakikadır.\nCep telefonları kapalı tutulmalıdır.\nKopya girişiminde disiplin yönetmeliği hükümleri uygulanır.",
    questions: [],
    shuffleSeed: Math.floor(Math.random() * 9000) + 1000,
    shuffleOptions: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function useActiveExam() {
  const data = useData();
  const update = useVault((s) => s.update);
  const exam = data.exams.find((e) => e.id === data.ui.activeExamId) ?? data.exams[0] ?? null;
  const course = exam ? data.courses.find((c) => c.id === exam.courseId) ?? null : null;

  const updateExam = useCallback(
    (patch: Partial<Exam> | ((e: Exam) => Partial<Exam>)) => {
      if (!exam) return;
      update("exams", (prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, ...(typeof patch === "function" ? patch(e) : patch), updatedAt: new Date().toISOString() } : e)),
      );
    },
    [exam, update],
  );

  const updateQuestion = useCallback(
    (qid: string, patch: Partial<Question>) => {
      updateExam((e) => ({ questions: e.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) }));
    },
    [updateExam],
  );

  const updateCourse = useCallback(
    (patch: Partial<Course> | ((c: Course) => Partial<Course>)) => {
      if (!course) return;
      update("courses", (prev) => prev.map((c) => (c.id === course.id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)));
    },
    [course, update],
  );

  return { data, exam, course, updateExam, updateQuestion, updateCourse, update };
}
