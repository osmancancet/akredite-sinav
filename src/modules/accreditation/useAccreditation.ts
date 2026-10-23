"use client";

import * as React from "react";
import { useData, useVault } from "@/lib/store";
import type { AccreditationWorkspace, EvidenceAttachment, EvidenceRecord, Framework } from "@/lib/accreditation/types";
import { recKey } from "@/lib/accreditation/progress";
import { uid } from "@/lib/utils";
import { removeAttachment } from "@/services/accreditationService";

const emptyRecord = (): EvidenceRecord => ({ status: "missing", attachments: [], updatedAt: new Date().toISOString() });

/** Kanıt çalışma alanı üzerindeki tüm değişiklikler (şifreli "accreditation" koleksiyonuna yazılır). */
export function useAccreditation() {
  const data = useData();
  const update = useVault((s) => s.update);
  const ws = data.accreditation;

  const mutate = React.useCallback((fn: (w: AccreditationWorkspace) => AccreditationWorkspace) => update("accreditation", fn), [update]);

  return React.useMemo(
    () => ({
      ws,
      setCurrent: (slug: string) => mutate((w) => ({ ...w, current: slug })),

      activate: (fw: Framework, scopeLabel: string) =>
        mutate((w) => ({
          ...w,
          active: [...w.active.filter((a) => a.slug !== fw.slug), { slug: fw.slug, activatedAt: new Date().toISOString(), scopeLabel, snapshot: fw }],
          current: fw.slug,
        })),

      setScope: (slug: string, scopeLabel: string) => mutate((w) => ({ ...w, active: w.active.map((a) => (a.slug === slug ? { ...a, scopeLabel } : a)) })),

      /** Çerçeveyi kaldırır; bu çerçeveye ait kayıtlar, olgunluk değerleri ve şifreli dosyalar silinir. */
      deactivate: async (slug: string) => {
        const prefix = `${slug}::`;
        const files = Object.entries(ws.records)
          .filter(([k]) => k.startsWith(prefix))
          .flatMap(([, r]) => r.attachments);
        await Promise.all(files.map(removeAttachment));
        mutate((w) => {
          const active = w.active.filter((a) => a.slug !== slug);
          const strip = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith(prefix)));
          const custom = { ...w.custom };
          delete custom[slug];
          return { ...w, active, current: w.current === slug ? (active[0]?.slug ?? null) : w.current, records: strip(w.records), maturity: strip(w.maturity), custom };
        });
      },

      patchRecord: (slug: string, evidenceId: string, patch: Partial<EvidenceRecord>) =>
        mutate((w) => {
          const k = recKey(slug, evidenceId);
          const prev = w.records[k] ?? emptyRecord();
          return { ...w, records: { ...w.records, [k]: { ...prev, ...patch, updatedAt: new Date().toISOString() } } };
        }),

      /** Ek ekler; durum "Eksik" ise otomatik olarak "Hazırlanıyor"a geçer. */
      addAttachments: (slug: string, evidenceId: string, files: EvidenceAttachment[]) =>
        mutate((w) => {
          const k = recKey(slug, evidenceId);
          const prev = w.records[k] ?? emptyRecord();
          return {
            ...w,
            records: {
              ...w.records,
              [k]: { ...prev, status: prev.status === "missing" ? "in-progress" : prev.status, attachments: [...prev.attachments, ...files], updatedAt: new Date().toISOString() },
            },
          };
        }),

      removeAttachment: async (slug: string, evidenceId: string, a: EvidenceAttachment) => {
        await removeAttachment(a);
        mutate((w) => {
          const k = recKey(slug, evidenceId);
          const prev = w.records[k];
          if (!prev) return w;
          return { ...w, records: { ...w.records, [k]: { ...prev, attachments: prev.attachments.filter((x) => x.id !== a.id), updatedAt: new Date().toISOString() } } };
        });
      },

      setMaturity: (slug: string, subId: string, level: number | null) =>
        mutate((w) => {
          const maturity = { ...w.maturity };
          if (level == null) delete maturity[`${slug}::${subId}`];
          else maturity[`${slug}::${subId}`] = level;
          return { ...w, maturity };
        }),

      addCustom: (slug: string, criterionId: string, title: string) =>
        mutate((w) => ({ ...w, custom: { ...w.custom, [slug]: [...(w.custom[slug] ?? []), { id: uid("ozel"), criterionId, title }] } })),

      removeCustom: async (slug: string, id: string) => {
        const rec = ws.records[recKey(slug, id)];
        await Promise.all((rec?.attachments ?? []).map(removeAttachment));
        mutate((w) => {
          const records = { ...w.records };
          delete records[recKey(slug, id)];
          return { ...w, records, custom: { ...w.custom, [slug]: (w.custom[slug] ?? []).filter((c) => c.id !== id) } };
        });
      },
    }),
    [ws, mutate],
  );
}

export type AccreditationApi = ReturnType<typeof useAccreditation>;
