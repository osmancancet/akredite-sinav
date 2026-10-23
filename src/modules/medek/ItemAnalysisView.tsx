"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, PenLine, SlidersHorizontal } from "lucide-react";
import type { Exam, GradeSheet } from "@/lib/types";
import { analyzeItems, decisionLabel, type ItemDecision, type ItemStat } from "@/lib/itemAnalysis";
import { bloomLabel, cn, round } from "@/lib/utils";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DECISION_STYLE: Record<ItemDecision, { tone: "emerald" | "amber" | "red" | "sky"; icon: React.ReactNode; dot: string }> = {
  koru: { tone: "emerald", icon: <CheckCircle2 className="h-3 w-3" />, dot: "#2a78d6" },
  "gozden-gecir": { tone: "amber", icon: <AlertTriangle className="h-3 w-3" />, dot: "#c98500" },
  "yeniden-yaz": { tone: "red", icon: <PenLine className="h-3 w-3" />, dot: "#e34948" },
  "guclugu-ayarla": { tone: "sky", icon: <SlidersHorizontal className="h-3 w-3" />, dot: "#0b7285" },
};

export function ItemAnalysisView({ exam, sheet }: { exam: Exam; sheet: GradeSheet }) {
  const { items, test } = analyzeItems(exam, sheet);
  if (test.n < 5) {
    return (
      <Card>
        <CardBody className="py-12 text-center text-sm text-zinc-500">Madde analizi için en az 5 öğrencinin notu gerekli (şu an {test.n}).</CardBody>
      </Card>
    );
  }
  const counts = items.reduce((acc, i) => ({ ...acc, [i.decision]: (acc[i.decision] ?? 0) + 1 }), {} as Record<ItemDecision, number>);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Cronbach α (güvenirlik)"
          value={test.alpha === null ? "—" : test.alpha.toFixed(2)}
          tone={test.alpha === null ? "slate" : test.alpha >= 0.7 ? "emerald" : test.alpha >= 0.6 ? "amber" : "red"}
          hint={test.reliability}
        />
        <StatTile label="Ölçmenin standart hatası" value={test.sem === null ? "—" : `±${round(test.sem, 1)}`} hint="puan (SEM)" />
        <StatTile label="Ortalama güçlük (p)" value={test.meanP.toFixed(2)} hint="ideal 0,30–0,70" />
        <StatTile label="Ortalama ayırt edicilik (D)" value={test.meanD.toFixed(2)} tone={test.meanD >= 0.3 ? "emerald" : "amber"} hint={`üst/alt grup ${test.groupSize}'er öğrenci (%27)`} />
        <StatTile
          label="Müdahale gereken madde"
          value={`${(counts["yeniden-yaz"] ?? 0) + (counts["gozden-gecir"] ?? 0)} / ${test.k}`}
          tone={(counts["yeniden-yaz"] ?? 0) > 0 ? "red" : (counts["gozden-gecir"] ?? 0) > 0 ? "amber" : "emerald"}
          hint={`${counts["yeniden-yaz"] ?? 0} yeniden yaz · ${counts["gozden-gecir"] ?? 0} gözden geçir`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
        <Card>
          <CardHeader title="Güçlük × ayırt edicilik haritası" description="Her nokta bir soru. Yeşil bant ideal güçlük, kesikli çizgiler D = 0,20 ve 0,30 eşikleri." />
          <CardBody>
            <ItemScatter items={items} />
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-600">
              {(Object.keys(DECISION_STYLE) as ItemDecision[]).map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: DECISION_STYLE[d].dot }} />
                  {decisionLabel(d)}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Madde istatistikleri" description="Ebel ölçütleri: D ≥ 0,40 çok iyi · 0,30–0,39 iyi · 0,20–0,29 düzeltilmeli · < 0,20 zayıf" />
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-left text-[11px] text-zinc-500">
                <tr className="border-b border-zinc-100">
                  <th className="px-4 py-2 font-medium">Soru</th>
                  <th className="px-2 py-2 font-medium">Bloom</th>
                  <th className="px-2 py-2 font-medium">p</th>
                  <th className="px-2 py-2 font-medium">D</th>
                  <th className="px-2 py-2 font-medium">r</th>
                  <th className="px-2 py-2 font-medium" title="Bu madde çıkarılırsa Cronbach α">α (çıkarılırsa)</th>
                  <th className="px-2 py-2 font-medium">Karar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => {
                  const st = DECISION_STYLE[i.decision];
                  const raisesAlpha = i.alphaIfDeleted !== null && test.alpha !== null && i.alphaIfDeleted > test.alpha + 0.005;
                  return (
                    <tr key={i.questionId} className="border-b border-zinc-50 last:border-0">
                      <td className="px-4 py-2 font-mono font-semibold">{i.label}</td>
                      <td className="px-2 py-2 text-zinc-600">{bloomLabel(exam.questions[idx].bloom)}</td>
                      <td className="px-2 py-2 font-mono tabular-nums">
                        {i.p.toFixed(2)} <span className="font-sans text-[10.5px] text-zinc-400">{i.difficulty}</span>
                      </td>
                      <td className={cn("px-2 py-2 font-mono tabular-nums", i.D < 0.2 ? "text-red-700" : i.D < 0.3 ? "text-amber-700" : "")}>
                        {i.D.toFixed(2)} <span className="font-sans text-[10.5px] text-zinc-400">{i.discrimination}</span>
                      </td>
                      <td className="px-2 py-2 font-mono tabular-nums">{i.r === null ? "—" : i.r.toFixed(2)}</td>
                      <td className={cn("px-2 py-2 font-mono tabular-nums", raisesAlpha && "font-semibold text-amber-700")}>
                        {i.alphaIfDeleted === null ? "—" : i.alphaIfDeleted.toFixed(2)}
                        {raisesAlpha && <span className="ml-1 font-sans text-[10px]">↑</span>}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={st.tone}>
                          {st.icon} {decisionLabel(i.decision)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2 border-t border-zinc-100 px-4 py-3 text-[11.5px] leading-relaxed text-zinc-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            r: düzeltilmiş madde-toplam korelasyonu (madde hariç toplamla). &quot;α (çıkarılırsa)&quot; sütununda ↑ işaretli madde, testten çıkarılırsa güvenirliği artırır. Az soru içeren sınavlarda α doğal olarak düşük çıkar; karar verirken D ve r birlikte değerlendirilmelidir.
          </div>
        </Card>
      </div>
    </div>
  );
}

function ItemScatter({ items }: { items: ItemStat[] }) {
  const W = 420;
  const H = 280;
  const pad = { l: 40, r: 14, t: 12, b: 34 };
  const x = (p: number) => pad.l + Math.max(0, Math.min(1, p)) * (W - pad.l - pad.r);
  const yMin = -0.2;
  const yMax = 1;
  const y = (d: number) => pad.t + (1 - (Math.max(yMin, Math.min(yMax, d)) - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const [hover, setHover] = React.useState<string | null>(null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Güçlük ve ayırt edicilik saçılım grafiği">
      <rect x={x(0.3)} y={pad.t} width={x(0.7) - x(0.3)} height={H - pad.t - pad.b} fill="oklch(0.948 0.032 178)" opacity="0.7" />
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
        <g key={`x${t}`}>
          <line x1={x(t)} x2={x(t)} y1={H - pad.b} y2={H - pad.b + 4} stroke="#a1a1aa" />
          <text x={x(t)} y={H - pad.b + 15} textAnchor="middle" fontSize="10" fill="#71717a" fontFamily="var(--font-mono)">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {[-0.2, 0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
        <g key={`y${t}`}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#f4f4f5" />
          <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#71717a" fontFamily="var(--font-mono)">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {[0.2, 0.3].map((t) => (
        <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#71717a" strokeDasharray="4 3" strokeWidth="1" />
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#a1a1aa" />
      <text x={(W + pad.l) / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill="#52525b">
        Güçlük indeksi p (kolaylık →)
      </text>
      <text x={12} y={(H - pad.b) / 2} textAnchor="middle" fontSize="10.5" fill="#52525b" transform={`rotate(-90 12 ${(H - pad.b) / 2})`}>
        Ayırt edicilik D
      </text>
      {items.map((i) => {
        const cx = x(i.p);
        const cy = y(i.D);
        const active = hover === i.questionId;
        return (
          <g key={i.questionId} onMouseEnter={() => setHover(i.questionId)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
            <circle cx={cx} cy={cy} r={14} fill="transparent" />
            <circle cx={cx} cy={cy} r={active ? 7 : 5.5} fill={DECISION_STYLE[i.decision].dot} stroke="white" strokeWidth="2" />
            <text x={cx + 9} y={cy - 7} fontSize="10.5" fontWeight="600" fill="#27272a" fontFamily="var(--font-mono)">
              {i.label}
            </text>
            {active && (
              <g>
                <rect x={Math.min(cx + 10, W - 150)} y={Math.max(4, cy + 8)} width="140" height="34" rx="6" fill="#18181b" />
                <text x={Math.min(cx + 18, W - 142)} y={Math.max(4, cy + 8) + 14} fontSize="10.5" fill="white">
                  {i.label} · p {i.p.toFixed(2)} · D {i.D.toFixed(2)}
                </text>
                <text x={Math.min(cx + 18, W - 142)} y={Math.max(4, cy + 8) + 27} fontSize="10" fill="#d4d4d8">
                  {decisionLabel(i.decision)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
