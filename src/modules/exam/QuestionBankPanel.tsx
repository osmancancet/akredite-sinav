"use client";

import * as React from "react";
import { Check, Library, Plus, Search, Trash2 } from "lucide-react";
import type { BloomLevel, QuestionType } from "@/lib/types";
import { BLOOM_LEVELS, bloomLabel, cn, formatTrDate, foldTr, QUESTION_TYPES, questionTypeLabel } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input, Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { cloneForExam, markUsed, saveQuestionsToBank } from "./questionBank";
import { useActiveExam } from "./useExam";

export function QuestionBankPanel() {
  const { data, exam, course, updateExam, update } = useActiveExam();
  const [courseId, setCourseId] = React.useState(course?.id ?? "");
  const [q, setQ] = React.useState("");
  const [bloom, setBloom] = React.useState<BloomLevel | "">("");
  const [type, setType] = React.useState<QuestionType | "">("");
  const [oc, setOc] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const filterCourse = data.courses.find((c) => c.id === courseId);

  const inExam = React.useMemo(() => new Set((exam?.questions ?? []).map((x) => foldTr(x.text).slice(0, 120))), [exam]);
  const items = data.questionBank.filter((b) => {
    if (courseId && b.courseId !== courseId) return false;
    if (bloom && b.question.bloom !== bloom) return false;
    if (type && b.question.type !== type) return false;
    if (oc && !b.question.outcomeIds.includes(oc)) return false;
    if (q.trim() && !foldTr(`${b.question.text} ${b.question.answerKey}`).includes(foldTr(q.trim()))) return false;
    return true;
  });

  if (!exam || !course) return null;
  const sameCourse = courseId === course.id;

  const addToExam = (ids: string[]) => {
    const chosen = data.questionBank.filter((b) => ids.includes(b.id));
    if (!chosen.length) return;
    const qs = chosen.map((b) => {
      const qq = cloneForExam(b);
      if (b.courseId !== course.id) qq.outcomeIds = [];
      return qq;
    });
    updateExam((e) => ({ questions: [...e.questions, ...qs] }));
    markUsed(update, ids);
    setPicked([]);
    const total = exam.questions.reduce((s, x) => s + x.points, 0) + qs.reduce((s, x) => s + x.points, 0);
    toast.success(`${qs.length} soru sınava eklendi`, `${sameCourse ? "" : "Farklı dersten geldiği için ÖÇ eşleştirmeleri temizlendi. "}Sınav toplamı şimdi ${total} puan.`);
  };

  const saveAll = () => {
    const res = saveQuestionsToBank(update, course.id, exam.questions, exam.title);
    toast.success("Sınavın soruları bankaya kaydedildi", `${res.added} yeni, ${res.updated} güncellendi.`);
  };

  return (
    <Card>
      <CardHeader
        icon={<Library />}
        title={`Soru bankası · ${data.questionBank.length} soru`}
        description="Dönemler arası yeniden kullanım. Sorular şifreli kasada saklanır; aynı metinli soru ikinci kez kaydedilince güncellenir."
        actions={
          <Button size="sm" variant="outline" onClick={saveAll} disabled={!exam.questions.length}>
            <Plus className="h-3.5 w-3.5" /> Bu sınavın sorularını kaydet
          </Button>
        }
      />
      <CardBody className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input className="pl-8" placeholder="Soru metninde ara…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={courseId} onChange={(e) => { setCourseId(e.target.value); setOc(""); }}>
            <option value="">Tüm dersler</option>
            {data.courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </Select>
          <Select value={bloom} onChange={(e) => setBloom(e.target.value as BloomLevel | "")}>
            <option value="">Tüm Bloom düzeyleri</option>
            {BLOOM_LEVELS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value as QuestionType | "")}>
            <option value="">Tüm tipler</option>
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>
        {filterCourse && filterCourse.outcomes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setOc("")} className={cn("cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium ring-1", !oc ? "bg-zinc-900 text-white ring-zinc-900" : "text-zinc-600 ring-zinc-200")}>
              Tüm ÖÇ
            </button>
            {filterCourse.outcomes.map((o) => (
              <button
                key={o.id}
                title={o.text}
                onClick={() => setOc(o.id === oc ? "" : o.id)}
                className={cn("cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium ring-1", oc === o.id ? "bg-brand-700 text-white ring-brand-700" : "text-zinc-600 ring-zinc-200")}
              >
                {o.code}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{items.length} sonuç</span>
          {picked.length > 0 && (
            <Button size="sm" onClick={() => addToExam(picked)}>
              <Plus className="h-3.5 w-3.5" /> Seçili {picked.length} soruyu sınava ekle
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {items.map((b) => {
            const bc = data.courses.find((c) => c.id === b.courseId);
            const codes = b.question.outcomeIds.map((id) => bc?.outcomes.find((o) => o.id === id)?.code).filter(Boolean);
            const already = inExam.has(foldTr(b.question.text).slice(0, 120));
            const on = picked.includes(b.id);
            return (
              <div key={b.id} className={cn("rounded-xl border p-3 transition-colors", on ? "border-zinc-900 bg-zinc-50/70" : "border-zinc-200/80")}>
                <div className="flex items-start gap-3">
                  <Checkbox checked={on} onChange={(v) => setPicked((p) => (v ? [...p, b.id] : p.filter((x) => x !== b.id)))} />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[13px] text-zinc-900">{b.question.text.replace(/\*\*/g, "")}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge>{questionTypeLabel(b.question.type)}</Badge>
                      <Badge>{bloomLabel(b.question.bloom)}</Badge>
                      {codes.length > 0 && <Badge tone="brand">{codes.join(", ")}</Badge>}
                      <Badge tone="slate">{b.question.points} p</Badge>
                      <span className="font-mono text-[10.5px] text-zinc-400">
                        {bc?.code} · {b.usedCount} kullanım{b.lastUsedAt ? ` · son ${formatTrDate(b.lastUsedAt.slice(0, 10))}` : ""}
                      </span>
                      {already && (
                        <Badge tone="emerald">
                          <Check className="h-3 w-3" /> Bu sınavda
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" onClick={() => addToExam([b.id])}>
                      <Plus className="h-3.5 w-3.5" /> Ekle
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Bankadan sil"
                      onClick={async () => {
                        if (await confirmDialog({ title: "Soru bankadan silinsin mi?", message: "Sınavlardaki kopyalar etkilenmez.", destructive: true, confirmLabel: "Sil" })) {
                          update("questionBank", (bank) => bank.filter((x) => x.id !== b.id));
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {!items.length && (
            <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500">
              {data.questionBank.length ? "Filtrelerle eşleşen soru yok." : "Banka boş. Soru kartındaki yer imi simgesiyle veya \"Bu sınavın sorularını kaydet\" ile başlayın."}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
