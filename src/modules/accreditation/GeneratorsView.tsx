"use client";

import * as React from "react";
import { FilePlus2, Loader2, Sparkles } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { ActiveFramework, FwEvidence } from "@/lib/accreditation/types";
import { criterionEvidence, recKey } from "@/lib/accreditation/progress";
import { KIND_LABEL, type AppDocKind } from "@/lib/accreditation/matcher";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { storeAttachment } from "@/services/accreditationService";
import type { DocContext } from "./EvidenceItem";
import type { AccreditationApi } from "./useAccreditation";

interface Target {
  e: FwEvidence;
  criterionId: string;
  phrase: string;
}

/** Uygulamanın ürettiği belgeleri, kuruluş belgesinde adıyla geçen kanıt kalemlerine toplu ekleme */
export function GeneratorsView({ fw, api, ctx, onOpen }: { fw: ActiveFramework; api: AccreditationApi; ctx: DocContext; onOpen: (criterionId: string) => void }) {
  const byKind = new Map<AppDocKind, Target[]>();
  fw.snapshot.criteria.forEach((c) =>
    criterionEvidence(api.ws, fw, c).forEach((e) =>
      (ctx.suggestions.get(e.id) ?? []).forEach((s) => byKind.set(s.kind, [...(byKind.get(s.kind) ?? []), { e, criterionId: c.id, phrase: s.phrase }])),
    ),
  );
  const kinds = (Object.keys(KIND_LABEL) as AppDocKind[]).filter((k) => byKind.has(k));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<Sparkles />}
          title="Kanıt üreticileri"
          description={`Uygulamanın ürettiği resmi belgeler, ${fw.snapshot.code} belgesinde adı açıkça geçen kanıt kalemlerine önerilir. Belge bir kez üretilip şifrelenir ve seçtiğiniz kalemlerin hepsine tek kopya olarak bağlanır.`}
        />
        {!kinds.length && (
          <CardBody>
            <p className="text-sm text-zinc-500">Bu çerçevenin kanıt listesinde uygulamanın ürettiği belge türleri adıyla geçmiyor. Belgeleri her kanıt kaleminde “Uygulamadan belge ekle” ile ekleyebilirsiniz.</p>
          </CardBody>
        )}
      </Card>
      {kinds.map((k) => (
        <KindCard key={k} fw={fw} api={api} kind={k} targets={byKind.get(k)!} ctx={ctx} onOpen={onOpen} />
      ))}
    </div>
  );
}

function KindCard({ fw, api, kind, targets, ctx, onOpen }: { fw: ActiveFramework; api: AccreditationApi; kind: AppDocKind; targets: Target[]; ctx: DocContext; onOpen: (criterionId: string) => void }) {
  const key = useVault((s) => s.key);
  const period = useData().institution.academicYear;
  const docs = ctx.docs.filter((d) => d.kind === kind);
  const available = docs.filter((d) => d.available);
  const [docId, setDocId] = React.useState(available[0]?.id ?? "");
  const hasFiles = (id: string) => !!api.ws.records[recKey(fw.slug, id)]?.attachments.length;
  const [picked, setPicked] = React.useState<string[]>(() => targets.filter((t) => !hasFiles(t.e.id)).map((t) => t.e.id));
  const [busy, setBusy] = React.useState(false);
  const doc = available.find((d) => d.id === docId) ?? available[0];

  return (
    <Card>
      <CardHeader
        title={KIND_LABEL[kind]}
        description={`${targets.length} kanıt kalemi bu belge türünü adıyla anıyor · uygulamada ${available.length} belge hazır${docs.length > available.length ? `, ${docs.length - available.length} belge için veri eksik` : ""}`}
        actions={
          available.length ? (
            <>
              <Select value={doc?.id ?? ""} onChange={(e) => setDocId(e.target.value)} className="h-8 w-auto max-w-[320px]" aria-label="Belge">
                {available.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.group} — {d.label}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="success"
                disabled={!picked.length || busy || !key || !doc}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const files = await doc!.generate();
                    for (const f of files) {
                      const a = await storeAttachment(key!, { name: f.fileName, type: f.blob.type, data: await f.blob.arrayBuffer() }, "app", { period });
                      api.linkAttachment(fw.slug, picked, a);
                    }
                    toast.success(`${doc!.label} ${picked.length} kanıta eklendi`, `${files.length} dosya, kasada tek kopya`);
                    setPicked([]);
                  } catch (e) {
                    toast.error("Belge üretilemedi", e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />} Seçili {picked.length} kanıta ekle
              </Button>
            </>
          ) : (
            <span className="text-[11.5px] text-zinc-500">{docs[0]?.reason ? `Belge için veri eksik: ${docs[0].reason}` : "Bu tür için uygulamada veri yok"}</span>
          )
        }
      />
      <ul className="divide-y divide-zinc-100">
        {targets.map((t) => (
          <li key={t.e.id} className="flex items-start gap-3 px-5 py-2.5">
            <Checkbox checked={picked.includes(t.e.id)} onChange={(v) => setPicked((p) => (v ? [...p, t.e.id] : p.filter((x) => x !== t.e.id)))} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] text-zinc-900">{t.e.title}</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">
                <button className="font-mono hover:text-brand-800 hover:underline" onClick={() => onOpen(t.criterionId)}>
                  {t.e.sub ?? t.criterionId}
                </button>{" "}
                · dayanak: “{t.phrase}”{hasFiles(t.e.id) && <span className="text-emerald-700"> · dosyası var</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
