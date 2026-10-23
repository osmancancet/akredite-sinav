"use client";

import type { BankQuestion, Question, VaultData } from "@/lib/types";
import { foldTr, uid } from "@/lib/utils";

type Update = <K extends keyof VaultData>(k: K, updater: VaultData[K] | ((p: VaultData[K]) => VaultData[K])) => void;

const signature = (courseId: string, q: Question) => `${courseId}::${q.type}::${foldTr(q.text).replace(/[^a-z0-9çğöşü]+/g, " ").trim()}`;

/** Soruyu bankaya kaydeder; aynı ders + aynı metin varsa kaydı günceller (kopya oluşturmaz). */
export function saveQuestionsToBank(update: Update, courseId: string, questions: Question[], sourceExamTitle?: string): { added: number; updated: number } {
  let added = 0;
  let updated = 0;
  update("questionBank", (bank) => {
    const next = [...bank];
    const now = new Date().toISOString();
    questions.forEach((q) => {
      if (!q.text.trim()) return;
      const sig = signature(courseId, q);
      const idx = next.findIndex((b) => signature(b.courseId, b.question) === sig);
      const copy = structuredClone(q);
      if (idx >= 0) {
        next[idx] = { ...next[idx], question: copy, savedAt: now, sourceExamTitle: sourceExamTitle ?? next[idx].sourceExamTitle };
        updated++;
      } else {
        next.unshift({ id: uid("bank"), courseId, question: copy, savedAt: now, usedCount: 0, sourceExamTitle });
        added++;
      }
    });
    return next;
  });
  return { added, updated };
}

/** Bankadaki soruyu yeni kimliklerle kopyalar (sınavlar arası bağımsızlık için). */
export function cloneForExam(item: BankQuestion): Question {
  const q = structuredClone(item.question);
  const optionMap = new Map<string, string>();
  q.options = q.options.map((o) => {
    const id = uid("op");
    optionMap.set(o.id, id);
    return { ...o, id };
  });
  q.correctOptionId = q.correctOptionId ? optionMap.get(q.correctOptionId) : undefined;
  q.rubric = q.rubric.map((r) => ({ ...r, id: uid("rl") }));
  q.id = uid("q");
  return q;
}

export function markUsed(update: Update, ids: string[]) {
  const now = new Date().toISOString();
  update("questionBank", (bank) => bank.map((b) => (ids.includes(b.id) ? { ...b, usedCount: b.usedCount + 1, lastUsedAt: now } : b)));
}
