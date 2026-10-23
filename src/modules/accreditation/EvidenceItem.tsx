"use client";

import * as React from "react";
import { ChevronRight, Download, ExternalLink, FilePlus2, Link2, Loader2, Lock, Paperclip, Search, Sparkles, Trash2, Upload, Users, Wand2 } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { ActiveFramework, EvidenceAttachment, EvidenceRecord, EvidenceStatus, FwEvidence } from "@/lib/accreditation/types";
import { STATUS_LABEL } from "@/lib/accreditation/types";
import { criterionEvidence, recKey } from "@/lib/accreditation/progress";
import { KIND_LABEL, type AppDocKind, type Suggestion } from "@/lib/accreditation/matcher";
import { cn, foldTr, formatBytes, formatTrDate, todayIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { academicYears, downloadAttachment, storeAttachment, type AppDocument } from "@/services/accreditationService";
import type { AccreditationApi } from "./useAccreditation";

export const STATUS_STYLE: Record<EvidenceStatus, string> = {
  missing: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  "in-progress": "bg-amber-50 text-amber-800 ring-amber-200",
  ready: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  na: "bg-zinc-50 text-zinc-400 ring-zinc-200 line-through",
};

export const STATUS_DOT: Record<EvidenceStatus, string> = {
  missing: "border border-zinc-300 bg-white",
  "in-progress": "bg-amber-500",
  ready: "bg-emerald-600",
  na: "bg-zinc-300",
};

export function StatusSelect({ value, onChange }: { value: EvidenceStatus; onChange: (s: EvidenceStatus) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EvidenceStatus)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Kanıt durumu"
      className={cn("h-7 cursor-pointer rounded-md px-2 text-[11.5px] font-medium ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-brand-500/40", STATUS_STYLE[value])}
    >
      {(Object.keys(STATUS_LABEL) as EvidenceStatus[]).map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

export function KindBadge({ e, custom, fwCustom }: { e: FwEvidence; custom: boolean; fwCustom: boolean }) {
  if (custom || fwCustom) return <Badge tone="slate">Kurum tanımı</Badge>;
  return e.kind === "explicit" ? (
    <Badge tone="brand" title="Kuruluşun yayımladığı belgede “örnek kanıt” olarak birebir geçiyor">
      Kuruluş örneği
    </Badge>
  ) : (
    <Badge tone="sky" title="Belgede kanıt olarak sayılmıyor; ölçüt metninin istediği bir uygulamanın kanıtı olarak türetildi">
      Ölçütten türetilmiş
    </Badge>
  );
}

export interface DocContext {
  docs: AppDocument[];
  suggestions: Map<string, Suggestion[]>;
}

export function EvidenceItem({
  fw,
  e,
  api,
  custom,
  open,
  onToggle,
  ctx,
}: {
  fw: ActiveFramework;
  e: FwEvidence;
  api: AccreditationApi;
  custom: boolean;
  open: boolean;
  onToggle: () => void;
  ctx: DocContext;
}) {
  const rec: EvidenceRecord | undefined = api.ws.records[recKey(fw.slug, e.id)];
  const status = rec?.status ?? "missing";
  const overdue = !!rec?.due && rec.due < todayIso() && status !== "ready" && status !== "na";
  const fwCustom = fw.snapshot.status === "custom";
  const sugg = ctx.suggestions.get(e.id) ?? [];
  const suggestedDocs = ctx.docs.filter((d) => d.available && sugg.some((s) => s.kind === d.kind));
  const fromTeam = rec?.attachments.some((a) => a.origin === "team");

  return (
    <li className={cn("rounded-lg border transition-colors", open ? "border-zinc-300 bg-white shadow-[var(--shadow-card)]" : "border-transparent hover:bg-zinc-50")}>
      <div className="flex items-start gap-3 px-3 py-2.5">
        <button onClick={onToggle} className="mt-1 text-zinc-400 hover:text-zinc-700" aria-label={open ? "Ayrıntıları kapat" : "Ayrıntıları aç"} aria-expanded={open}>
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
        </button>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onToggle}>
          <div className={cn("text-[13px] leading-snug text-zinc-900", status === "na" && "text-zinc-400 line-through")}>{e.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
            <KindBadge e={e} custom={custom} fwCustom={fwCustom} />
            {suggestedDocs.length > 0 && !rec?.attachments.length && (
              <Badge tone="emerald" title="Uygulamanın ürettiği belgelerden bu kaleme uyan var">
                <Sparkles className="h-3 w-3" /> Uygulamada hazır belge var
              </Badge>
            )}
            {(rec?.attachments.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {rec!.attachments.length}
              </span>
            )}
            {fromTeam && (
              <span className="inline-flex items-center gap-1 text-brand-800">
                <Users className="h-3 w-3" /> ekip teslimi
              </span>
            )}
            {rec?.owner && <span>· {rec.owner}</span>}
            {rec?.due && (
              <span className={cn(overdue && "font-medium text-red-700")}>
                · {overdue ? "Gecikti: " : "Son: "}
                {formatTrDate(rec.due)}
              </span>
            )}
          </div>
        </div>
        <StatusSelect value={status} onChange={(s) => api.patchRecord(fw.slug, e.id, { status: s })} />
      </div>
      {open && <EvidenceDetail fw={fw} e={e} api={api} rec={rec} custom={custom} ctx={ctx} sugg={sugg} />}
    </li>
  );
}

function EvidenceDetail({ fw, e, api, rec, custom, ctx, sugg }: { fw: ActiveFramework; e: FwEvidence; api: AccreditationApi; rec?: EvidenceRecord; custom: boolean; ctx: DocContext; sugg: Suggestion[] }) {
  const data = useData();
  const key = useVault((s) => s.key);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [linking, setLinking] = React.useState<EvidenceAttachment | null>(null);
  const yokak = fw.slug.startsWith("yokak");
  const period = data.institution.academicYear;
  const years = academicYears(period);

  const upload = async (files: FileList | File[]) => {
    if (!key || !files.length) return;
    setBusy("upload");
    try {
      const stored = [];
      for (const f of Array.from(files)) stored.push(await storeAttachment(key, { name: f.name, type: f.type, data: await f.arrayBuffer() }, "upload", { period }));
      api.addAttachments(fw.slug, e.id, stored);
      toast.success(`${stored.length} dosya şifrelenerek eklendi`, "AES-256-GCM · yalnızca bu cihazda");
    } catch (err) {
      toast.error("Dosya eklenemedi", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const attachDoc = async (doc: AppDocument) => {
    if (!key) return;
    setBusy(doc.id);
    try {
      const files = await doc.generate();
      const stored = [];
      for (const f of files) stored.push(await storeAttachment(key, { name: f.fileName, type: f.blob.type, data: await f.blob.arrayBuffer() }, "app", { period }));
      api.addAttachments(fw.slug, e.id, stored);
      toast.success(`${doc.label} eklendi`, `${stored.length} dosya şifrelendi`);
    } catch (err) {
      toast.error("Belge üretilemedi", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const suggestedKinds = sugg.map((s) => s.kind);

  return (
    <div
      className={cn("space-y-4 border-t border-zinc-100 px-4 pb-4 pt-3 sm:pl-10", drag && "bg-brand-50/50")}
      onDragOver={(ev) => {
        ev.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(ev) => {
        ev.preventDefault();
        setDrag(false);
        void upload(ev.dataTransfer.files);
      }}
    >
      {(e.basis || e.source) && !custom && (
        <div className="rounded-lg bg-zinc-50 px-3 py-2 text-[11.5px] leading-relaxed text-zinc-600">
          {e.basis && <p>{e.basis}</p>}
          {e.source && <SourceLink source={e.source} className="mt-1" />}
          {e.versions && e.versions.length > 0 && <p className="mt-1 text-zinc-400">Geçtiği sürümler: {e.versions.join(", ")}</p>}
          {e.note && <p className="mt-1 text-zinc-500">{e.note}</p>}
        </div>
      )}

      {sugg.length > 0 && (
        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-emerald-900">
            <Sparkles className="h-3.5 w-3.5" /> Uygulamanın ürettiği belgelerden önerilenler
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-900/70">
            Kanıt metninde geçen {sugg.map((s) => `“${s.phrase}”`).join(", ")} ifadesine göre. Uygunluğunu siz değerlendirin.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sugg.flatMap((s) =>
              ctx.docs
                .filter((d) => d.kind === s.kind)
                .slice(0, 6)
                .map((d) => (
                  <Button key={d.id} size="sm" variant="outline" disabled={!d.available || !!busy} title={d.available ? `${KIND_LABEL[d.kind]} — ${d.group}` : d.reason} onClick={() => attachDoc(d)}>
                    {busy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
                    <span className="max-w-[260px] truncate">
                      {d.label} · {d.group}
                    </span>
                  </Button>
                )),
            )}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sorumlu">
          <Input defaultValue={rec?.owner ?? ""} placeholder="ör. Bölüm kalite temsilcisi" onBlur={(ev) => ev.target.value !== (rec?.owner ?? "") && api.patchRecord(fw.slug, e.id, { owner: ev.target.value.trim() || undefined })} />
        </Field>
        <Field label="Son tarih">
          <Input type="date" value={rec?.due ?? ""} onChange={(ev) => api.patchRecord(fw.slug, e.id, { due: ev.target.value || undefined })} />
        </Field>
      </div>
      <Field label="Not / öz değerlendirme metni" hint="Öz değerlendirme çalışma raporunda ilgili ölçütün altına aktarılır.">
        <Textarea
          key={rec?.note ?? ""}
          defaultValue={rec?.note ?? ""}
          placeholder="Bu kanıt neyi gösteriyor, hangi döneme ait, nerede saklanıyor…"
          className="min-h-[64px]"
          onBlur={(ev) => ev.target.value !== (rec?.note ?? "") && api.patchRecord(fw.slug, e.id, { note: ev.target.value.trim() || undefined })}
        />
      </Field>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11.5px] font-medium text-zinc-600">Kanıt dosyaları</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
            <Lock className="h-3 w-3" /> Tarayıcıda şifrelenir, sunucuya gönderilmez
          </span>
        </div>
        {rec?.attachments.length ? (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200/80">
            {rec.attachments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-[12.5px]">
                {a.origin === "app" ? (
                  <Wand2 className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                ) : a.origin === "team" ? (
                  <Users className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-zinc-900" title={a.name}>
                    {a.name}
                  </div>
                  <div className="font-mono text-[10.5px] text-zinc-400" title={`SHA-256 ${a.sha256}`}>
                    {formatBytes(a.size)} · {formatTrDate(a.addedAt.slice(0, 10))}
                    {a.submittedBy && ` · teslim: ${a.submittedBy}`} · sha256 {a.sha256.slice(0, 12)}…
                  </div>
                </div>
                <select
                  value={a.period ?? ""}
                  onChange={(ev) => api.setAttachmentPeriod(fw.slug, e.id, a.id, ev.target.value || undefined)}
                  aria-label="Akademik yıl"
                  className="h-7 rounded-md border border-zinc-200 bg-white px-1.5 text-[11px] text-zinc-700"
                >
                  <option value="">Dönem yok</option>
                  {Array.from(new Set([...(a.period ? [a.period] : []), ...years])).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <div className="flex">
                  <Button size="icon" variant="ghost" aria-label="Başka kanıta da bağla" title="Başka kanıta da bağla (tek kopya)" onClick={() => setLinking(a)}>
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="İndir"
                    onClick={() => key && downloadAttachment(key, a).catch((err) => toast.error("İndirilemedi", err instanceof Error ? err.message : String(err)))}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Sil"
                    onClick={async () => {
                      if (await confirmDialog({ title: "Dosya bu kanıttan kaldırılsın mı?", message: `“${a.name}” bu kanıttan kaldırılacak. Başka kanıta bağlı değilse kasadan da silinir.`, destructive: true, confirmLabel: "Kaldır" }))
                        await api.removeAttachment(fw.slug, e.id, a);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-3 text-center text-[12px] text-zinc-500">Dosyayı buraya sürükleyin veya aşağıdan seçin.</p>
        )}
        {yokak && rec?.attachments.length ? (
          <p className="mt-1.5 text-[11px] text-zinc-500">Kanıt paketinde dosya adları YÖKAK kuralına göre (Türkçe karakter ve boşluk olmadan, kısa) yeniden adlandırılır.</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(ev) => ev.target.files && upload(ev.target.files)} />
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {busy === "upload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Dosya ekle
          </Button>
          <Button size="sm" variant="ai" disabled={!!busy} onClick={() => setPickerOpen(true)}>
            <FilePlus2 className="h-3.5 w-3.5" /> Uygulamadan belge ekle
          </Button>
          {custom && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={async () => {
                if (await confirmDialog({ title: "Kanıt kalemi silinsin mi?", message: "Bu kaleme eklenmiş ve başka kanıta bağlı olmayan dosyalar da silinir.", destructive: true, confirmLabel: "Sil" })) await api.removeCustom(fw.slug, e.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Kalemi sil
            </Button>
          )}
        </div>
      </div>
      <AppDocumentPicker
        open={pickerOpen}
        docs={ctx.docs}
        preferred={suggestedKinds}
        onClose={() => setPickerOpen(false)}
        onPick={async (doc) => {
          await attachDoc(doc);
          setPickerOpen(false);
        }}
      />
      <LinkDialog fw={fw} api={api} file={linking} fromId={e.id} onClose={() => setLinking(null)} />
    </div>
  );
}

export function SourceLink({ source, className }: { source: string; className?: string }) {
  if (typeof source !== "string" || !source) return null;
  const m = source.match(/^(https?:\/\/\S+)\s*(?:\((.+)\))?$/);
  let host = "";
  try {
    host = m ? new URL(m[1]).hostname : "";
  } catch {
    host = "";
  }
  if (!m || !host) return <p className={cn("text-zinc-500", className)}>Kaynak: {source}</p>;
  return (
    <a href={m[1]} target="_blank" rel="noreferrer noopener" className={cn("inline-flex items-start gap-1 text-brand-800 underline-offset-2 hover:underline", className)}>
      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
      <span>Kaynak: {m[2] ?? host}</span>
    </a>
  );
}

/** Aynı şifreli dosyayı başka kanıt kalemlerine de bağlar */
function LinkDialog({ fw, api, file, fromId, onClose }: { fw: ActiveFramework; api: AccreditationApi; file: EvidenceAttachment | null; fromId: string; onClose: () => void }) {
  const [q, setQ] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const fq = foldTr(q.trim());
  const all = fw.snapshot.criteria.flatMap((c) => criterionEvidence(api.ws, fw, c).map((e) => ({ c, e })));
  const list = all.filter(({ c, e }) => e.id !== fromId && (!fq || foldTr(`${c.id} ${c.title} ${e.sub ?? ""} ${e.title}`).includes(fq))).slice(0, 80);
  const already = (id: string) => !!file && !!api.ws.records[recKey(fw.slug, id)]?.attachments.some((a) => a.id === file.id);
  const close = () => {
    setQ("");
    setPicked([]);
    onClose();
  };
  return (
    <Dialog
      open={!!file}
      onClose={close}
      size="lg"
      title="Başka kanıta da bağla"
      description={file ? `“${file.name}” seçtiğiniz kanıtlara da eklenir. Dosya kasada tek kopya olarak kalır; bir kanıttan kaldırmak diğerlerini etkilemez.` : ""}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Vazgeç
          </Button>
          <Button
            variant="success"
            disabled={!picked.length}
            onClick={() => {
              api.linkAttachment(fw.slug, picked, file!);
              toast.success(`Dosya ${picked.length} kanıta daha bağlandı`);
              close();
            }}
          >
            {picked.length} kanıta bağla
          </Button>
        </>
      }
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
        <Input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Ölçüt, alt ölçüt veya kanıt ara" className="pl-8" autoFocus aria-label="Kanıt ara" />
      </div>
      <ul className="mt-3 max-h-[50vh] divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200/80">
        {list.map(({ c, e }) => (
          <li key={e.id} className="px-3 py-2">
            <Checkbox
              checked={already(e.id) || picked.includes(e.id)}
              onChange={(v) => !already(e.id) && setPicked((p) => (v ? [...p, e.id] : p.filter((x) => x !== e.id)))}
              label={
                <span className="text-[12.5px]">
                  <span className="font-mono text-[10.5px] text-zinc-500">{e.sub ?? c.id}</span> {e.title}
                  {already(e.id) && <span className="ml-1 text-[11px] text-zinc-400">(zaten bağlı)</span>}
                </span>
              }
            />
          </li>
        ))}
        {!list.length && <li className="px-3 py-3 text-xs text-zinc-500">Eşleşen kanıt yok.</li>}
      </ul>
    </Dialog>
  );
}

function AppDocumentPicker({ open, docs, preferred, onClose, onPick }: { open: boolean; docs: AppDocument[]; preferred: AppDocKind[]; onClose: () => void; onPick: (d: AppDocument) => Promise<void> }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const ordered = [...docs].sort((a, b) => Number(preferred.includes(b.kind)) - Number(preferred.includes(a.kind)));
  const groups = Array.from(new Set(ordered.map((d) => d.group)));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Uygulamadan belge ekle"
      description="Seçtiğiniz resmi belge şu anki verilerle üretilir, şifrelenir ve bu kanıta eklenir. Belgenin o günkü hali korunur."
    >
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g}>
            <div className="mb-1.5 text-[11.5px] font-medium text-zinc-500">{g}</div>
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200/80">
              {ordered
                .filter((d) => d.group === g)
                .map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className={cn("text-[13px]", d.available ? "text-zinc-900" : "text-zinc-400")}>
                      {d.label}
                      {preferred.includes(d.kind) && d.available && (
                        <Badge tone="emerald" className="ml-2">
                          Önerilen
                        </Badge>
                      )}
                      {!d.available && d.reason && <span className="ml-2 text-[11px]">({d.reason})</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!d.available || !!busy}
                      onClick={async () => {
                        setBusy(d.id);
                        try {
                          await onPick(d);
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      {busy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />} Ekle
                    </Button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {!docs.length && <p className="text-sm text-zinc-500">Henüz belge üretecek ders veya sınav yok.</p>}
      </div>
    </Dialog>
  );
}
