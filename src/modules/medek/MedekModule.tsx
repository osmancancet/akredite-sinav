"use client";

import * as React from "react";
import {
  BarChart3,
  Calculator,
  Download,
  Eraser,
  FileDown,
  Grid3x3,
  Microscope,
  Network,
  ListPlus,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wand2,
} from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { Course, Exam, GradeRow, GradeSheet, PukoEntry } from "@/lib/types";
import { computeAnalysis, rowTotal, scaleLabel, simulateGrades, suggestPuko } from "@/lib/medekMath";
import { fullName } from "@/lib/seating";
import { bloomLabel, clamp, cn, round, uid } from "@/lib/utils";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { ColumnChart, HBarChart } from "@/components/charts/BarChart";
import { printDocument } from "@/components/print/PrintHost";
import { downloadGradeTemplate, exportPukoDocx, readGradeFile, resolvePuko, type PukoCtx } from "@/services/medekExportService";
import { aiWritePuko } from "@/services/aiCopilotService";
import { useAiRunner } from "@/modules/ai/useAi";
import { PukoDocument } from "./PukoDocument";
import { takePendingTab } from "@/components/shell/shellStore";
import { ItemAnalysisView } from "./ItemAnalysisView";
import { ProgramPanelView } from "./ProgramPanelView";

type TabId = "grades" | "matrix" | "analysis" | "items" | "program" | "puko";

export function MedekModule() {
  const data = useData();
  const update = useVault((s) => s.update);
  const [tab, setTab] = React.useState<TabId>(() => takePendingTab<TabId>("medek", "analysis"));
  const exam = data.exams.find((e) => e.id === data.ui.activeExamId) ?? data.exams[0];
  const course = exam ? data.courses.find((c) => c.id === exam.courseId) : undefined;

  if (!exam || !course) {
    return (
      <Card>
        <CardBody className="py-12 text-center text-sm text-zinc-500">Önce Modül 2&apos;de bir sınav oluşturun.</CardBody>
      </Card>
    );
  }

  const sheet: GradeSheet = data.grades[exam.id] ?? { examId: exam.id, rows: [], puko: {}, generalEvaluation: "", updatedAt: new Date().toISOString() };
  const threshold = data.institution.targetThreshold || 60;
  const analysis = computeAnalysis(exam, course, data.programOutcomes, sheet, threshold);
  const setSheet = (patch: Partial<GradeSheet>) =>
    update("grades", (g) => ({ ...g, [exam.id]: { ...sheet, ...(g[exam.id] ?? {}), ...patch, examId: exam.id, updatedAt: new Date().toISOString() } }));
  const flagged = analysis.outcomeStats.filter((o) => o.flagged);
  const ctx: PukoCtx = { inst: data.institution, course, exam, programOutcomes: data.programOutcomes, sheet, analysis, threshold };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 py-4">
          <Field label="Sınav / Ölçme Aracı" className="min-w-72 flex-1">
            <Select value={exam.id} onChange={(e) => update("ui", (u) => ({ ...u, activeExamId: e.target.value }))}>
              {data.exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {data.courses.find((c) => c.id === e.courseId)?.code} — {e.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid flex-[2] grid-cols-2 gap-3 md:grid-cols-5">
            <StatTile label="Öğrenci" value={analysis.stats.n} icon={<Users className="h-4 w-4 text-brand-500" />} />
            <StatTile label="Ortalama" value={round(analysis.stats.mean, 1)} hint={`σ ${round(analysis.stats.sd, 1)}`} />
            <StatTile label="Başarı Oranı" value={`%${round(analysis.stats.passRate, 0)}`} hint="≥ %50 puan" />
            <StatTile label="ÖÇ Eşik Altı" value={`${flagged.length} / ${course.outcomes.length}`} tone={flagged.length ? "red" : "emerald"} hint={`Hedef %${threshold}`} />
            <StatTile label="Ort. PÇ Sağlanma" value={`%${round(avgNonNull(analysis.poStats.map((p) => p.pct)), 1)}`} tone="brand" />
          </div>
        </CardBody>
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "grades", label: "Soru Bazlı Not Girişi", icon: <Calculator className="h-3.5 w-3.5" /> },
          { value: "matrix", label: "ÖÇ × PÇ Matrisi", icon: <Grid3x3 className="h-3.5 w-3.5" /> },
          { value: "analysis", label: "Analiz & Grafikler", icon: <BarChart3 className="h-3.5 w-3.5" /> },
          { value: "items", label: "Madde Analizi", icon: <Microscope className="h-3.5 w-3.5" /> },
          { value: "program", label: "Program Panosu", icon: <Network className="h-3.5 w-3.5" /> },
          { value: "puko", label: "PUKÖ Raporu", icon: <FileDown className="h-3.5 w-3.5" />, badge: flagged.length ? <Badge tone="red">{flagged.length}</Badge> : undefined },
        ]}
      />

      {tab === "grades" && <GradeEntry exam={exam} course={course} sheet={sheet} setSheet={setSheet} />}
      {tab === "matrix" && <MatrixEditor course={course} />}
      {tab === "analysis" && <AnalysisView ctx={ctx} />}
      {tab === "items" && <ItemAnalysisView exam={exam} sheet={sheet} />}
      {tab === "program" && <ProgramPanelView />}
      {tab === "puko" && <PukoPanel ctx={ctx} setSheet={setSheet} />}
    </div>
  );
}

