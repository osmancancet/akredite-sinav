"use client";

import * as React from "react";
import {
  BookmarkPlus,
  FileInput,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type { BloomLevel, Course, Question, QuestionType } from "@/lib/types";
import { BLOOM_LEVELS, cn, OPTION_LETTERS, QUESTION_TYPES, questionTypeLabel, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { Latex } from "@/components/print/DocParts";
import { useAiRunner } from "@/modules/ai/useAi";
import { aiAdaptToMedek, aiGenerateQuestion, aiTwinQuestion } from "@/services/aiCopilotService";
import { blankQuestion, useActiveExam } from "./useExam";
import { saveQuestionsToBank } from "./questionBank";
import { TextImportDialog } from "./TextImportDialog";

export function QuestionEditor() {
  const { exam, course, updateExam, updateQuestion, update } = useActiveExam();
  const [open, setOpen] = React.useState<string | null>(exam?.questions[0]?.id ?? null);
  const [genOpen, setGenOpen] = React.useState(false);
  const [textOpen, setTextOpen] = React.useState(false);
  if (!exam || !course) return null;

  const add = (type: QuestionType) => {
    const q = blankQuestion(type, course.outcomes[0] ? [course.outcomes[0].id] : []);
    updateExam((e) => ({ questions: [...e.questions, q] }));
    setOpen(q.id);
  };
  const move = (idx: number, dir: -1 | 1) =>
    updateExam((e) => {
      const qs = [...e.questions];
      const j = idx + dir;
      if (j < 0 || j >= qs.length) return {};
      [qs[idx], qs[j]] = [qs[j], qs[idx]];
      return { questions: qs };
    });
  const insertAfter = (idx: number, q: Question) =>
    updateExam((e) => {
      const qs = [...e.questions];
      qs.splice(idx + 1, 0, q);
      return { questions: qs };
    });

  const total = exam.questions.reduce((s, q) => s + (Number(q.points) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3">
        <span className="text-xs font-medium text-zinc-500">Soru ekle:</span>
        {QUESTION_TYPES.map((t) => (
          <Button key={t.value} size="sm" variant="outline" onClick={() => add(t.value)}>
            <Plus className="h-3 w-3" /> {t.label}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => setTextOpen(true)}>
          <FileInput className="h-3.5 w-3.5" /> Metinden aktar
        </Button>
        <Button size="sm" variant="ai" onClick={() => setGenOpen(true)}>
          <Sparkles className="h-3.5 w-3.5" /> AI ile Soru + Rubrik Üret
        </Button>
        <Badge tone={Math.abs(total - 100) < 0.001 ? "emerald" : "amber"} className="ml-auto">
          Toplam: {total} / 100 puan
        </Badge>
      </div>

      {exam.questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          q={q}
          index={i}
          count={exam.questions.length}
          course={course}
          open={open === q.id}
          onToggle={() => setOpen(open === q.id ? null : q.id)}
          onChange={(patch) => updateQuestion(q.id, patch)}
          onMove={(d) => move(i, d)}
          onDuplicate={() => insertAfter(i, { ...structuredClone(q), id: uid("q"), options: q.options.map((o) => ({ ...o, id: uid("op") })) })}
          onInsert={(nq) => {
            insertAfter(i, nq);
            setOpen(nq.id);
          }}
          onDelete={() => updateExam((e) => ({ questions: e.questions.filter((x) => x.id !== q.id) }))}
          onSaveToBank={() => {
            const res = saveQuestionsToBank(update, course.id, [q], exam.title);
            toast.success(res.added ? "Soru bankaya kaydedildi" : "Bankadaki soru güncellendi", "Soru Bankası sekmesinden diğer sınavlarda kullanabilirsiniz.");
          }}
        />
      ))}
      {exam.questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          Bu sınavda henüz soru yok. Yukarıdan bir soru tipi seçin veya AI ile üretin.
        </div>
      )}
      <TextImportDialog
        open={textOpen}
        onClose={() => setTextOpen(false)}
        course={course}
        existingPoints={total}
        onImport={(qs) => {
          updateExam((e) => ({ questions: [...e.questions, ...qs] }));
          setOpen(qs[0]?.id ?? null);
        }}
      />
      <AiGenerateDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        course={course}
        onCreate={(q) => {
          updateExam((e) => ({ questions: [...e.questions, q] }));
          setOpen(q.id);
        }}
      />
    </div>
  );
}

function OutcomePicker({ course, value, onChange }: { course: Course; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {course.outcomes.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            title={o.text}
            onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors cursor-pointer",
              on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-zinc-600 ring-zinc-300 hover:bg-zinc-50",
            )}
          >
            {on && <Check className="mr-0.5 inline h-3 w-3" />}
            {o.code}
          </button>
        );
      })}
      {course.outcomes.length === 0 && <span className="text-xs text-red-600">Önce derse ÖÇ ekleyin.</span>}
    </div>
  );
}

