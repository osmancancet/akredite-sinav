"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Tek serili, kütüphanesiz (HTML/CSS) çubuk grafikleri.
// Tek ton (seri rengi), eşik altı değerler "kritik" durum rengi + ikon + etiketle
// işaretlenir; metinler her zaman nötr mürekkeptedir.

const SERIES = "var(--viz-series)";
const CRITICAL = "var(--viz-critical)";

export interface BarDatum {
  key: string;
  label: string;
  value: number | null;
  hint?: string; // tooltip metni
}

export function HBarChart({
  data,
  max,
  reference,
  referenceLabel,
  flagBelow,
  format = (v) => String(v),
  labelWidth = 72,
}: {
  data: BarDatum[];
  max: number;
  reference?: number;
  referenceLabel?: string;
  flagBelow?: number;
  format?: (v: number) => string;
  labelWidth?: number;
}) {
  const scale = (v: number) => `${Math.max(0, Math.min(100, (v / (max || 1)) * 100))}%`;
  return (
    <div className="relative">
      <div className="space-y-[2px]">
        {data.map((d) => {
          const flagged = flagBelow !== undefined && d.value !== null && d.value < flagBelow;
          return (
            <div key={d.key} className="group relative flex items-center gap-2 py-1">
              <div className="shrink-0 truncate text-xs font-medium text-zinc-700" style={{ width: labelWidth }} title={d.label}>
                {d.label}
              </div>
              <div className="relative h-[18px] flex-1">
                {d.value !== null && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-r-[4px]"
                    style={{ width: scale(d.value), background: flagged ? CRITICAL : SERIES }}
                  />
                )}
                {reference !== undefined && (
                  <div className="absolute inset-y-[-4px] w-0 border-l border-dashed border-zinc-500" style={{ left: scale(reference) }} />
                )}
              </div>
              <div className="flex w-24 shrink-0 items-center gap-1 text-xs tabular-nums text-zinc-700">
                {d.value === null ? <span className="text-zinc-400">ölçülmedi</span> : format(d.value)}
                {flagged && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-700">
                    <AlertTriangle className="h-3 w-3" /> eşik altı
                  </span>
                )}
              </div>
              {d.hint && (
                <div className="pointer-events-none absolute left-20 top-full z-10 hidden max-w-sm rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
                  {d.hint}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {reference !== undefined && referenceLabel && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500" style={{ paddingLeft: labelWidth + 8 }}>
          <span className="inline-block w-4 border-t border-dashed border-zinc-500" /> {referenceLabel}
        </div>
      )}
    </div>
  );
}

export function ColumnChart({
  data,
  height = 140,
  format = (v) => String(v),
}: {
  data: BarDatum[];
  height?: number;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  return (
    <div>
      <div className="flex items-end gap-[2px] border-b border-zinc-300" style={{ height }}>
        {data.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="mb-0.5 text-center text-[10px] tabular-nums text-zinc-600">{d.value ? format(d.value) : ""}</div>
            <div
              className={cn("mx-auto w-full max-w-6 rounded-t-[4px]")}
              style={{ height: `${((d.value ?? 0) / max) * (height - 18)}px`, background: SERIES }}
            />
            {d.hint && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
                {d.hint}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {data.map((d) => (
          <div key={d.key} className="flex-1 text-center text-[10px] text-zinc-500">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
