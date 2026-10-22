"use client";

import * as React from "react";
import {
  Building2,
  Check,
  ClipboardList,
  Copy,
  FileDown,
  FlaskConical,
  FolderKanban,
  NotebookPen,
  Plus,
  Presentation,
  Printer,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { Course, Institution, Rubric, RubricCriterion, RubricType } from "@/lib/types";
import { createRubricFromTemplate, levelPointRange, RUBRIC_LEVELS, RUBRIC_TYPES } from "@/lib/rubricTemplates";
import { cn, uid } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { A4Page, AnswerLines, OfficialHeader, SignatureRow } from "@/components/print/DocParts";
import { printDocument } from "@/components/print/PrintHost";
import { exportRubricDocx, rubricTypeLabel } from "@/services/rubricExportService";
import { aiGenerateRubric } from "@/services/aiCopilotService";
import { useAiRunner } from "@/modules/ai/useAi";

const TYPE_ICONS: Record<RubricType, React.ReactNode> = {
  proje: <FolderKanban className="h-4 w-4" />,
  odev: <NotebookPen className="h-4 w-4" />,
  laboratuvar: <FlaskConical className="h-4 w-4" />,
  sunum: <Presentation className="h-4 w-4" />,
  isyeri: <Building2 className="h-4 w-4" />,
};

const LEVEL_BG = ["bg-red-50", "bg-amber-50", "bg-blue-50", "bg-emerald-50"];

export function RubricStudio() {
  const data = useData();
  const update = useVault((s) => s.update);
  const rubric = data.rubrics.find((r) => r.id === data.ui.activeRubricId) ?? data.rubrics[0];
  const course = rubric ? data.courses.find((c) => c.id === rubric.courseId) : undefined;
  const [aiOpen, setAiOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const setActive = (id: string) => update("ui", (u) => ({ ...u, activeRubricId: id }));
  const setRubric = (patch: Partial<Rubric>) => rubric && update("rubrics", (p) => p.map((r) => (r.id === rubric.id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)));
  const setCriterion = (id: string, patch: Partial<RubricCriterion>) => rubric && setRubric({ criteria: rubric.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const fromTemplate = (type: RubricType) => {
    const c = data.courses.find((x) => x.id === (course?.id ?? data.ui.activeCourseId)) ?? data.courses[0];
    if (!c) return toast.error("Önce bir ders ekleyin.");
    const r = createRubricFromTemplate(type, c.id, c.outcomes.map((o) => o.id));
    update("rubrics", (p) => [...p, r]);
    setActive(r.id);
    toast.success(`${RUBRIC_TYPES.find((t) => t.value === type)?.label} şablonu oluşturuldu`, "ÖÇ eşleştirmelerini ve ağırlıkları kontrol edin.");
  };

  const total = rubric?.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Hazır MEDEK Şablonları" description="Tek tıkla 4 performans düzeyli (Yetersiz · Geliştirilmeli · İyi · Mükemmel) analitik rubrik oluşturun." />
        <CardBody className="flex flex-wrap gap-2">
          {RUBRIC_TYPES.map((t) => (
            <Button key={t.value} variant="outline" onClick={() => fromTemplate(t.value)}>
              {TYPE_ICONS[t.value]} {t.label}
            </Button>
          ))}
          <Button variant="ai" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" /> Konu Başlığından AI ile Rubrik Doldur
          </Button>
        </CardBody>
      </Card>

      {!rubric ? (
        <Card>
          <CardBody className="py-12 text-center text-sm text-slate-500">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            Henüz rubrik yok. Yukarıdan bir şablon seçin.
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody className="flex flex-wrap items-end gap-3 py-4">
              <Field label="Aktif Rubrik" className="min-w-72 flex-1">
                <Select value={rubric.id} onChange={(e) => setActive(e.target.value)}>
                  {data.rubrics.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{rubricTypeLabel(r)}] {r.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                variant="outline"
                onClick={() => {
                  const now = new Date().toISOString();
                  const copy = { ...structuredClone(rubric), id: uid("rb"), title: `${rubric.title} (Kopya)`, createdAt: now, updatedAt: now };
                  update("rubrics", (p) => [...p, copy]);
                  setActive(copy.id);
                }}
              >
                <Copy className="h-4 w-4" /> Çoğalt
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (await confirmDialog({ title: "Rubrik silinsin mi?", message: rubric.title, destructive: true, confirmLabel: "Sil" })) {
                    update("rubrics", (p) => p.filter((r) => r.id !== rubric.id));
                    update("ui", (u) => ({ ...u, activeRubricId: data.rubrics.find((r) => r.id !== rubric.id)?.id ?? null }));
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await exportRubricDocx(data.institution, course, rubric);
                      toast.success("Rubrik (.docx) indirildi", "Rubrik matrisi + öğrenci değerlendirme formu.");
                    } catch (e) {
                      toast.error("Word çıktısı üretilemedi", e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <FileDown className="h-4 w-4" /> Word (.docx)
                </Button>
                <Button variant="outline" onClick={() => printDocument(<RubricDocument inst={data.institution} course={course} rubric={rubric} />, { orientation: "landscape", title: rubric.title })}>
                  <Printer className="h-4 w-4" /> A4 PDF
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-3 md:grid-cols-4">
              <Field label="Başlık" className="md:col-span-2">
                <Input value={rubric.title} onChange={(e) => setRubric({ title: e.target.value })} />
              </Field>
              <Field label="Etkinlik Türü">
                <Select value={rubric.type} onChange={(e) => setRubric({ type: e.target.value as RubricType })}>
                  {RUBRIC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Ders">
                <Select value={rubric.courseId} onChange={(e) => setRubric({ courseId: e.target.value })}>
                  {data.courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Açıklama / Amaç" className="md:col-span-4">
                <Textarea rows={2} value={rubric.description} onChange={(e) => setRubric({ description: e.target.value })} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Kriter × Performans Düzeyi Matrisi"
              description="Her kriter için ÖÇ eşleştirmesi, ağırlık puanı ve 4 düzeyin gözlenebilir davranış tanımı."
              actions={
                <>
                  <Badge tone={Math.abs(total - 100) < 0.001 ? "emerald" : "amber"}>Toplam ağırlık: {total} / 100</Badge>
                  {total > 0 && Math.abs(total - 100) > 0.001 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const scaled = rubric.criteria.map((c) => ({ ...c, weight: Math.round((c.weight / total) * 100 * 2) / 2 }));
                        const diff = 100 - scaled.reduce((s, c) => s + c.weight, 0);
                        scaled[scaled.length - 1].weight += diff;
                        setRubric({ criteria: scaled });
                      }}
                    >
                      100&apos;e ölçekle
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setRubric({ criteria: [...rubric.criteria, { id: uid("cr"), name: "Yeni Kriter", weight: 10, outcomeIds: [], levels: ["", "", "", ""] }] })}
                  >
                    <Plus className="h-3.5 w-3.5" /> Kriter Ekle
                  </Button>
                </>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="text-xs">
                    <th className="w-60 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-slate-600">Kriter · ÖÇ · Ağırlık</th>
                    {RUBRIC_LEVELS.map((l, i) => (
                      <th key={l.key} className={cn("border-b border-l border-slate-200 px-3 py-2 text-left", LEVEL_BG[i])}>
                        <span className="font-semibold text-slate-800">{l.label}</span>
                        <span className="ml-1 font-normal text-slate-500">%{l.range[0]}–{l.range[1]}</span>
                      </th>
                    ))}
                    <th className="w-10 border-b border-slate-200 bg-slate-50" />
                  </tr>
                </thead>
                <tbody>
                  {rubric.criteria.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="border-b border-slate-200 px-3 py-2">
                        <Input value={c.name} onChange={(e) => setCriterion(c.id, { name: e.target.value })} className="font-medium" />
                        <div className="mt-2 flex flex-wrap gap-1">
                          {course?.outcomes.map((o) => {
                            const on = c.outcomeIds.includes(o.id);
                            return (
                              <button
                                key={o.id}
                                title={o.text}
                                onClick={() => setCriterion(c.id, { outcomeIds: on ? c.outcomeIds.filter((x) => x !== o.id) : [...c.outcomeIds, o.id] })}
                                className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 cursor-pointer", on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-500 ring-slate-300")}
                              >
                                {on && <Check className="mr-0.5 inline h-2.5 w-2.5" />}
                                {o.code}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          Ağırlık
                          <Input type="number" step={0.5} className="h-8 w-20" value={c.weight} onChange={(e) => setCriterion(c.id, { weight: Number(e.target.value) || 0 })} />
                          puan
                        </div>
                      </td>
                      {c.levels.map((t, i) => (
                        <td key={i} className={cn("border-b border-l border-slate-200 px-2 py-2", LEVEL_BG[i], "bg-opacity-40")}>
                          <Textarea
                            rows={4}
                            className="min-h-[96px] bg-white/80 text-xs"
                            value={t}
                            onChange={(e) => {
                              const levels = [...c.levels] as RubricCriterion["levels"];
                              levels[i] = e.target.value;
                              setCriterion(c.id, { levels });
                            }}
                          />
                          <div className="mt-1 text-right text-[10.5px] font-medium text-slate-500">{levelPointRange(c.weight, i)} puan</div>
                        </td>
                      ))}
                      <td className="border-b border-slate-200 px-1 py-2">
                        <Button size="icon" variant="ghost" aria-label="Kriteri sil" onClick={() => setRubric({ criteria: rubric.criteria.filter((x) => x.id !== c.id) })}>
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="A4 Yatay Önizleme" />
            <CardBody className="overflow-auto bg-slate-200/60">
              <div style={{ zoom: 0.6 }}>
                <RubricDocument inst={data.institution} course={course} rubric={rubric} />
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <AiRubricDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        defaultCourse={course ?? data.courses[0]}
        courses={data.courses}
        onCreate={(r) => {
          update("rubrics", (p) => [...p, r]);
          setActive(r.id);
        }}
      />
    </div>
  );
}

export function RubricDocument({ inst, course, rubric }: { inst: Institution; course?: Course; rubric: Rubric }) {
  const total = rubric.criteria.reduce((s, c) => s + c.weight, 0);
  const codes = (ids: string[]) => ids.map((id) => course?.outcomes.find((o) => o.id === id)?.code).filter(Boolean).join(", ") || "—";
  return (
    <>
      <A4Page orientation="landscape">
        <OfficialHeader inst={inst} title={rubric.title} subtitle={`${rubricTypeLabel(rubric)} · ${course ? `${course.code} ${course.name}` : ""} · ${inst.academicYear} ${inst.semester}`} right={`${inst.accreditationBody} uyumlu`} />
        <p className="mb-2 text-[10pt] italic">{rubric.description}</p>
        <table className="doc-table compact">
          <thead>
            <tr>
              <th className="w-[16%]">Değerlendirme Ölçütü</th>
              <th className="w-[7%]">ÖÇ</th>
              <th className="w-[6%]">Ağırlık</th>
              {RUBRIC_LEVELS.map((l) => (
                <th key={l.key}>
                  {l.label}
                  <br />
                  <span className="font-normal">(%{l.range[0]}–{l.range[1]})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((c) => (
              <tr key={c.id} className="avoid-break">
                <td className="font-bold">{c.name}</td>
                <td className="text-center">{codes(c.outcomeIds)}</td>
                <td className="text-center font-bold">{c.weight} p</td>
                {c.levels.map((t, i) => (
                  <td key={i} className="text-[9pt]">
                    {t}
                    <div className="mt-1 text-right font-semibold">[{levelPointRange(c.weight, i)} p]</div>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="font-bold">TOPLAM</td>
              <td />
              <td className="text-center font-bold">{total} p</td>
              <td colSpan={4} />
            </tr>
          </tbody>
        </table>
        <SignatureRow items={[{ title: "Ders Sorumlusu", name: course?.instructor }, { title: inst.headTitle || "Bölüm Başkanı", name: inst.headOfDepartment }]} />
      </A4Page>
      <A4Page orientation="landscape">
        <OfficialHeader inst={inst} title={`${rubricTypeLabel(rubric)} Öğrenci Değerlendirme Formu`} subtitle={rubric.title} />
        <table className="doc-table mb-3">
          <tbody>
            <tr>
              <th className="w-[15%] text-left">Öğrenci No</th>
              <td />
              <th className="w-[15%] text-left">Adı Soyadı</th>
              <td />
            </tr>
            <tr>
              <th className="text-left">Ders</th>
              <td>{course ? `${course.code} ${course.name}` : ""}</td>
              <th className="text-left">Tarih</th>
              <td>....../....../20......</td>
            </tr>
            {rubric.type === "isyeri" && (
              <tr>
                <th className="text-left">İşletme</th>
                <td />
                <th className="text-left">İşletme Eğitim Sorumlusu</th>
                <td />
              </tr>
            )}
            {rubric.type === "laboratuvar" && (
              <tr>
                <th className="text-left">Föy / Deney No</th>
                <td />
                <th className="text-left">Laboratuvar</th>
                <td />
              </tr>
            )}
          </tbody>
        </table>
        <table className="doc-table tall">
          <thead>
            <tr>
              <th className="w-[30%]">Ölçüt</th>
              <th className="w-[8%]">Ağırlık</th>
              {RUBRIC_LEVELS.map((l) => (
                <th key={l.key}>{l.label}</th>
              ))}
              <th className="w-[12%]">Verilen Puan</th>
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="text-center">{c.weight}</td>
                {RUBRIC_LEVELS.map((_, i) => (
                  <td key={i} className="text-center text-[9pt]">☐ {levelPointRange(c.weight, i)}</td>
                ))}
                <td />
              </tr>
            ))}
            <tr>
              <td className="font-bold">TOPLAM PUAN</td>
              <td className="text-center font-bold">{total}</td>
              <td colSpan={4} />
              <td />
            </tr>
          </tbody>
        </table>
        <p className="mt-3 font-bold">Değerlendiren Görüşü:</p>
        <AnswerLines count={3} />
        <SignatureRow
          items={rubric.type === "isyeri" ? [{ title: "İşletme Eğitim Sorumlusu" }, { title: "Akademik Danışman", name: course?.instructor }] : [{ title: "Değerlendiren Öğretim Elemanı", name: course?.instructor }]}
        />
      </A4Page>
    </>
  );
}

function AiRubricDialog({
  open,
  onClose,
  defaultCourse,
  courses,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  defaultCourse?: Course;
  courses: Course[];
  onCreate: (r: Rubric) => void;
}) {
  const { run, busy } = useAiRunner();
  const [courseId, setCourseId] = React.useState(defaultCourse?.id ?? "");
  const [type, setType] = React.useState<RubricType>("proje");
  const [topic, setTopic] = React.useState("");
  const [count, setCount] = React.useState(5);
  const course = courses.find((c) => c.id === courseId) ?? defaultCourse;

  const generate = async () => {
    if (!course) return;
    if (!topic.trim()) return toast.error("Konu başlığı girin.");
    const res = await run("rubric", (s) => aiGenerateRubric(s, course, { topic, type, criteriaCount: count, totalPoints: 100 }));
    if (!res) return;
    const now = new Date().toISOString();
    onCreate({ id: uid("rb"), type, courseId: course.id, title: res.title, description: res.description, criteria: res.criteria, createdAt: now, updatedAt: now });
    toast.success("AI rubriği oluşturuldu", `${res.criteria.length} kriter, 4 performans düzeyi.`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="✨ Konu Başlığından Analitik Rubrik Üret"
      description="Gönderilen içerik: ders adı, ÖÇ metinleri, konu başlığı ve etkinlik türü."
      footer={
        <Button variant="ai" onClick={generate} loading={busy === "rubric"}>
          <Sparkles className="h-4 w-4" /> Rubriği Doldur
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ders">
            <Select value={course?.id ?? ""} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Etkinlik Türü">
            <Select value={type} onChange={(e) => setType(e.target.value as RubricType)}>
              {RUBRIC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Konu Başlığı">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="örn. E-ticaret sitesi için ilişkisel veri tabanı tasarımı ve SQL raporları" />
        </Field>
        <Field label="Kriter sayısı">
          <Input type="number" min={3} max={8} value={count} onChange={(e) => setCount(Math.max(3, Math.min(8, Number(e.target.value) || 5)))} />
        </Field>
      </div>
    </Dialog>
  );
}
