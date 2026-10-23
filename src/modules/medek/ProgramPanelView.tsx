"use client";

import * as React from "react";
import { AlertTriangle, FileDown, Info } from "lucide-react";
import { useData } from "@/lib/store";
import { computeProgramPanel } from "@/lib/programPanel";
import { cn, num } from "@/lib/utils";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { HBarChart } from "@/components/charts/BarChart";
import { exportProgramPanelDocx } from "@/services/medekExportService";

// Tek tonlu sıralı ölçek (brand): açık → koyu. Eşik altı değerler ayrıca ikon + kırmızı metinle işaretlenir.
const SEQ = ["oklch(0.977 0.014 178)", "oklch(0.948 0.032 178)", "oklch(0.895 0.06 178)", "oklch(0.82 0.088 178)", "oklch(0.72 0.11 178)", "oklch(0.62 0.115 178)", "oklch(0.53 0.1 178)"];

function seqColor(v: number, max: number) {
  if (max <= 0) return SEQ[0];
  return SEQ[Math.min(SEQ.length - 1, Math.round((v / max) * (SEQ.length - 1)))];
}

export function ProgramPanelView() {
  const data = useData();
  const [mode, setMode] = React.useState<"achieved" | "planned">("achieved");
  const [busy, setBusy] = React.useState(false);
  const { rows, summary, threshold } = computeProgramPanel(data);
  const pos = data.programOutcomes;
  const maxPlanned = Math.max(1, ...rows.flatMap((r) => r.planned));
  const measured = summary.filter((s) => s.pct !== null);
  const uncovered = summary.filter((s) => s.uncovered);
  const flagged = summary.filter((s) => s.flagged);
  const gradedCourses = rows.filter((r) => r.gradedExams.length).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Ölçülen PÇ" value={`${measured.length} / ${pos.length}`} tone={measured.length === pos.length ? "emerald" : "amber"} hint={`${gradedCourses} dersin not verisi var`} />
        <StatTile
          label="Program ortalaması"
          value={measured.length ? `%${num(measured.reduce((s, x) => s + (x.pct ?? 0), 0) / measured.length, 1)}` : "—"}
          tone="brand"
          hint="ölçülen PÇ'lerin ortalaması"
        />
        <StatTile label="Eşik altı PÇ" value={flagged.length} tone={flagged.length ? "red" : "emerald"} hint={`hedef %${threshold}`} />
        <StatTile label="Hiçbir derste desteklenmeyen PÇ" value={uncovered.length} tone={uncovered.length ? "red" : "emerald"} hint={uncovered.map((u) => u.po.code).join(", ") || "kapsama tam"} />
      </div>

      <Card>
        <CardHeader
          title="Dersler × program çıktıları"
          description={mode === "achieved" ? "Gerçekleşen PÇ başarısı (%) — not girilmiş sınavlardan. Boş hücre: ölçülmedi." : "Planlanan katkı — ÖÇ-PÇ matrisindeki toplam ağırlık."}
          actions={
            <>
              <Tabs
                value={mode}
                onChange={setMode}
                items={[
                  { value: "achieved", label: "Gerçekleşen" },
                  { value: "planned", label: "Planlanan katkı" },
                ]}
              />
              <Button
                size="sm"
                variant="outline"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await exportProgramPanelDocx(data);
                    toast.success("Program çıktıları raporu indirildi", "Öz değerlendirme raporuna ek olarak kullanılabilir.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <FileDown className="h-3.5 w-3.5" /> Word raporu
              </Button>
            </>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[12px]">
            <thead>
              <tr className="text-zinc-500">
                <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left font-medium">Ders</th>
                {pos.map((p) => (
                  <th key={p.id} className="px-1 py-2 text-center font-mono text-[10.5px] font-medium" title={p.text}>
                    {p.code.replace("PÇ-", "P")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.course.id} className="border-t border-zinc-100">
                  <td className="sticky left-0 z-10 bg-white px-4 py-1.5">
                    <div className="font-medium text-zinc-900">
                      <span className="font-mono text-[11px] text-zinc-500">{r.course.code}</span> {r.course.name}
                    </div>
                    <div className="text-[10.5px] text-zinc-400">{r.gradedExams.length ? `${r.gradedExams.length} ölçme aracı` : "not verisi yok"}</div>
                  </td>
                  {pos.map((p, j) => {
                    const planned = r.planned[j];
                    const val = r.achieved[j];
                    if (mode === "planned") {
                      return (
                        <td key={p.id} className="p-0.5">
                          <div className="flex h-9 items-center justify-center rounded font-mono tabular-nums" style={{ background: planned ? seqColor(planned, maxPlanned) : "transparent", color: planned / maxPlanned > 0.6 ? "white" : "#27272a" }}>
                            {planned || <span className="text-zinc-200">·</span>}
                          </div>
                        </td>
                      );
                    }
                    const below = val !== null && val < threshold;
                    return (
                      <td key={p.id} className="p-0.5" title={val === null ? (planned ? "Katkı planlı, ölçülmedi" : "Katkı yok") : `%${num(val, 1)} · ağırlık ${planned}`}>
                        <div
                          className={cn("flex h-9 items-center justify-center gap-0.5 rounded font-mono tabular-nums", below && "ring-1 ring-inset ring-red-300")}
                          style={{ background: val === null && planned ? "repeating-linear-gradient(135deg,#fafafa,#fafafa 4px,#f4f4f5 4px,#f4f4f5 8px)" : "transparent" }}
                        >
                          {val === null ? (
                            <span className="text-zinc-300">{planned ? "?" : "·"}</span>
                          ) : (
                            <span className={cn("rounded px-1", below ? "font-semibold text-red-700" : "text-zinc-800")} style={{ background: below ? "transparent" : seqColor(val, 100) }}>
                              {below && "▼"}
                              {Math.round(val)}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 border-t border-zinc-100 px-4 py-3 text-[11.5px] text-zinc-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {mode === "achieved"
            ? `▼ ve kırmızı: hedef eşik %${threshold} altı. Taralı "?" hücre: dersin bu PÇ'ye katkısı planlı ama henüz not verisiyle ölçülmedi.`
            : "Koyu hücre daha yüksek planlı katkı. Matris değerleri Modül 6 → ÖÇ × PÇ Matrisi sekmesinden düzenlenir."}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Program düzeyi PÇ sağlanma oranı" description="Ders katkı ağırlıklarıyla birleştirilmiş" />
          <CardBody>
            <HBarChart
              data={summary.map((s) => ({ key: s.po.id, label: s.po.code, value: s.pct, hint: `${s.po.text} — ${s.measuredCourses}/${s.supportingCourses} destekleyen derste ölçüldü` }))}
              max={100}
              reference={threshold}
              referenceLabel={`Hedef eşik %${threshold}`}
              flagBelow={threshold}
              format={(v) => `%${num(v, 1)}`}
              labelWidth={52}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Dikkat gerektiren program çıktıları" />
          <CardBody className="space-y-2">
            {uncovered.map((s) => (
              <div key={s.po.id} className="flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{s.po.code}</strong> hiçbir dersin ÖÇ-PÇ matrisinde desteklenmiyor: {s.po.text}
                </span>
              </div>
            ))}
            {flagged.map((s) => (
              <div key={s.po.id} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{s.po.code}</strong> %{num(s.pct ?? 0, 1)} ile eşik altında ({s.measuredCourses} derste ölçüldü): {s.po.text}
                </span>
              </div>
            ))}
            {summary
              .filter((s) => !s.uncovered && s.pct === null)
              .map((s) => (
                <div key={s.po.id} className="flex gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-[12.5px] text-zinc-600">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>{s.po.code}</strong> {s.supportingCourses} derste planlı ama henüz ölçülmedi.
                  </span>
                </div>
              ))}
            {!uncovered.length && !flagged.length && summary.every((s) => s.pct !== null) && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">Tüm program çıktıları ölçüldü ve hedefte.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
