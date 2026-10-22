// A / B Kitapçık Karıştırıcı — deterministik (aynı tohum → aynı kitapçık)

import type { Exam, Question } from "./types";
import { hashString, OPTION_LETTERS, seededShuffle } from "./utils";

export type BookletType = "A" | "B";

export interface BookletQuestion {
  number: number; // kitapçıktaki sıra
  originalIndex: number; // A kitapçığındaki sıra (0 tabanlı)
  question: Question; // şıkları kitapçığa göre sıralanmış kopya
  correctLetter?: string;
}

export function buildBooklet(exam: Exam, booklet: BookletType): BookletQuestion[] {
  const indexed = exam.questions.map((q, i) => ({ q, i }));
  const order = booklet === "A" ? indexed : seededShuffle(indexed, exam.shuffleSeed);
  return order.map(({ q, i }, n) => {
    let options = q.options;
    if (booklet === "B" && exam.shuffleOptions && q.type === "mcq") {
      options = seededShuffle(q.options, (exam.shuffleSeed ^ hashString(q.id)) >>> 0);
    }
    const copy: Question = { ...q, options };
    const ci = q.type === "mcq" ? options.findIndex((o) => o.id === q.correctOptionId) : -1;
    return {
      number: n + 1,
      originalIndex: i,
      question: copy,
      correctLetter: ci >= 0 ? OPTION_LETTERS[ci] : undefined,
    };
  });
}

export function correctAnswerText(bq: BookletQuestion): string {
  const q = bq.question;
  switch (q.type) {
    case "mcq":
      return bq.correctLetter ? `${bq.correctLetter}) ${q.options.find((o) => o.id === q.correctOptionId)?.text ?? ""}` : "Belirtilmedi";
    case "truefalse":
      return q.correctBool === undefined ? "Belirtilmedi" : q.correctBool ? "Doğru" : "Yanlış";
    default:
      return q.answerKey || "—";
  }
}
