"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarPlus,
  CalendarRange,
  CheckCircle2,
  DoorOpen,
  FileDown,
  FileSpreadsheet,
  Printer,
  RefreshCcw,
  Scale,
  Settings2,
  Upload,
  UserCheck,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useData, useVault } from "@/lib/store";
import { assignInvigilators, detectConflicts, fairnessScore, invigilatorLoads, solveSchedule } from "@/lib/scheduler";
import { mean, stdDev, num, fixed } from "@/lib/utils";
import type { Schedule } from "@/lib/types";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { HBarChart } from "@/components/charts/BarChart";
import { printDocument } from "@/components/print/PrintHost";
import { exportBoardDocx, exportNoticesDocx, exportScheduleXlsx, importScheduleTables, type ScheduleCtx } from "@/services/scheduleExportService";
import { ScheduleGrid } from "./ScheduleGrid";
import { downloadIcs, invigilatorIcs, scheduleIcs } from "@/lib/ics";
import { CoursesTable, InvigilatorsTable, RoomsTable, SettingsPanel } from "./ScheduleTables";
import { BoardDocument, NoticeDocument } from "./ScheduleDocuments";

type TabId = "grid" | "courses" | "rooms" | "invigilators" | "settings" | "outputs";

export function SchedulerModule() {
  const data = useData();
  const update = useVault((s) => s.update);
  const [tab, setTab] = React.useState<TabId>("grid");
  const { schedule, courses, rooms, invigilators } = data;
  const conflicts = detectConflicts(schedule, courses, rooms, invigilators, data.students);
  const hard = conflicts.filter((c) => c.severity === "hard");
  const soft = conflicts.filter((c) => c.severity === "soft");
  const loads = invigilatorLoads(schedule, invigilators);
  const fair = fairnessScore(loads.map((l) => l.count));
  const unplaced = courses.filter((c) => schedule.settings.courseIds.includes(c.id) && !schedule.entries.some((e) => e.courseId === c.id));
  const ctx: ScheduleCtx = { inst: data.institution, schedule, courses, rooms, invigilators };
  const setSchedule = (s: Schedule) => update("schedule", s);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const solve = (keepLocked: boolean) => {
    if (!rooms.length) return toast.error("Önce derslik ekleyin.");
    if (!invigilators.length) return toast.error("Önce gözetmen ekleyin.");
    const result = solveSchedule({ courses, rooms, invigilators, settings: schedule.settings, keepLocked: keepLocked ? schedule.entries : [], students: data.students, seed: Date.now() % 100000 });
    setSchedule(result);
    const c = detectConflicts(result, courses, rooms, invigilators, data.students).filter((x) => x.severity === "hard").length;
    toast[c ? "warning" : "success"](
      `${result.entries.length} sınav yerleştirildi`,
      `${result.unplaced.length} yerleştirilemedi · ${c} kesin çakışma · Adalet %${fixed(fairnessScore(invigilatorLoads(result, invigilators).map((l) => l.count)), 1)}`,
    );
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      const res = await importScheduleTables(file, ctx);
      const ok = await confirmDialog({ title: "Excel verisi içe aktarılsın mı?", message: `Bulunan: ${res.summary.join(", ")}. Aynı ad/koda sahip kayıtlar güncellenir, diğerleri eklenir.`, confirmLabel: "İçe Aktar" });
      if (!ok) return;
      if (res.courses) {
        update("courses", (prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          res.courses!.forEach((c) => map.set(c.id, c));
          return Array.from(map.values());
        });
        update("schedule", (s) => ({ ...s, settings: { ...s.settings, courseIds: Array.from(new Set([...s.settings.courseIds, ...res.courses!.map((c) => c.id)])) } }));
      }
      if (res.rooms) update("rooms", res.rooms);
      if (res.invigilators) update("invigilators", res.invigilators);
      toast.success("Excel içe aktarıldı", res.summary.join(", "));
    } catch (e) {
      toast.error("İçe aktarma başarısız", e instanceof Error ? e.message : String(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Programlanan Sınav" value={`${schedule.entries.length} / ${schedule.settings.courseIds.length}`} icon={<CalendarRange className="h-4 w-4 text-brand-500" />} />
        <StatTile label="Kesin Çakışma" value={hard.length} tone={hard.length ? "red" : "emerald"} hint={hard.length ? "Takvimde kırmızı" : "Sınıf, derslik, gözetmen çakışması yok"} icon={hard.length ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <StatTile label="Yumuşak Uyarı" value={soft.length} tone={soft.length ? "amber" : "emerald"} hint={`Günde ≤ ${schedule.settings.maxExamsPerClassPerDay} sınav kuralı`} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        <StatTile label="Adalet Skoru" value={`%${fixed(fair, 1)}`} tone={fair >= 80 ? "emerald" : fair >= 60 ? "amber" : "red"} hint={`σ = ${num(stdDev(loads.map((l) => l.count)), 2)} görev`} icon={<Scale className="h-4 w-4 text-brand-500" />} />
        <StatTile label="Yerleştirilemeyen" value={unplaced.length} tone={unplaced.length ? "amber" : "slate"} icon={<DoorOpen className="h-4 w-4 text-zinc-400" />} />
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2 py-3">
          <Button onClick={() => solve(true)}>
            <Zap className="h-4 w-4" /> Otomatik Dağıt (kilitlileri koru)
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (await confirmDialog({ title: "Tüm program sıfırdan oluşturulsun mu?", message: "Elle taşınmış/kilitli sınavlar dahil tüm yerleşim yeniden hesaplanır." })) solve(false);
            }}
          >
            <RefreshCcw className="h-4 w-4" /> Sıfırdan Dağıt
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSchedule(assignInvigilators(schedule, rooms, invigilators, Date.now() % 1000));
              toast.success("Gözetmenler yeniden dengelendi");
            }}
          >
            <Scale className="h-4 w-4" /> Gözetmenleri Dengele
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportScheduleXlsx(ctx)}>
              <FileSpreadsheet className="h-4 w-4" /> Excel&apos;e Aktar
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Excel&apos;den Al
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
        </CardBody>
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "grid", label: "Takvim Grid'i", icon: <CalendarRange className="h-3.5 w-3.5" /> },
          { value: "courses", label: "Dersler", icon: <FileDown className="h-3.5 w-3.5" /> },
          { value: "rooms", label: "Derslikler", icon: <DoorOpen className="h-3.5 w-3.5" /> },
          { value: "invigilators", label: "Gözetmenler & Müsaitlik", icon: <Users className="h-3.5 w-3.5" /> },
          { value: "settings", label: "Saat Dilimleri & Dönem", icon: <Settings2 className="h-3.5 w-3.5" /> },
          { value: "outputs", label: "Çıktılar", icon: <Printer className="h-3.5 w-3.5" /> },
        ]}
      />

      {tab === "grid" && (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <ScheduleGrid schedule={schedule} courses={courses} rooms={rooms} invigilators={invigilators} conflicts={conflicts} onChange={setSchedule} />
          <div className="space-y-4">
            <Card>
              <CardHeader title="Çakışma Denetçisi" description="Kesin ve yumuşak kısıtlar canlı denetlenir" />
              <CardBody className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin">
                {conflicts.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" /> Program tüm kısıtları sağlıyor.
                  </div>
                )}
                {conflicts.map((c, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${c.severity === "hard" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
                    {c.severity === "hard" ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    {c.message}
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Gözetmen Yük Dağılımı" description={`Adalet Skoru = 100 × (1 − σ/μ) = %${fixed(fair, 1)}`} />
              <CardBody>
                <HBarChart
                  data={loads.map((l) => ({ key: l.inv.id, label: l.inv.name, value: l.count, hint: `${l.inv.title} ${l.inv.name}: ${l.count} görev` }))}
                  max={Math.max(1, ...loads.map((l) => l.count)) + 1}
                  reference={mean(loads.map((l) => l.count))}
                  referenceLabel={`Ortalama: ${num(mean(loads.map((l) => l.count)), 2)} görev`}
                  format={(v) => `${v} görev`}
                  labelWidth={110}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Çözücü Günlüğü" />
              <CardBody className="max-h-48 space-y-1 overflow-y-auto text-xs text-zinc-600 scrollbar-thin">
                {schedule.log.map((l, i) => (
                  <div key={i}>• {l}</div>
                ))}
                {!schedule.log.length && <div className="text-zinc-400">Henüz dağıtım yapılmadı.</div>}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
      {tab === "courses" && <CoursesTable />}
      {tab === "rooms" && <RoomsTable />}
      {tab === "invigilators" && <InvigilatorsTable />}
      {tab === "settings" && <SettingsPanel />}
      {tab === "outputs" && <OutputsPanel ctx={ctx} />}
    </div>
  );
}

function OutputsPanel({ ctx }: { ctx: ScheduleCtx }) {
  const [invId, setInvId] = React.useState(ctx.invigilators[0]?.id ?? "");
  const [busy, setBusy] = React.useState<string | null>(null);
  const loads = invigilatorLoads(ctx.schedule, ctx.invigilators);
  const run = async (key: string, fn: () => Promise<void> | void, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error("Çıktı üretilemedi", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const inv = ctx.invigilators.find((i) => i.id === invId);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader icon={<CalendarRange className="h-4 w-4" />} title="Bölüm İlan Panosu Sınav Takvimi" description="A4 yatay; Gün × Saat matrisi + ayrıntılı liste, antetli ve imzalı." />
        <CardBody className="flex flex-wrap gap-2">
          <Button onClick={() => run("board", () => exportBoardDocx(ctx), "İlan panosu (.docx) indirildi")} loading={busy === "board"}>
            <FileDown className="h-4 w-4" /> Word (.docx)
          </Button>
          <Button variant="outline" onClick={() => run("xlsx", () => exportScheduleXlsx(ctx), "Excel (.xlsx) indirildi")} loading={busy === "xlsx"}>
            <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
          </Button>
          <Button variant="outline" onClick={() => printDocument(<BoardDocument ctx={ctx} />, { orientation: "landscape", title: `${ctx.schedule.settings.periodName} Ilan Panosu` })}>
            <Printer className="h-4 w-4" /> A4 PDF / Yazdır
          </Button>
          <Button variant="outline" onClick={() => downloadIcs(scheduleIcs(ctx))}>
            <CalendarPlus className="h-4 w-4" /> Takvim (.ics)
          </Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<UserCheck className="h-4 w-4" />} title="Gözetmen Görev Tebliğ Belgesi" description="Her hocaya özel, resmi yazı formatında görev listesi ve tebellüğ bloğu." />
        <CardBody className="space-y-3">
          <Select value={invId} onChange={(e) => setInvId(e.target.value)}>
            {loads.map((l) => (
              <option key={l.inv.id} value={l.inv.id}>
                {l.inv.title} {l.inv.name} — {l.count} görev
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run("one", () => exportNoticesDocx(ctx, [invId]), "Görev tebliği indirildi")} loading={busy === "one"} disabled={!inv}>
              <FileDown className="h-4 w-4" /> Seçili Hoca (.docx)
            </Button>
            <Button variant="outline" onClick={() => inv && printDocument(<NoticeDocument ctx={ctx} inv={inv} />, { title: `Gorev Tebligi ${inv.name}` })} disabled={!inv}>
              <Printer className="h-4 w-4" /> Seçili Hoca PDF
            </Button>
            <Button
              variant="outline"
              disabled={!inv}
              onClick={() => {
                if (!inv) return;
                downloadIcs(invigilatorIcs(ctx, inv));
                toast.success("Takvim dosyası indirildi", `${inv.name} görevleri Google/Outlook/Apple Takvim'e eklenebilir (30 dk önce hatırlatma).`);
              }}
            >
              <CalendarPlus className="h-4 w-4" /> Seçili Hoca Takvimi (.ics)
            </Button>
            <Button variant="secondary" onClick={() => run("all", () => exportNoticesDocx(ctx, ctx.invigilators.map((i) => i.id)), "Tüm tebliğler tek Word belgesinde indirildi")} loading={busy === "all"}>
              <FileDown className="h-4 w-4" /> Tüm Gözetmenler (.docx)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                printDocument(
                  <>
                    {ctx.invigilators.map((i) => (
                      <NoticeDocument key={i.id} ctx={ctx} inv={i} />
                    ))}
                  </>,
                  { title: "Gozetmen Gorev Tebligleri" },
                )
              }
            >
              <Printer className="h-4 w-4" /> Tümü PDF
            </Button>
          </div>
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="İlan Panosu Önizleme" />
        <CardBody className="overflow-auto bg-zinc-200/60">
          <div style={{ zoom: 0.62 }}>
            <BoardDocument ctx={ctx} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
