"use client";

import * as React from "react";
import { ArrowRight, Download } from "lucide-react";
import { BRAND, LEGACY_HOSTS } from "@/lib/brand";
import { useMounted } from "@/hooks/useMounted";

/**
 * Eski adreste açılan kullanıcılara yeni adresi ve veri taşımayı anlatır.
 * Tarayıcı kasayı adrese göre sakladığı için veriler yeni adrese kendiliğinden geçmez.
 */
export function LegacyHostBanner({ onBackup }: { onBackup?: () => void }) {
  const mounted = useMounted();
  if (!mounted || !LEGACY_HOSTS.includes(window.location.hostname)) return null;
  const target = `${BRAND.url}${window.location.pathname}${window.location.hash}`;
  return (
    <div className="no-print theme-invariant border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
        <span className="min-w-0 flex-1">
          <b>{BRAND.name} yeni adresinde: {BRAND.host}.</b>{" "}
          {onBackup
            ? "Bu adresteki verileriniz yeni adrese kendiliğinden geçmez: önce şifreli yedeği indirin, yeni adreste Veri → yedeği yükle ile açın."
            : "Bu adreste veri girdiyseniz uygulamada şifreli yedeği indirip yeni adreste yükleyin."}
        </span>
        {onBackup && (
          <button onClick={onBackup} className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-medium hover:bg-amber-100">
            <Download className="h-3.5 w-3.5" /> Yedeği indir
          </button>
        )}
        <a href={target} className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-2.5 py-1 font-medium text-white hover:bg-amber-950">
          {BRAND.host} adresine git <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
