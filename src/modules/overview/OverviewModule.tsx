"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Check,
  Circle,
  CircleDashed,
  Download,
  FileArchive,
  FilePlus2,
  Library,
  LineChart,
  Upload,
} from "lucide-react";
import { useData, useVault } from "@/lib/store";
import { workflowProgress, workflowSteps, type WorkflowStep } from "@/lib/workflow";
import { computeAnalysis } from "@/lib/medekMath";
import { scheduleDates } from "@/lib/scheduler";
import { downloadIcs, scheduleIcs } from "@/lib/ics";
import { cn, formatTrDate, round, todayIso, trDayName } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { navigateTo } from "@/hooks/useHashRoute";
import { useShellUi } from "@/components/shell/shellStore";
import { exportEvidencePack } from "@/services/evidencePackService";

export function OverviewModule() {
  const data = useData();
  const steps = workflowSteps(data);
  const progress = workflowProgress(steps);
  const next = steps.find((s) => s.status !== "done");

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            <div className="text-[12px] font-medium text-zinc-500">{data.institution.academicYear} {data.institution.semester} yarıyılı · dönem iş akışı</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-display text-[34px] font-medium leading-none text-zinc-950">%{progress}</span>
              <span className="text-sm text-zinc-500">tamamlandı</span>
            </div>
          </div>
          {next && (
            <Button onClick={() => navigateTo(next.module)}>
              Sıradaki: {next.title} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="h-1 bg-zinc-100">
          <div className="h-1 bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <ol className="grid divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
          {steps.map((s, i) => (
            <StepItem key={s.id} step={s} index={i} />
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <UpcomingExams />
        <QuickActions />
      </div>
      <QualitySnapshot />
    </div>
  );
}

function StepItem({ step, index }: { step: WorkflowStep; index: number }) {
  return (
    <li className="group relative border-zinc-100 px-6 py-4 sm:border-r xl:[&:nth-child(4n)]:border-r-0">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
            step.status === "done" && "bg-brand-600 text-white",
            step.status === "partial" && "border border-brand-300 bg-brand-50 text-brand-800",
            step.status === "todo" && "border border-zinc-200 bg-white text-zinc-400",
          )}
        >
          {step.status === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-zinc-900">
            {step.title}
            {step.status === "partial" && <CircleDashed className="h-3.5 w-3.5 text-brand-600" />}
          </div>
          <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{step.detail}</div>
          <button
            onClick={() => navigateTo(step.module)}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium text-brand-700 opacity-80 hover:opacity-100"
          >
            {step.action} <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </li>
  );
}

function UpcomingExams() {
  const data = useData();
  const dates = scheduleDates(data.schedule.settings);
  const today = todayIso();
  const all = [...data.schedule.entries]
    .map((e) => {
      const c = data.courses.find((x) => x.id === e.courseId);
      const s = data.schedule.settings.slots.find((x) => x.id === e.slotId);
      return { e, c, s, date: dates[e.dayIndex] ?? "" };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.s?.start ?? "").localeCompare(b.s?.start ?? ""));
  const upcoming = all.filter((x) => x.date >= today);
  const list = (upcoming.length ? upcoming : all).slice(0, 6);

  return (
    <Card>
      <CardHeader
        icon={<CalendarDays />}
        title={upcoming.length ? "Yaklaşan sınavlar" : "Sınav programı"}
        description={data.schedule.settings.periodName}
        actions={
          data.schedule.entries.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                downloadIcs(scheduleIcs({ inst: data.institution, schedule: data.schedule, courses: data.courses, rooms: data.rooms, invigilators: data.invigilators }));
                toast.success("Takvim dosyası indirildi", "Google, Outlook veya Apple Takvim'e içe aktarabilirsiniz.");
              }}
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Takvime ekle (.ics)
            </Button>
          )
        }
      />
      <div className="divide-y divide-zinc-100">
        {list.map(({ e, c, s, date }) => {
          const d = date ? new Date(`${date}T00:00:00`) : null;
          return (
            <div key={e.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-14 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-center">
                <div className="font-mono text-[10px] uppercase text-zinc-500">{date ? trDayName(date).slice(0, 3) : "—"}</div>
                <div className="font-display text-lg leading-tight text-zinc-900">{d ? d.getDate() : "—"}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-zinc-900">
                  <span className="font-mono text-[12px] text-zinc-500">{c?.code}</span> {c?.name}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {date ? formatTrDate(date) : ""} · {s?.start}–{s?.end} · {e.rooms.map((r) => data.rooms.find((x) => x.id === r.roomId)?.name).join(" + ")}
                </div>
              </div>
              <Badge>{c?.classYear}. sınıf</Badge>
            </div>
          );
        })}
        {!list.length && (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">
            Sınav programı boş.{" "}
            <button className="cursor-pointer font-medium text-brand-700" onClick={() => navigateTo("program")}>
              Otomatik dağıtım yap →
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function QuickActions() {
  const data = useData();
  const setImport = useShellUi((s) => s.setCourseImport);
  const setBackup = useShellUi((s) => s.setBackup);
  const [examId, setExamId] = React.useState(data.ui.activeExamId ?? data.exams[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);

  const pack = async () => {
    if (!examId) return toast.error("Önce bir sınav oluşturun.");
    setBusy(true);
    try {
      const res = await exportEvidencePack(data, examId);
      toast.success(`Kanıt klasörü hazır — ${res.files} belge`, res.skipped.length ? `${res.skipped.length} belge eksik (ayrıntı ZIP içindeki İÇİNDEKİLER dosyasında).` : "Tüm belgeler SHA-256 özetleriyle paketlendi.");
    } catch (e) {
      toast.error("Kanıt klasörü oluşturulamadı", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const tiles: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }[] = [
    { icon: <FilePlus2 />, title: "Sınav hazırla", desc: "Soru editörü ve canlı A4 önizleme", onClick: () => navigateTo("sinav") },
    { icon: <Library />, title: "Soru bankası", desc: `${data.questionBank.length} kayıtlı soru`, onClick: () => navigateTo("sinav") },
    { icon: <Upload />, title: "Ders içe aktar", desc: "Bologna'dan yapıştır veya Excel", onClick: () => setImport(true) },
    { icon: <LineChart />, title: "Program çıktıları panosu", desc: "Dersler × PÇ başarı haritası", onClick: () => navigateTo("medek") },
    { icon: <Download />, title: "Yedek al", desc: data.ui.lastBackupAt ? `Son yedek ${formatTrDate(data.ui.lastBackupAt.slice(0, 10))}` : "Henüz yedek alınmadı", onClick: () => setBackup("export") },
  ];

  return (
    <Card>
      <CardHeader title="Hızlı eylemler" />
      <CardBody className="space-y-4">
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-brand-950">
            <FileArchive className="h-4 w-4 text-brand-700" /> Tek tıkla ders kanıt klasörü
          </div>
          <p className="mt-1 text-xs leading-relaxed text-brand-900/70">
            Sınav kağıdı, cevap anahtarı, belirtke, optik anahtar, kapı listesi, tutanaklar, rubrikler, notlar, PUKÖ ve kapaklar — klasörlenmiş tek ZIP, SHA-256 özetli.
          </p>
          <div className="mt-3 flex gap-2">
            <Select className="h-9 flex-1 bg-white" value={examId} onChange={(e) => setExamId(e.target.value)}>
              {data.exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {data.courses.find((c) => c.id === e.courseId)?.code} — {e.title}
                </option>
              ))}
            </Select>
            <Button onClick={pack} loading={busy} disabled={!data.exams.length}>
              <FileArchive className="h-4 w-4" /> ZIP indir
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {tiles.map((t) => (
            <button
              key={t.title}
              onClick={t.onClick}
              className="group flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200/80 p-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50/60"
            >
              <span className="mt-0.5 text-zinc-400 group-hover:text-brand-700 [&_svg]:h-4 [&_svg]:w-4">{t.icon}</span>
              <span>
                <span className="block text-[13px] font-medium text-zinc-900">{t.title}</span>
                <span className="block text-[11.5px] text-zinc-500">{t.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function QualitySnapshot() {
  const data = useData();
  const update = useVault((s) => s.update);
  const threshold = data.institution.targetThreshold || 60;
  const rows = data.exams
    .map((exam) => {
      const course = data.courses.find((c) => c.id === exam.courseId);
      const sheet = data.grades[exam.id];
      if (!course || !sheet?.rows.length) return null;
      const a = computeAnalysis(exam, course, data.programOutcomes, sheet, threshold);
      return { exam, course, a, flagged: a.outcomeStats.filter((o) => o.flagged) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <Card>
      <CardHeader
        icon={<LineChart />}
        title="Akreditasyon durumu"
        description={`Not girilmiş sınavlarda öğrenme çıktısı gerçekleşmesi · hedef eşik %${threshold}`}
        actions={
          <Button size="sm" variant="ghost" onClick={() => navigateTo("medek")}>
            Ayrıntılı analiz <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        }
      />
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-left text-[11px] text-zinc-500">
              <tr className="border-b border-zinc-100">
                <th className="px-5 py-2 font-medium">Ders / sınav</th>
                <th className="px-3 py-2 font-medium">Öğrenci</th>
                <th className="px-3 py-2 font-medium">Ortalama</th>
                <th className="px-3 py-2 font-medium">ÖÇ gerçekleşme</th>
                <th className="px-3 py-2 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ exam, course, a, flagged }) => (
                <tr key={exam.id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-zinc-900">
                      <span className="font-mono text-[12px] text-zinc-500">{course.code}</span> {exam.title}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{a.stats.n}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{round(a.stats.mean, 1)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-end gap-[3px]">
                      {a.outcomeStats.map((o) => (
                        <div key={o.outcomeId} title={`${o.code}: ${o.pct === null ? "ölçülmedi" : `%${round(o.pct, 1)}`}`} className="flex flex-col items-center gap-0.5">
                          <div className="flex h-7 w-4 items-end rounded-sm bg-zinc-100">
                            <div className={cn("w-4 rounded-sm", o.flagged ? "bg-red-500" : "bg-[#2a78d6]")} style={{ height: `${Math.max(6, o.pct ?? 0)}%` }} />
                          </div>
                          <span className="font-mono text-[9px] text-zinc-400">{o.code.replace("ÖÇ-", "")}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {flagged.length ? (
                      <button
                        className="cursor-pointer"
                        onClick={() => {
                          update("ui", (u) => ({ ...u, activeExamId: exam.id }));
                          navigateTo("medek");
                        }}
                      >
                        <Badge tone="red">
                          <AlertTriangle className="h-3 w-3" /> {flagged.length} ÖÇ eşik altı · PUKÖ
                        </Badge>
                      </button>
                    ) : (
                      <Badge tone="emerald">
                        <Circle className="h-2 w-2 fill-current" /> Hedefte
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CardBody className="text-center text-sm text-zinc-500">Henüz not girilmiş sınav yok. Modül 6&apos;da notları girince burada ÖÇ durumu görünür.</CardBody>
      )}
    </Card>
  );
}