function avgNonNull(vals: (number | null)[]) {
  const v = vals.filter((x): x is number => x !== null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
}

function GradeEntry({ exam, course, sheet, setSheet }: { exam: Exam; course: Course; sheet: GradeSheet; setSheet: (p: Partial<GradeSheet>) => void }) {
  const data = useData();
  const roster = data.students[course.id] ?? [];
  const fileRef = React.useRef<HTMLInputElement>(null);
  const total = exam.questions.reduce((s, q) => s + q.points, 0);
  const setRow = (id: string, patch: Partial<GradeRow>) => setSheet({ rows: sheet.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const simulate = async () => {
    if (sheet.rows.length && !(await confirmDialog({ title: "Mevcut notlar değiştirilsin mi?", message: "40 öğrencilik gerçekçi simülasyon mevcut not çizelgesinin yerini alacak." }))) return;
    const rows = simulateGrades(exam, roster.map((s) => ({ no: s.no, fullName: fullName(s) })), 40, Math.floor(Math.random() * 1e6));
    setSheet({ rows });
    toast.success("40 öğrenci notu simüle edildi", "Bloom düzeyine bağlı zorluk modeli ile gerçekçi dağılım.");
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const rows = await readGradeFile(file, exam);
      setSheet({ rows });
      toast.success(`${rows.length} öğrencinin notu yüklendi`);
    } catch (e) {
      toast.error("Not dosyası okunamadı", e instanceof Error ? e.message : String(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader
        title="Soru Bazlı Öğrenci Notları"
        description="Her hücre ilgili sorudan alınan puandır (maksimum puanı aşamaz). Boş satırlar hesaba katılmaz."
        actions={
          <>
            <Button size="sm" variant="ai" onClick={simulate}>
              <Wand2 className="h-3.5 w-3.5" /> Tek Tıkla 40 Öğrenci Notu Simüle Et
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadGradeTemplate(
                  exam,
                  course,
                  sheet.rows.length ? sheet.rows.map((r) => ({ no: r.studentNo, name: r.fullName, scores: r.scores })) : roster.map((s) => ({ no: s.no, name: fullName(s) })),
                )
              }
            >
              <Download className="h-3.5 w-3.5" /> Excel Şablonu İndir
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Excel Yükle
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            {roster.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const existing = new Set(sheet.rows.map((r) => r.studentNo));
                  const add = roster.filter((s) => !existing.has(s.no)).map((s) => ({ id: uid("gr"), studentNo: s.no, fullName: fullName(s), scores: Object.fromEntries(exam.questions.map((q) => [q.id, null])) }));
                  setSheet({ rows: [...sheet.rows, ...add] });
                  toast.info(`${add.length} öğrenci satırı OBS listesinden eklendi`);
                }}
              >
                <ListPlus className="h-3.5 w-3.5" /> OBS Listesinden Satır Oluştur
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (await confirmDialog({ title: "Tüm notlar silinsin mi?", message: "Bu sınavın not çizelgesi temizlenecek.", destructive: true, confirmLabel: "Temizle" })) setSheet({ rows: [] });
              }}
            >
              <Eraser className="h-3.5 w-3.5" />
            </Button>
          </>
        }
      />
      <div className="max-h-[620px] overflow-auto scrollbar-thin">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Öğrenci No</th>
              <th className="px-2 py-2 text-left">Adı Soyadı</th>
              {exam.questions.map((q, i) => (
                <th key={q.id} className="px-1 py-2 text-center" title={`${bloomLabel(q.bloom)} · ${q.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).join(", ")}`}>
                  S{i + 1}
                  <div className="font-normal text-zinc-400">/{q.points}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center">Toplam<div className="font-normal text-zinc-400">/{total}</div></th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((r, ri) => {
              const t = rowTotal(r, exam);
              return (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-2 py-0.5 text-xs text-zinc-400">{ri + 1}</td>
                  <td className="px-2 py-0.5">
                    <input className="w-24 bg-transparent font-mono text-xs outline-none" value={r.studentNo} onChange={(e) => setRow(r.id, { studentNo: e.target.value })} />
                  </td>
                  <td className="px-2 py-0.5">
                    <input className="w-44 bg-transparent text-sm outline-none" value={r.fullName} onChange={(e) => setRow(r.id, { fullName: e.target.value })} />
                  </td>
                  {exam.questions.map((q) => {
                    const v = r.scores[q.id];
                    return (
                      <td key={q.id} className="px-1 py-0.5">
                        <input
                          type="number"
                          min={0}
                          max={q.points}
                          step={0.5}
                          value={v ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setRow(r.id, { scores: { ...r.scores, [q.id]: raw === "" ? null : clamp(Number(raw), 0, q.points) } });
                          }}
                          className={cn("h-7 w-14 rounded border border-zinc-200 px-1 text-center text-xs tabular-nums outline-none focus:border-brand-400", v !== null && v !== undefined && v < q.points * 0.5 && "bg-red-50")}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-0.5 text-center font-semibold tabular-nums">{round(t, 1)}</td>
                  <td className="px-1">
                    <button className="text-zinc-300 hover:text-red-500 cursor-pointer" onClick={() => setSheet({ rows: sheet.rows.filter((x) => x.id !== r.id) })} aria-label="Satırı sil">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!sheet.rows.length && (
              <tr>
                <td colSpan={exam.questions.length + 5} className="px-3 py-10 text-center text-zinc-400">
                  Not girilmedi. Simülasyon, Excel veya OBS listesi ile başlayın.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-zinc-100 px-4 py-2">
        <Button size="sm" variant="ghost" onClick={() => setSheet({ rows: [...sheet.rows, { id: uid("gr"), studentNo: "", fullName: "", scores: {} }] })}>
          <Plus className="h-3.5 w-3.5" /> Satır ekle
        </Button>
      </div>
    </Card>
  );
}

const WEIGHT_BG = ["bg-white", "bg-blue-50", "bg-blue-100", "bg-blue-200", "bg-blue-300", "bg-blue-400 text-white"];

function MatrixEditor({ course }: { course: Course }) {
  const data = useData();
  const update = useVault((s) => s.update);
  const pos = data.programOutcomes;
  const setW = (ocId: string, j: number, w: number) =>
    update("courses", (p) =>
      p.map((c) => {
        if (c.id !== course.id) return c;
        const row = [...(c.ocPcMatrix[ocId] ?? new Array(pos.length).fill(0))];
        while (row.length < pos.length) row.push(0);
        row[j] = clamp(w, 0, 5);
        return { ...c, ocPcMatrix: { ...c.ocPcMatrix, [ocId]: row } };
      }),
    );
  return (
    <Card>
      <CardHeader
        title={`ÖÇ × PÇ İlişki Matrisi — ${course.code}`}
        description="Hücreye tıklayın: 0 → 5 artar (Shift+tık azaltır). 0: İlişkisiz · 1: Çok Düşük · 2: Düşük · 3: Orta · 4: Yüksek · 5: Çok Yüksek katkı."
      />
      <CardBody className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-64 p-1 text-left text-zinc-500">Öğrenme Çıktısı</th>
              {pos.map((p) => (
                <th key={p.id} className="p-1 font-semibold text-zinc-700" title={p.text}>
                  {p.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {course.outcomes.map((o) => (
              <tr key={o.id}>
                <td className="p-1 align-middle" title={o.text}>
                  <span className="font-bold text-brand-700">{o.code}</span> <span className="line-clamp-1 text-zinc-600">{o.text}</span>
                </td>
                {pos.map((p, j) => {
                  const w = course.ocPcMatrix[o.id]?.[j] ?? 0;
                  return (
                    <td key={p.id} className="p-0.5">
                      <button
                        onClick={(e) => setW(o.id, j, e.shiftKey ? (w + 5) % 6 : (w + 1) % 6)}
                        className={cn("h-9 w-full rounded-md text-sm font-semibold tabular-nums ring-1 ring-zinc-200 cursor-pointer", WEIGHT_BG[w])}
                        title={`${o.code} → ${p.code}: ${w}`}
                      >
                        {w || "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="p-1 text-right font-semibold text-zinc-500">Σ Ağırlık</td>
              {pos.map((p, j) => (
                <td key={p.id} className="p-1 text-center font-semibold tabular-nums text-zinc-600">
                  {course.outcomes.reduce((s, o) => s + (course.ocPcMatrix[o.id]?.[j] ?? 0), 0)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
          Ağırlık ölçeği:
          {WEIGHT_BG.map((bg, i) => (
            <span key={i} className={cn("inline-flex h-5 w-7 items-center justify-center rounded ring-1 ring-zinc-200", bg)}>
              {i}
            </span>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function AnalysisView({ ctx }: { ctx: PukoCtx }) {
  const { analysis, threshold, course } = ctx;
  if (!analysis.stats.n) {
    return (
      <Card>
        <CardBody className="py-12 text-center text-sm text-zinc-500">Analiz için not girişi gerekli. &quot;Soru Bazlı Not Girişi&quot; sekmesinden simülasyon yapabilirsiniz.</CardBody>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="ÖÇ Gerçekleşme Yüzdeleri" description={`Başarı(ÖÇ_k)% = ΣX_i / ΣP_i × 100 · Kesikli çizgi: hedef eşik %${threshold}`} />
        <CardBody>
          <HBarChart
            data={analysis.outcomeStats.map((o) => ({ key: o.outcomeId, label: o.code, value: o.pct, hint: `${o.text} — Sorular: ${o.questionLabels.join(", ")}` }))}
            max={100}
            reference={threshold}
            referenceLabel={`Hedef eşik %${threshold}`}
            flagBelow={threshold}
            format={(v) => `%${round(v, 1)}`}
            labelWidth={52}
          />
          <table className="mt-4 w-full text-xs">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-1">ÖÇ</th>
                <th>Σ Ort / Σ Maks</th>
                <th>%</th>
                <th>5&apos;lik</th>
                <th>Düzey</th>
              </tr>
            </thead>
            <tbody>
              {analysis.outcomeStats.map((o) => (
                <tr key={o.outcomeId} className="border-t border-zinc-100">
                  <td className="py-1 font-semibold">{o.code}</td>
                  <td className="tabular-nums">{round(o.sumAvg, 1)} / {o.sumMax}</td>
                  <td className="tabular-nums">{o.pct === null ? "—" : `%${round(o.pct, 1)}`}</td>
                  <td className="tabular-nums">{o.scale5 === null ? "—" : o.scale5.toFixed(2)}</td>
                  <td>{o.flagged ? <Badge tone="red">İyileştirme Gerekli</Badge> : <Badge tone="emerald">{scaleLabel(o.pct)}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="PÇ Sağlanma Oranları" description="Başarı(PÇ_j)% = Σ Başarı(ÖÇ_k)% × W_kj / Σ W_kj" />
        <CardBody>
          <HBarChart
            data={analysis.poStats.map((p) => ({ key: p.poId, label: p.code, value: p.pct, hint: `${p.text} — Σ ağırlık ${p.weightSum}${p.scale5 !== null ? ` · 5'lik ${p.scale5.toFixed(2)}` : ""}` }))}
            max={100}
            reference={threshold}
            referenceLabel={`Hedef eşik %${threshold} · Ağırlığı 0 olan PÇ'ler "ölçülmedi"`}
            flagBelow={threshold}
            format={(v) => `%${round(v, 1)}`}
            labelWidth={52}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Soru Bazlı Başarı" />
        <CardBody>
          <HBarChart
            data={analysis.questionStats.map((q) => ({
              key: q.questionId,
              label: q.label,
              value: q.pct,
              hint: `${bloomLabel(q.bloom)} · ${q.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).join(", ")} · ort. ${round(q.avg, 2)}/${q.maxPoints}`,
            }))}
            max={100}
            flagBelow={threshold}
            reference={threshold}
            format={(v) => `%${round(v, 1)}`}
            labelWidth={40}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Puan Dağılımı (Histogram)" description={`Ortalama ${round(analysis.stats.mean, 1)} · Medyan ${round(analysis.stats.median, 1)} · En yüksek ${analysis.stats.max} · En düşük ${analysis.stats.min}`} />
        <CardBody>
          <ColumnChart
            data={analysis.stats.histogram.map((n, i) => ({ key: String(i), label: `${i * 10}–${i === 9 ? 100 : i * 10 + 9}`, value: n, hint: `%${i * 10}–${i === 9 ? 100 : i * 10 + 9} aralığında ${n} öğrenci` }))}
            format={(v) => String(v)}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function PukoPanel({ ctx, setSheet }: { ctx: PukoCtx; setSheet: (p: Partial<GradeSheet>) => void }) {
  const { analysis, sheet, threshold, exam, course } = ctx;
  const { run, busy } = useAiRunner();
  const [exporting, setExporting] = React.useState(false);
  const flagged = analysis.outcomeStats.filter((o) => o.flagged);
  const entries = resolvePuko(ctx);
  const setEntry = (e: PukoEntry, patch: Partial<PukoEntry>) => setSheet({ puko: { ...sheet.puko, [e.outcomeId]: { ...e, ...patch } } });

  const aiWrite = async () => {
    const extra = analysis.questionStats.map((q) => `${q.label} (${bloomLabel(q.bloom)}, ${q.outcomeIds.map((id) => course.outcomes.find((o) => o.id === id)?.code).join("/")}): %${round(q.pct, 1)}`).join("; ");
    const res = await run("puko", (s) => aiWritePuko(s, course, exam.title, flagged, analysis.outcomeStats, threshold, extra));
    if (!res) return;
    const puko = { ...sheet.puko };
    res.items.forEach((it) => {
      const o = flagged.find((f) => f.code.replace(/\s/g, "") === String(it.outcomeCode).replace(/\s/g, ""));
      if (o) puko[o.outcomeId] = { outcomeId: o.outcomeId, rootCause: it.rootCause, plan: it.plan, doAction: it.doAction, check: it.check, act: it.act };
    });
    setSheet({ puko, generalEvaluation: res.generalEvaluation || sheet.generalEvaluation });
    toast.success("PUKÖ eylem planı AI ile yazıldı", "Yalnızca toplu (anonim) başarı yüzdeleri gönderildi.");
  };

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Sürekli İyileştirme (PUKÖ) Eylem Planı"
            description={flagged.length ? `${flagged.length} ÖÇ hedef eşik %${threshold} altında — otomatik kök neden ve önlem önerileri üretildi.` : "Tüm ÖÇ'ler eşik üzerinde."}
            actions={
              <>
                <Button size="sm" variant="ai" onClick={aiWrite} loading={busy === "puko"} disabled={!flagged.length}>
                  <Sparkles className="h-3.5 w-3.5" /> PUKÖ Yaz (AI)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSheet({ puko: {} });
                    toast.info("Otomatik önerilere dönüldü");
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Önerileri Sıfırla
                </Button>
              </>
            }
          />
          <CardBody className="space-y-5">
            {entries.map((e) => {
              const o = analysis.outcomeStats.find((x) => x.outcomeId === e.outcomeId)!;
              return (
                <div key={e.outcomeId} className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                  <div className="flex items-center gap-2">
                    <Badge tone="red">{o.code}</Badge>
                    <span className="text-sm font-medium">%{round(o.pct ?? 0, 1)}</span>
                    <span className="truncate text-xs text-zinc-600">{o.text}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {(
                      [
                        ["rootCause", "Kök Neden Analizi"],
                        ["plan", "P — Planla"],
                        ["doAction", "U — Uygula"],
                        ["check", "K — Kontrol Et"],
                        ["act", "Ö — Önlem Al"],
                      ] as const
                    ).map(([k, label]) => (
                      <Field key={k} label={label}>
                        <Textarea rows={k === "rootCause" ? 3 : 2} className="bg-white text-xs" value={e[k]} onChange={(ev) => setEntry(e, { [k]: ev.target.value })} />
                      </Field>
                    ))}
                  </div>
                </div>
              );
            })}
            <Field label="Genel Değerlendirme">
              <Textarea rows={4} value={sheet.generalEvaluation} onChange={(e) => setSheet({ generalEvaluation: e.target.value })} />
            </Field>
            {!sheet.generalEvaluation && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSheet({
                    generalEvaluation: `${analysis.stats.n} öğrencinin değerlendirildiği ${exam.title} sınavında sınıf ortalaması ${round(analysis.stats.mean, 1)}, başarı oranı %${round(analysis.stats.passRate, 1)} olarak gerçekleşmiştir. ${flagged.length ? `${flagged.map((f) => f.code).join(", ")} hedef eşik değerin altında kaldığından PUKÖ döngüsü başlatılmıştır.` : "Tüm öğrenme çıktıları hedef eşik değerin üzerindedir."}`,
                  })
                }
              >
                Otomatik genel değerlendirme yaz
              </Button>
            )}
            {flagged.length > 0 && Object.keys(sheet.puko).length === 0 && (
              <p className="text-[11px] text-zinc-500">
                Öneriler {flagged.map((f) => f.code).join(", ")} için soru bazlı başarı ve Bloom düzeyinden otomatik türetildi ({suggestPuko(flagged[0], exam, analysis, threshold).rootCause.slice(0, 60)}…).
              </p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-wrap gap-2">
            <Button
              loading={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  await exportPukoDocx(ctx);
                  toast.success("PUKÖ raporu (.docx) indirildi");
                } catch (e) {
                  toast.error("Rapor üretilemedi", e instanceof Error ? e.message : String(e));
                } finally {
                  setExporting(false);
                }
              }}
            >
              <FileDown className="h-4 w-4" /> MEDEK/YÖKAK PUKÖ Raporu (.docx)
            </Button>
            <Button variant="outline" onClick={() => printDocument(<PukoDocument ctx={ctx} />, { title: `${course.code} PUKO Raporu` })}>
              <Printer className="h-4 w-4" /> A4 PDF / Yazdır
            </Button>
          </CardBody>
        </Card>
      </div>
      <div className="max-h-[calc(100vh-10rem)] overflow-auto rounded-xl bg-zinc-300/60 p-4 scrollbar-thin 2xl:sticky 2xl:top-20">
        <div style={{ zoom: 0.68 }}>
          <PukoDocument ctx={ctx} />
        </div>
      </div>
    </div>
  );
}
