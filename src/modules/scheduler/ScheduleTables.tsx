"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { Invigilator, Room, ScheduleSettings, TimeSlot } from "@/lib/types";
import { scheduleDates, slotKey } from "@/lib/scheduler";
import { cn, formatTrDate, trDayName, uid } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CoursesTable() {
  const data = useData();
  const update = useVault((s) => s.update);
  const included = new Set(data.schedule.settings.courseIds);
  const toggle = (id: string, on: boolean) =>
    update("schedule", (s) => ({
      ...s,
      settings: { ...s.settings, courseIds: on ? [...s.settings.courseIds, id] : s.settings.courseIds.filter((x) => x !== id) },
      entries: on ? s.entries : s.entries.filter((e) => e.courseId !== id),
    }));
  return (
    <Card>
      <CardHeader title="Dersler" description="Programa dahil edilecek dersler, sınıf düzeyi ve öğrenci sayıları (öğrenci sayısı derslik bölmeyi belirler)." />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Dahil</th>
              <th className="px-4 py-2">Kod</th>
              <th className="px-4 py-2">Ders</th>
              <th className="px-4 py-2">Sınıf</th>
              <th className="px-4 py-2">Öğrenci</th>
              <th className="px-4 py-2">Süre (dk)</th>
              <th className="px-4 py-2">Öğretim Elemanı</th>
            </tr>
          </thead>
          <tbody>
            {data.courses.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-1.5">
                  <Checkbox checked={included.has(c.id)} onChange={(v) => toggle(c.id, v)} />
                </td>
                <td className="px-4 py-1.5 font-medium">{c.code}</td>
                <td className="px-4 py-1.5">{c.name}</td>
                <td className="px-4 py-1.5">
                  <Select className="h-8 w-20" value={c.classYear} onChange={(e) => update("courses", (p) => p.map((x) => (x.id === c.id ? { ...x, classYear: Number(e.target.value) } : x)))}>
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>{y}.</option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-1.5">
                  <Input className="h-8 w-20" type="number" value={c.studentCount} onChange={(e) => update("courses", (p) => p.map((x) => (x.id === c.id ? { ...x, studentCount: Number(e.target.value) || 0 } : x)))} />
                </td>
                <td className="px-4 py-1.5">
                  <Input className="h-8 w-20" type="number" value={c.examDurationMin} onChange={(e) => update("courses", (p) => p.map((x) => (x.id === c.id ? { ...x, examDurationMin: Number(e.target.value) || 0 } : x)))} />
                </td>
                <td className="px-4 py-1.5 text-slate-600">{c.instructor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function RoomsTable() {
  const rooms = useData().rooms;
  const update = useVault((s) => s.update);
  const set = (id: string, patch: Partial<Room>) => update("rooms", (p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const total = rooms.reduce((s, r) => s + r.capacity, 0);
  return (
    <Card>
      <CardHeader
        title="Derslikler"
        description={`Toplam sınav kapasitesi: ${total} sıra`}
        actions={
          <Button size="sm" onClick={() => update("rooms", (p) => [...p, { id: uid("rm"), name: `D-${100 + p.length + 1}`, building: "", capacity: 40, invigilatorsNeeded: 1 }])}>
            <Plus className="h-3.5 w-3.5" /> Derslik Ekle
          </Button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Derslik</th>
              <th className="px-4 py-2">Bina</th>
              <th className="px-4 py-2">Sınav Kapasitesi</th>
              <th className="px-4 py-2">Gereken Gözetmen</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-1.5"><Input className="h-8" value={r.name} onChange={(e) => set(r.id, { name: e.target.value })} /></td>
                <td className="px-4 py-1.5"><Input className="h-8" value={r.building} onChange={(e) => set(r.id, { building: e.target.value })} /></td>
                <td className="px-4 py-1.5"><Input className="h-8 w-24" type="number" value={r.capacity} onChange={(e) => set(r.id, { capacity: Number(e.target.value) || 0 })} /></td>
                <td className="px-4 py-1.5"><Input className="h-8 w-20" type="number" min={1} value={r.invigilatorsNeeded} onChange={(e) => set(r.id, { invigilatorsNeeded: Math.max(1, Number(e.target.value) || 1) })} /></td>
                <td className="px-4 py-1.5">
                  <Button size="icon" variant="ghost" aria-label="Dersliği sil" onClick={() => update("rooms", (p) => p.filter((x) => x.id !== r.id))}>
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function InvigilatorsTable() {
  const data = useData();
  const update = useVault((s) => s.update);
  const [selected, setSelected] = React.useState<string | null>(data.invigilators[0]?.id ?? null);
  const set = (id: string, patch: Partial<Invigilator>) => update("invigilators", (p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const dates = scheduleDates(data.schedule.settings);
  const inv = data.invigilators.find((i) => i.id === selected);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader
          title="Gözetmenler"
          description="Bir satıra tıklayarak müsaitlik matrisini düzenleyin."
          actions={
            <Button
              size="sm"
              onClick={() => {
                const id = uid("inv");
                update("invigilators", (p) => [...p, { id, title: "Öğr. Gör.", name: "Yeni Gözetmen", email: "", unavailable: [], maxDailyDuties: 3 }]);
                setSelected(id);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Gözetmen Ekle
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Unvan</th>
                <th className="px-3 py-2">Ad Soyad</th>
                <th className="px-3 py-2">E-posta</th>
                <th className="px-3 py-2">Günlük Maks.</th>
                <th className="px-3 py-2">Kısıt</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.invigilators.map((i) => (
                <tr key={i.id} onClick={() => setSelected(i.id)} className={cn("border-t border-slate-100 cursor-pointer", selected === i.id && "bg-indigo-50/60")}>
                  <td className="px-3 py-1.5"><Input className="h-8 w-28" value={i.title} onChange={(e) => set(i.id, { title: e.target.value })} /></td>
                  <td className="px-3 py-1.5"><Input className="h-8 min-w-40" value={i.name} onChange={(e) => set(i.id, { name: e.target.value })} /></td>
                  <td className="px-3 py-1.5"><Input className="h-8 min-w-44" value={i.email} onChange={(e) => set(i.id, { email: e.target.value })} /></td>
                  <td className="px-3 py-1.5"><Input className="h-8 w-16" type="number" min={1} value={i.maxDailyDuties} onChange={(e) => set(i.id, { maxDailyDuties: Math.max(1, Number(e.target.value) || 1) })} /></td>
                  <td className="px-3 py-1.5"><Badge tone={i.unavailable.length ? "amber" : "emerald"}>{i.unavailable.length} dilim</Badge></td>
                  <td className="px-3 py-1.5">
                    <Button size="icon" variant="ghost" aria-label="Gözetmeni sil" onClick={() => update("invigilators", (p) => p.filter((x) => x.id !== i.id))}>
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
        <CardHeader title={inv ? `Müsaitlik Matrisi — ${inv.title} ${inv.name}` : "Müsaitlik Matrisi"} description="Kırmızı hücreler 'Müsait Değil': bu dilimlere görev yazılamaz (kesin kısıt)." />
        <CardBody className="overflow-x-auto">
          {inv ? (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-1" />
                  {dates.map((d) => (
                    <th key={d} className="p-1 font-medium text-slate-600">
                      {trDayName(d).slice(0, 3)}
                      <div className="font-normal text-slate-400">{formatTrDate(d).slice(0, 5)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.schedule.settings.slots.map((s) => (
                  <tr key={s.id}>
                    <td className="p-1 font-medium text-slate-600">{s.start}</td>
                    {dates.map((d, di) => {
                      const k = slotKey(di, s.id);
                      const blocked = inv.unavailable.includes(k);
                      return (
                        <td key={k} className="p-1">
                          <button
                            onClick={() => set(inv.id, { unavailable: blocked ? inv.unavailable.filter((x) => x !== k) : [...inv.unavailable, k] })}
                            className={cn(
                              "h-9 w-full rounded-md text-[10px] font-semibold ring-1 cursor-pointer",
                              blocked ? "bg-red-100 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
                            )}
                          >
                            {blocked ? "Müsait Değil" : "Müsait"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">Gözetmen seçin.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export function SettingsPanel() {
  const settings = useData().schedule.settings;
  const update = useVault((s) => s.update);
  const set = (patch: Partial<ScheduleSettings>) => update("schedule", (s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const setSlot = (id: string, patch: Partial<TimeSlot>) => set({ slots: settings.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const dates = scheduleDates(settings);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Sınav Dönemi" description={dates.length ? `${formatTrDate(dates[0])} – ${formatTrDate(dates[dates.length - 1])}` : ""} />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Field label="Dönem Adı" className="sm:col-span-2">
            <Input value={settings.periodName} onChange={(e) => set({ periodName: e.target.value })} />
          </Field>
          <Field label="Başlangıç Tarihi">
            <Input type="date" value={settings.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Field>
          <Field label="Sınav Günü Sayısı">
            <Input type="number" min={1} max={30} value={settings.dayCount} onChange={(e) => set({ dayCount: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} />
          </Field>
          <Field label="Bir sınıfa günde en fazla sınav" hint="Öğrenci yorgunluk kuralı (yumuşak kısıt)">
            <Input type="number" min={1} max={6} value={settings.maxExamsPerClassPerDay} onChange={(e) => set({ maxExamsPerClassPerDay: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <div className="flex items-end pb-2">
            <Checkbox checked={settings.skipWeekends} onChange={(v) => set({ skipWeekends: v })} label="Hafta sonlarını atla" />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Sınav Saat Dilimleri"
          actions={
            <Button size="sm" onClick={() => set({ slots: [...settings.slots, { id: uid("s"), start: "17:00", end: "18:00" }] })}>
              <Plus className="h-3.5 w-3.5" /> Dilim Ekle
            </Button>
          }
        />
        <CardBody className="space-y-2">
          {settings.slots.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="w-16 text-xs font-medium text-slate-500">{i + 1}. oturum</span>
              <Input type="time" className="w-32" value={s.start} onChange={(e) => setSlot(s.id, { start: e.target.value })} />
              <span className="text-slate-400">–</span>
              <Input type="time" className="w-32" value={s.end} onChange={(e) => setSlot(s.id, { end: e.target.value })} />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Dilimi sil"
                onClick={() =>
                  update("schedule", (sc) => ({
                    ...sc,
                    settings: { ...sc.settings, slots: sc.settings.slots.filter((x) => x.id !== s.id) },
                    entries: sc.entries.filter((e) => e.slotId !== s.id),
                  }))
                }
              >
                <Trash2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