function QuestionCard({
  q,
  index,
  count,
  course,
  open,
  onToggle,
  onChange,
  onMove,
  onDuplicate,
  onInsert,
  onDelete,
  onSaveToBank,
}: {
  q: Question;
  index: number;
  count: number;
  course: Course;
  open: boolean;
  onToggle: () => void;
  onChange: (p: Partial<Question>) => void;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onInsert: (q: Question) => void;
  onDelete: () => void;
  onSaveToBank: () => void;
}) {
  const { run, busy } = useAiRunner();
  const rubricSum = q.rubric.reduce((s, r) => s + (Number(r.points) || 0), 0);
  const codes = q.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).filter(Boolean);

  const adapt = async () => {
    const res = await run("adapt", (s) => aiAdaptToMedek(s, course, q));
    if (res) {
      onChange(res);
      toast.success(`S${index + 1} MEDEK'e uyarlandı`, "ÖÇ, Bloom düzeyi, cevap anahtarı ve rubrik güncellendi.");
    }
  };
  const twin = async () => {
    const res = await run("twin", (s) => aiTwinQuestion(s, course, q));
    if (res) {
      onInsert({ ...q, ...res, id: uid("q"), points: q.points, answerLines: q.answerLines } as Question);
      toast.success("İkiz soru eklendi", `S${index + 2} olarak, B kitapçığı için eşdeğer soru.`);
    }
  };

  const changeType = (type: QuestionType) => {
    const fresh = blankQuestion(type, q.outcomeIds);
    onChange({
      type,
      options: type === "mcq" ? (q.options.length ? q.options : fresh.options) : [],
      correctBool: type === "truefalse" ? q.correctBool ?? true : undefined,
      code: type === "code" ? q.code ?? "" : undefined,
      codeLanguage: type === "code" ? q.codeLanguage ?? "sql" : undefined,
      latex: type === "latex" ? q.latex ?? "" : undefined,
      answerLines: fresh.answerLines,
    });
  };

  return (
    <div className={cn("rounded-xl border bg-white shadow-sm", open ? "border-brand-300 ring-1 ring-brand-100" : "border-zinc-200")}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer">
          {open ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">S{index + 1}</span>
          <span className="truncate text-sm text-zinc-800">{q.text.replace(/\*\*/g, "") || <em className="text-zinc-400">Soru metni girilmedi</em>}</span>
        </button>
        <Badge>{questionTypeLabel(q.type)}</Badge>
        <Badge>{BLOOM_LEVELS.find((b) => b.value === q.bloom)?.label}</Badge>
        <Badge tone={codes.length ? "brand" : "red"}>{codes.length ? codes.join(", ") : "ÖÇ yok"}</Badge>
        <Badge tone="emerald">{q.points} p</Badge>
        <div className="flex items-center">
          <Button size="icon" variant="ghost" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Yukarı taşı">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Aşağı taşı">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onSaveToBank} aria-label="Soru bankasına kaydet" title="Soru bankasına kaydet">
            <BookmarkPlus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDuplicate} aria-label="Kopyala">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Sil">
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-zinc-100 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ai" onClick={adapt} loading={busy === "adapt"}>
              <Wand2 className="h-3.5 w-3.5" /> MEDEK&apos;e Uyarla
            </Button>
            <Button size="sm" variant="ai" onClick={twin} loading={busy === "twin"}>
              <Sparkles className="h-3.5 w-3.5" /> İkiz Soru Üret (B Kitapçığı)
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Soru Tipi">
              <Select value={q.type} onChange={(e) => changeType(e.target.value as QuestionType)}>
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Puan">
              <Input type="number" min={0} step={0.5} value={q.points} onChange={(e) => onChange({ points: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Bloom Düzeyi">
              <Select value={q.bloom} onChange={(e) => onChange({ bloom: e.target.value as BloomLevel })}>
                {BLOOM_LEVELS.map((b) => (
                  <option key={b.value} value={b.value}>{b.order}. {b.label}</option>
                ))}
              </Select>
            </Field>
            {q.type !== "mcq" && q.type !== "truefalse" && (
              <Field label="Cevap boşluğu (satır)">
                <Input type="number" min={0} max={30} value={q.answerLines} onChange={(e) => onChange({ answerLines: Number(e.target.value) || 0 })} />
              </Field>
            )}
          </div>
          <Field label="Ölçtüğü Öğrenme Çıktıları (çoklu seçim)">
            <OutcomePicker course={course} value={q.outcomeIds} onChange={(v) => onChange({ outcomeIds: v })} />
          </Field>
          <Field
            label="Soru Kökü"
            hint={q.type === "fill" ? "Boşlukları ________ ile belirtin. **kalın** yazım desteklenir." : "**kalın ve altı çizili** vurgu için çift yıldız kullanın (örn. **değildir**)."}
          >
            <Textarea rows={3} value={q.text} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>

          {q.type === "mcq" && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-600">Şıklar (doğru şıkkı işaretleyin)</div>
              {q.options.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChange({ correctOptionId: o.id })}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 cursor-pointer",
                      q.correctOptionId === o.id ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-zinc-600 ring-zinc-300",
                    )}
                    title="Doğru şık olarak işaretle"
                  >
                    {OPTION_LETTERS[i]}
                  </button>
                  <Input value={o.text} onChange={(e) => onChange({ options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
                  <Button size="icon" variant="ghost" onClick={() => onChange({ options: q.options.filter((x) => x.id !== o.id) })} aria-label="Şıkkı sil">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {q.options.length < 6 && (
                <Button size="sm" variant="ghost" onClick={() => onChange({ options: [...q.options, { id: uid("op"), text: "" }] })}>
                  <Plus className="h-3 w-3" /> Şık ekle
                </Button>
              )}
            </div>
          )}
          {q.type === "truefalse" && (
            <Field label="Doğru Yanıt">
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <Button key={String(v)} size="sm" variant={q.correctBool === v ? "success" : "outline"} onClick={() => onChange({ correctBool: v })}>
                    {v ? "Doğru" : "Yanlış"}
                  </Button>
                ))}
              </div>
            </Field>
          )}
          {q.type === "code" && (
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <Field label="Kod Bloğu / Şema">
                <Textarea rows={8} className="font-mono text-xs" value={q.code ?? ""} onChange={(e) => onChange({ code: e.target.value })} spellCheck={false} />
              </Field>
              <Field label="Dil">
                <Select value={q.codeLanguage ?? "sql"} onChange={(e) => onChange({ codeLanguage: e.target.value })}>
                  {["sql", "python", "java", "csharp", "javascript", "c", "cpp", "php", "html", "kotlin", "dart"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          {q.type === "latex" && (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="LaTeX İfadesi">
                <Textarea rows={3} className="font-mono text-xs" value={q.latex ?? ""} onChange={(e) => onChange({ latex: e.target.value })} spellCheck={false} />
              </Field>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-1 text-[11px] font-medium text-zinc-500">Canlı Önizleme (KaTeX, çevrimdışı)</div>
                {q.latex ? <Latex expr={q.latex} /> : <span className="text-xs text-zinc-400">İfade girin…</span>}
              </div>
            </div>
          )}

          <Field label={q.type === "code" ? "MEDEK Cevap Anahtarı (beklenen kod)" : "MEDEK Cevap Anahtarı / Beklenen Yanıt"}>
            <Textarea rows={q.type === "code" ? 6 : 3} className={q.type === "code" ? "font-mono text-xs" : ""} value={q.answerKey} onChange={(e) => onChange({ answerKey: e.target.value })} />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600">Kısmi Puanlama Rubriği</span>
              <span className={cn("text-xs font-medium", Math.abs(rubricSum - q.points) < 0.001 ? "text-emerald-600" : "text-amber-600")}>
                Rubrik toplamı: {rubricSum} / {q.points}
              </span>
            </div>
            <div className="space-y-1.5">
              {q.rubric.map((r) => (
                <div key={r.id} className="flex gap-2">
                  <Input value={r.description} placeholder="Puanlama ölçütü" onChange={(e) => onChange({ rubric: q.rubric.map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)) })} />
                  <Input type="number" step={0.5} className="w-24" value={r.points} onChange={(e) => onChange({ rubric: q.rubric.map((x) => (x.id === r.id ? { ...x, points: Number(e.target.value) || 0 } : x)) })} />
                  <Button size="icon" variant="ghost" onClick={() => onChange({ rubric: q.rubric.filter((x) => x.id !== r.id) })} aria-label="Ölçütü sil">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => onChange({ rubric: [...q.rubric, { id: uid("rl"), description: "", points: 0 }] })}>
                <Plus className="h-3 w-3" /> Ölçüt ekle
              </Button>
              {q.rubric.length > 0 && rubricSum > 0 && Math.abs(rubricSum - q.points) > 0.001 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const scaled = q.rubric.map((r) => ({ ...r, points: Math.round((r.points / rubricSum) * q.points * 2) / 2 }));
                    const diff = q.points - scaled.reduce((s, r) => s + r.points, 0);
                    scaled[scaled.length - 1].points += diff;
                    onChange({ rubric: scaled });
                  }}
                >
                  Rubriği {q.points} puana ölçekle
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AiGenerateDialog({ open, onClose, course, onCreate }: { open: boolean; onClose: () => void; course: Course; onCreate: (q: Question) => void }) {
  const { run, busy } = useAiRunner();
  const [outcomeIds, setOutcomeIds] = React.useState<string[]>(course.outcomes[0] ? [course.outcomes[0].id] : []);
  const [bloom, setBloom] = React.useState<BloomLevel>("uygulama");
  const [type, setType] = React.useState<QuestionType>("open");
  const [points, setPoints] = React.useState(10);
  const [topic, setTopic] = React.useState("");

  const generate = async () => {
    const res = await run("gen", (s) => aiGenerateQuestion(s, course, { outcomeIds, bloom, type, points, topic }));
    if (!res) return;
    const base = blankQuestion(type, outcomeIds);
    onCreate({ ...base, ...res, id: uid("q"), points, answerLines: base.answerLines } as Question);
    toast.success("AI sorusu eklendi", "Soruyu ve rubriği kontrol edip düzenleyebilirsiniz.");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="✨ ÖÇ ve Bloom Düzeyine Göre Soru + Rubrik Üret"
      description="Seçili sağlayıcıya yalnızca ders adı, ÖÇ metinleri ve bu ayarlar gönderilir."
      footer={
        <Button variant="ai" onClick={generate} loading={busy === "gen"} disabled={!outcomeIds.length}>
          <Sparkles className="h-4 w-4" /> Üret
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Hedef Öğrenme Çıktısı">
          <OutcomePicker course={course} value={outcomeIds} onChange={setOutcomeIds} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Bloom Düzeyi">
            <Select value={bloom} onChange={(e) => setBloom(e.target.value as BloomLevel)}>
              {BLOOM_LEVELS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Soru Tipi">
            <Select value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Puan">
            <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} />
          </Field>
        </div>
        <Field label="Konu / odak (isteğe bağlı)">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="örn. LEFT JOIN ve alt sorgular" />
        </Field>
        <p className="text-[11px] text-zinc-500">
          Bloom fiil ipucu: {BLOOM_LEVELS.find((b) => b.value === bloom)?.verbs}
        </p>
      </div>
    </Dialog>
  );
}
