"use client";

import * as React from "react";
import { useData, useVault } from "@/lib/store";
import type {
  AccreditationWorkspace,
  EvidenceAttachment,
  EvidenceRecord,
  EvidenceRequest,
  Framework,
  ImprovementAction,
  IncomingRequest,
  RequestSubmissionLog,
} from "@/lib/accreditation/types";
import { blobStillReferenced, recKey } from "@/lib/accreditation/progress";
import { uid } from "@/lib/utils";
import { removeAttachment as deleteBlobFile } from "@/services/accreditationService";

const emptyRecord = (): EvidenceRecord => ({ status: "missing", attachments: [], updatedAt: new Date().toISOString() });
const now = () => new Date().toISOString();

/** Kanıt çalışma alanı üzerindeki tüm değişiklikler (şifreli "accreditation" koleksiyonuna yazılır). */
export function useAccreditation() {
  const data = useData();
  const update = useVault((s) => s.update);
  const ws = data.accreditation;

  const mutate = React.useCallback((fn: (w: AccreditationWorkspace) => AccreditationWorkspace) => update("accreditation", fn), [update]);
  const getWs = () => useVault.getState().data!.accreditation;

  /** Dosyayı yalnızca başka hiçbir kayıt kullanmıyorsa siler (çoklu bağlantı) */
  const releaseBlobs = async (files: EvidenceAttachment[], exceptRecordKeys: Set<string>, exceptInbox?: string) => {
    const w = getWs();
    const probe: AccreditationWorkspace = exceptInbox ? { ...w, inbox: w.inbox.filter((r) => r.id !== exceptInbox) } : w;
    const ids = Array.from(new Set(files.map((f) => f.id)));
    await Promise.all(ids.filter((id) => !blobStillReferenced(probe, id, exceptRecordKeys)).map((id) => deleteBlobFile({ id } as EvidenceAttachment)));
  };

  const patchRec = (w: AccreditationWorkspace, slug: string, evidenceId: string, fn: (r: EvidenceRecord) => EvidenceRecord): AccreditationWorkspace => {
    const k = recKey(slug, evidenceId);
    return { ...w, records: { ...w.records, [k]: { ...fn(w.records[k] ?? emptyRecord()), updatedAt: now() } } };
  };

  return React.useMemo(
    () => ({
      ws,
      setCurrent: (slug: string) => mutate((w) => ({ ...w, current: slug })),
      setProfileName: (profileName: string) => mutate((w) => ({ ...w, profileName })),

      activate: (fw: Framework, scopeLabel: string) =>
        mutate((w) => ({
          ...w,
          active: [...w.active.filter((a) => a.slug !== fw.slug), { slug: fw.slug, activatedAt: now(), scopeLabel, snapshot: fw }],
          current: fw.slug,
        })),

      setScope: (slug: string, scopeLabel: string) => mutate((w) => ({ ...w, active: w.active.map((a) => (a.slug === slug ? { ...a, scopeLabel } : a)) })),

      /** Çerçeveyi kaldırır; kayıtlar, olgunluk, eylemler, talepler ve yalnızca bu çerçevenin kullandığı dosyalar silinir. */
      deactivate: async (slug: string) => {
        const prefix = `${slug}::`;
        const keys = Object.keys(ws.records).filter((k) => k.startsWith(prefix));
        await releaseBlobs(
          keys.flatMap((k) => ws.records[k].attachments),
          new Set(keys),
        );
        mutate((w) => {
          const active = w.active.filter((a) => a.slug !== slug);
          const strip = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith(prefix)));
          const custom = { ...w.custom };
          delete custom[slug];
          const actions = { ...w.actions };
          delete actions[slug];
          return {
            ...w,
            active,
            current: w.current === slug ? (active[0]?.slug ?? null) : w.current,
            records: strip(w.records),
            maturity: strip(w.maturity),
            custom,
            actions,
            requests: w.requests.filter((r) => r.slug !== slug),
          };
        });
      },

      patchRecord: (slug: string, evidenceId: string, patch: Partial<EvidenceRecord>) => mutate((w) => patchRec(w, slug, evidenceId, (r) => ({ ...r, ...patch }))),

      /** Ek ekler; durum "Eksik" ise otomatik olarak "Hazırlanıyor"a geçer. */
      addAttachments: (slug: string, evidenceId: string, files: EvidenceAttachment[]) =>
        mutate((w) =>
          patchRec(w, slug, evidenceId, (r) => ({
            ...r,
            status: r.status === "missing" ? "in-progress" : r.status,
            attachments: [...r.attachments, ...files.filter((f) => !r.attachments.some((x) => x.id === f.id))],
          })),
        ),

      /** Aynı şifreli dosyayı birden çok kanıta bağlar (tek kopya) */
      linkAttachment: (slug: string, evidenceIds: string[], file: EvidenceAttachment) =>
        mutate((w) =>
          evidenceIds.reduce(
            (acc, id) =>
              patchRec(acc, slug, id, (r) =>
                r.attachments.some((x) => x.id === file.id) ? r : { ...r, status: r.status === "missing" ? "in-progress" : r.status, attachments: [...r.attachments, file] },
              ),
            w,
          ),
        ),

      setAttachmentPeriod: (slug: string, evidenceId: string, fileId: string, period: string | undefined) =>
        mutate((w) => patchRec(w, slug, evidenceId, (r) => ({ ...r, attachments: r.attachments.map((a) => (a.id === fileId ? { ...a, period } : a)) }))),

      removeAttachment: async (slug: string, evidenceId: string, a: EvidenceAttachment) => {
        await releaseBlobs([a], new Set([recKey(slug, evidenceId)]));
        mutate((w) => patchRec(w, slug, evidenceId, (r) => ({ ...r, attachments: r.attachments.filter((x) => x.id !== a.id) })));
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
        const k = recKey(slug, id);
        await releaseBlobs(ws.records[k]?.attachments ?? [], new Set([k]));
        mutate((w) => {
          const records = { ...w.records };
          delete records[k];
          return { ...w, records, custom: { ...w.custom, [slug]: (w.custom[slug] ?? []).filter((c) => c.id !== id) } };
        });
      },

      // ---- İyileştirme eylemleri ----
      addAction: (slug: string, a: Omit<ImprovementAction, "id" | "createdAt" | "status">) =>
        mutate((w) => ({ ...w, actions: { ...w.actions, [slug]: [...(w.actions[slug] ?? []), { ...a, id: uid("eylem"), status: "open", createdAt: now() }] } })),
      patchAction: (slug: string, id: string, patch: Partial<ImprovementAction>) =>
        mutate((w) => ({
          ...w,
          actions: {
            ...w.actions,
            [slug]: (w.actions[slug] ?? []).map((a) =>
              a.id === id ? { ...a, ...patch, doneAt: patch.status === "done" ? (a.doneAt ?? now()) : patch.status === "open" ? undefined : a.doneAt } : a,
            ),
          },
        })),
      removeAction: (slug: string, id: string) => mutate((w) => ({ ...w, actions: { ...w.actions, [slug]: (w.actions[slug] ?? []).filter((a) => a.id !== id) } })),

      // ---- Ekip: koordinatör ----
      addRequest: (r: EvidenceRequest) => mutate((w) => ({ ...w, requests: [r, ...w.requests] })),
      removeRequest: (id: string) => mutate((w) => ({ ...w, requests: w.requests.filter((r) => r.id !== id) })),
      logSubmission: (requestId: string, log: RequestSubmissionLog) =>
        mutate((w) => ({ ...w, requests: w.requests.map((r) => (r.id === requestId ? { ...r, submissions: [...r.submissions, log] } : r)) })),

      /** Teslim paketini tek seferde uygular: dosyalar, notlar ve teslim kaydı birlikte yazılır */
      importSubmission: (slug: string, requestId: string, entries: { evidenceId: string; files: EvidenceAttachment[]; note?: string }[], log: RequestSubmissionLog) =>
        mutate((w) => {
          let next = entries.reduce(
            (acc, en) =>
              patchRec(acc, slug, en.evidenceId, (r) => ({
                ...r,
                status: r.status === "missing" && en.files.length ? "in-progress" : r.status,
                attachments: [...r.attachments, ...en.files],
                note: en.note ? (r.note ? `${r.note}\n${en.note}` : en.note) : r.note,
              })),
            w,
          );
          next = { ...next, requests: next.requests.map((r) => (r.id === requestId ? { ...r, submissions: [...r.submissions, log] } : r)) };
          return next;
        }),

      // ---- Ekip: öğretim elemanı ----
      addIncoming: (r: IncomingRequest) => mutate((w) => ({ ...w, inbox: [r, ...w.inbox.filter((x) => x.id !== r.id)] })),
      patchAnswer: (requestId: string, evidenceId: string, patch: { note?: string; attachments?: EvidenceAttachment[] }) =>
        mutate((w) => ({
          ...w,
          inbox: w.inbox.map((r) => {
            if (r.id !== requestId) return r;
            const prev = Object.prototype.hasOwnProperty.call(r.answers, evidenceId) ? r.answers[evidenceId] : { attachments: [] };
            return { ...r, answers: { ...r.answers, [evidenceId]: { ...prev, ...patch } } };
          }),
        })),
      /** Güncel durum üzerine ekler (yükleme sürerken yapılan silmeler geri gelmez) */
      appendIncomingFiles: (requestId: string, evidenceId: string, files: EvidenceAttachment[]) =>
        mutate((w) => ({
          ...w,
          inbox: w.inbox.map((r) => {
            if (r.id !== requestId) return r;
            const prev = Object.prototype.hasOwnProperty.call(r.answers, evidenceId) ? r.answers[evidenceId] : { attachments: [] };
            return { ...r, answers: { ...r.answers, [evidenceId]: { ...prev, attachments: [...prev.attachments, ...files] } } };
          }),
        })),
      removeIncomingFile: async (requestId: string, evidenceId: string, a: EvidenceAttachment) => {
        mutate((w) => ({
          ...w,
          inbox: w.inbox.map((r) =>
            r.id !== requestId || !Object.prototype.hasOwnProperty.call(r.answers, evidenceId)
              ? r
              : { ...r, answers: { ...r.answers, [evidenceId]: { ...r.answers[evidenceId], attachments: r.answers[evidenceId].attachments.filter((x) => x.id !== a.id) } } },
          ),
        }));
        if (!blobStillReferenced(getWs(), a.id)) await deleteBlobFile(a);
      },
      markSubmitted: (requestId: string) => mutate((w) => ({ ...w, inbox: w.inbox.map((r) => (r.id === requestId ? { ...r, submissions: [...r.submissions, now()] } : r)) })),
      removeIncoming: async (requestId: string) => {
        const req = ws.inbox.find((r) => r.id === requestId);
        await releaseBlobs(Object.values(req?.answers ?? {}).flatMap((a) => a.attachments), new Set(), requestId);
        mutate((w) => ({ ...w, inbox: w.inbox.filter((r) => r.id !== requestId) }));
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- releaseBlobs/patchRec saf yardımcılar; güncel durum getWs ile okunur
    [ws, mutate],
  );
}

export type AccreditationApi = ReturnType<typeof useAccreditation>;
