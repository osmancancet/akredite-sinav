"use client";

import * as React from "react";
import { FileInput } from "lucide-react";
import type { Course, Question } from "@/lib/types";
import { distributePoints, parseQuestionsText } from "@/lib/questionParser";
import { bloomLabel, cn, OPTION_LETTERS, questionTypeLabel, uid } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

const EXAMPLE = `1. Aşağıdakilerden hangisi bir VTYS işlevi değildir? (10 puan)
A) Veri bütünlüğü   B) Eşzamanlı erişim   C) Kaynak kodun derlenmesi   D) Yedekleme
Cevap: C

2. Normalizasyonun amaçlarını açıklayınız. (20 puan)

3. SELECT ______ ifadesi tekrarsız değerleri listeler. (10 puan)
Cevap: DISTINCT`;

export function TextImportDialog({
  open,
  onClose,
  course,
  existingPoints,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  course: Course;
  existingPoints: number;
  onImport: (qs: Question[]) => void;
}) {
  const [text, setText] = React.useState("");
  const [fillTo100, setFillTo100] = React.useState(true);
  const [outcomeId, setOutcomeId] = React.useState(course.outcomes[0]?.id ?? "");
  const parsed = React.useMemo(() => parseQuestionsText(text), [text]);
  const remaining = 100 - existingPoints;
  const canFill = remaining > parsed.reduce((s, p) => s + (p.points ?? 0), 0);
  const points = React.useMemo(
    () => (fillTo100 && canFill ? distributePoints(parsed, remaining) : parsed.map((p) => p.points ?? 10)),
    [parsed, fillTo100, canFill, remaining],
  );
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setText("");
      setOutcomeId(course.outcomes[0]?.id ?? "");
    }
  }
  const validOutcome = course.outcomes.some((o) => o.id === outcomeId) ? outcomeId : "";

  const apply = () => {
    const qs: Question[] = parsed.map((p, i) => {
      const options = p.options.map((o) => ({ id: uid("op"), text: o }));
      const pts = points[i] ?? 10;
      return {
        id: uid("q"),
        type: p.type,
        text: p.text,
        points: pts,
        outcomeIds: validOutcome ? [validOutcome] : [],
        bloom: p.bloom,
        options,
        correctOptionId: p.correctIndex !== undefined ? options[p.correctIndex]?.id : undefined,
        correctBool: p.type === "truefalse" ? p.correctBool ?? true : undefined,
        code: p.code,
        codeLanguage: p.type === "code" ? "sql" : undefined,
        answerKey: p.answerKey,
        rubric: [{ id: uid("rl"), description: p.type === "mcq" || p.type === "truefalse" ? "Doğru yanıt" : "Tam ve doğru yanıt", points: pts }],
        answerLines: p.type === "open" || p.type === "code" ? 8 : 0,
      };
    });
    onImport(qs);
    const missing = parsed.filter((p) => p.type === "mcq" && p.correctIndex === undefined).length;
    toast.success(`${qs.length} soru eklendi`, missing ? `${missing} çoktan seçmeli soruda doğru şık belirtilmemiş — MEDEK denetçisi gösterecek.` : "ÖÇ, Bloom ve rubrikleri kontrol edebilir ya da \"MEDEK'e Uyarla\" ile AI'a atayabilirsiniz.");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Metinden soru aktar"
      description="Word veya PDF'teki sınavı olduğu gibi yapıştırın: numaralar, puanlar, şıklar, doğru cevap, kod blokları ve boşluklar otomatik algılanır."
      icon={<FileInput className="h-5 w-5 text-zinc-500" />}
      footer={
        <Button onClick={apply} disabled={!parsed.length}>
          {parsed.length} soruyu ekle
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Textarea rows={18} className="font-mono text-[11.5px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} />
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox
              checked={fillTo100 && canFill}
              onChange={setFillTo100}
              label={
                <span className="text-xs">
                  {canFill ? `Puanı yazılmamış sorulara kalan ${remaining} puanı dağıt (toplam 100)` : `Sınavda dağıtılacak puan kalmadı (mevcut ${existingPoints}); belirtilmeyenlere 10 puan verilir`}
                </span>
              }
            />
          </div>
          <Field label="Eklenen sorulara varsayılan ÖÇ">
            <div className="flex flex-wrap gap-1.5">
              {course.outcomes.map((o) => (
                <button
                  key={o.id}
                  title={o.text}
                  onClick={() => setOutcomeId(o.id === outcomeId ? "" : o.id)}
                  className={cn("cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium ring-1", validOutcome === o.id ? "bg-brand-700 text-white ring-brand-700" : "text-zinc-600 ring-zinc-200")}
                >
                  {o.code}
                </button>
              ))}
            </div>
          </Field>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            İpucu: Doğru şıkkı &quot;Cevap: C&quot; satırıyla veya şıkkın başına <span className="font-mono">*</span> koyarak belirtin. Kodları <span className="font-mono">```</span> ile çevirin. D/Y soruları için &quot;(D/Y)&quot; yazın.
          </p>
        </div>
        <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          <div className="text-[12px] font-medium text-zinc-700">
            Önizleme · {parsed.length} soru · {points.reduce((s, p) => s + p, 0)} puan
          </div>
          {parsed.map((p, i) => (
            <div key={i} className="rounded-xl border border-zinc-200/80 p-3 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] font-semibold text-zinc-500">S{i + 1}</span>
                <Badge tone="brand">{questionTypeLabel(p.type)}</Badge>
                <Badge>{bloomLabel(p.bloom)}</Badge>
                <Badge tone={p.points === null ? "amber" : "slate"}>
                  {points[i]} p{p.points === null ? " (dağıtıldı)" : ""}
                </Badge>
              </div>
              <div className="mt-1.5 line-clamp-3 text-zinc-800">{p.text}</div>
              {p.options.length > 0 && (
                <div className="mt-1.5 grid gap-0.5 pl-2 text-[11.5px] text-zinc-600">
                  {p.options.map((o, j) => (
                    <div key={j} className={j === p.correctIndex ? "font-semibold text-emerald-700" : ""}>
                      {OPTION_LETTERS[j]}) {o} {j === p.correctIndex && "✓"}
                    </div>
                  ))}
                  {p.correctIndex === undefined && <div className="text-amber-700">Doğru şık belirtilmemiş</div>}
                </div>
              )}
              {p.type === "truefalse" && <div className="mt-1 text-[11.5px] text-zinc-600">Doğru yanıt: {p.correctBool === undefined ? "belirtilmemiş" : p.correctBool ? "Doğru" : "Yanlış"}</div>}
              {p.code && <pre className="mt-1.5 max-h-24 overflow-auto rounded-md bg-zinc-50 p-2 font-mono text-[10.5px] text-zinc-700">{p.code}</pre>}
              {p.answerKey && p.type !== "mcq" && <div className="mt-1 text-[11.5px] text-zinc-500">Cevap anahtarı: {p.answerKey}</div>}
            </div>
          ))}
          {!parsed.length && <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center text-sm text-zinc-500">Metni yapıştırınca sorular burada görünür.</div>}
        </div>
      </div>
    </Dialog>
  );
}
