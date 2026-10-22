"use client";

import * as React from "react";
import { ClipboardPaste, Plus, Shuffle, Sparkles, Trash2 } from "lucide-react";
import type { ExamType } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { parseOutcomeLines } from "@/lib/textTools";
import { uid } from "@/lib/utils";
import { useAiRunner } from "@/modules/ai/useAi";
import { aiPolishOutcomes } from "@/services/aiCopilotService";
import { useActiveExam } from "./useExam";

export function ExamSettings() {
  const { exam, course, updateExam, data } = useActiveExam();
  if (!exam || !course) return null;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Sınav ve Antet Bilgileri" description={`Antet: ${data.institution.university} · ${data.institution.unitName} (Modül 1'den düzenlenir)`} />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Field label="Sınav Başlığı" className="sm:col-span-2">
            <Input value={exam.title} onChange={(e) => updateExam({ title: e.target.value })} />
          </Field>
          <Field label="Sınav Türü">
            <Select value={exam.examType} onChange={(e) => updateExam({ examType: e.target.value as ExamType })}>
              {["Ara Sınav", "Final", "Bütünleme", "Mazeret", "Kısa Sınav"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tarih">
            <Input type="date" value={exam.date} onChange={(e) => updateExam({ date: e.target.value })} />
          </Field>
          <Field label="Başlangıç Saati">
            <Input type="time" value={exam.startTime} onChange={(e) => updateExam({ startTime: e.target.value })} />
          </Field>
          <Field label="Süre (dakika)">
            <Input type="number" value={exam.durationMin} onChange={(e) => updateExam({ durationMin: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Sınav Kuralları (her satır bir madde)" className="sm:col-span-2">
            <Textarea rows={4} value={exam.instructions} onChange={(e) => updateExam({ instructions: e.target.value })} />
          </Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<Shuffle className="h-4 w-4" />} title="A / B Kitapçık Karıştırıcı" description="Deterministik: aynı tohum her zaman aynı B kitapçığını üretir (cevap anahtarı tutarlılığı)." />
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Karıştırma tohumu (seed)">
            <Input type="number" className="w-36" value={exam.shuffleSeed} onChange={(e) => updateExam({ shuffleSeed: Number(e.target.value) || 1 })} />
          </Field>
          <Button variant="outline" onClick={() => updateExam({ shuffleSeed: Math.floor(Math.random() * 90000) + 1000 })}>
            <Shuffle className="h-4 w-4" /> Yeni Karışım
          </Button>
          <Checkbox checked={exam.shuffleOptions} onChange={(v) => updateExam({ shuffleOptions: v })} label="Çoktan seçmeli şıkları da karıştır" />
        </CardBody>
      </Card>
      <OutcomesEditor />
    </div>
  );
}

export function OutcomesEditor() {
  const { course, updateCourse } = useActiveExam();
  const { run, busy } = useAiRunner();
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [raw, setRaw] = React.useState("");
  const [mode, setMode] = React.useState<"replace" | "append">("replace");
  if (!course) return null;
  const parsed = parseOutcomeLines(raw);

  const applyPaste = () => {
    if (!parsed.length) return toast.error("Metinde öğrenme çıktısı bulunamadı.");
    updateCourse((c) => {
      const base = mode === "replace" ? [] : c.outcomes;
      const added = parsed.map((text, i) => ({ id: uid("oc"), code: `ÖÇ-${base.length + i + 1}`, text }));
      const outcomes = [...base, ...added];
      const matrix = mode === "replace" ? {} : { ...c.ocPcMatrix };
      return { outcomes, ocPcMatrix: matrix };
    });
    toast.success(`${parsed.length} öğrenme çıktısı aktarıldı`, mode === "replace" ? "Eski ÖÇ'ler ve ilgili matris değerleri temizlendi; soruların ÖÇ eşleşmelerini kontrol edin." : undefined);
    setPasteOpen(false);
    setRaw("");
  };

  const renumber = (list: typeof course.outcomes) => list.map((o, i) => ({ ...o, code: `ÖÇ-${i + 1}` }));

  return (
    <Card>
      <CardHeader
        title={`Öğrenme Çıktıları — ${course.code} ${course.name}`}
        description="Sorular, rubrikler ve ÖÇ/PÇ analizi bu listeyi kullanır."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
              <ClipboardPaste className="h-3.5 w-3.5" /> Bologna&apos;dan Toplu Yapıştır
            </Button>
            <Button
              size="sm"
              variant="ai"
              loading={busy === "polish"}
              onClick={async () => {
                const res = await run("polish", (s) => aiPolishOutcomes(s, course));
                if (res?.length) {
                  updateCourse((c) => ({ outcomes: c.outcomes.map((o, i) => ({ ...o, text: res[i] ?? o.text })) }));
                  toast.success("ÖÇ metinleri Bologna ilkelerine göre yeniden yazıldı");
                }
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Bologna&apos;ya Uygun Yaz
            </Button>
          </>
        }
      />
      <CardBody className="space-y-2">
        {course.outcomes.map((o, i) => (
          <div key={o.id} className="flex items-start gap-2">
            <span className="mt-2 w-12 shrink-0 text-xs font-bold text-brand-700">{o.code}</span>
            <Textarea
              rows={2}
              className="min-h-[44px] text-sm"
              value={o.text}
              onChange={(e) => updateCourse((c) => ({ outcomes: c.outcomes.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) }))}
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label="ÖÇ sil"
              onClick={() =>
                updateCourse((c) => {
                  const m = { ...c.ocPcMatrix };
                  delete m[o.id];
                  return { outcomes: renumber(c.outcomes.filter((x) => x.id !== o.id)), ocPcMatrix: m };
                })
              }
            >
              <Trash2 className="h-4 w-4 text-zinc-400" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => updateCourse((c) => ({ outcomes: [...c.outcomes, { id: uid("oc"), code: `ÖÇ-${c.outcomes.length + 1}`, text: "" }] }))}>
          <Plus className="h-3.5 w-3.5" /> ÖÇ ekle
        </Button>
      </CardBody>
      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        size="lg"
        title="Bologna Bilgi Paketinden Toplu ÖÇ Yapıştırıcı"
        description="Ders bilgi paketindeki 'Dersin Öğrenme Çıktıları' bölümünü olduğu gibi yapıştırın; numaralar, madde işaretleri ve 'ÖÇ1:' önekleri otomatik ayıklanır."
        footer={
          <>
            <Select className="w-56" value={mode} onChange={(e) => setMode(e.target.value as "replace" | "append")}>
              <option value="replace">Mevcut ÖÇ&apos;lerin yerine koy</option>
              <option value="append">Mevcut listeye ekle</option>
            </Select>
            <Button onClick={applyPaste} disabled={!parsed.length}>
              {parsed.length} ÖÇ&apos;yi Aktar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Textarea
            rows={12}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"Bu dersi başarıyla tamamlayan öğrenci;\n1. Veri tabanı kavramlarını açıklar.\n2. ER diyagramı çizer.\nÖÇ3: SQL sorguları yazar.\n• Normalizasyon uygular."}
          />
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-2 text-xs font-semibold text-zinc-600">Ayıklanan ÖÇ&apos;ler ({parsed.length})</div>
            <ol className="space-y-1.5 text-sm">
              {parsed.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-12 shrink-0 text-xs font-bold text-brand-700">ÖÇ-{(mode === "append" ? course.outcomes.length : 0) + i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
