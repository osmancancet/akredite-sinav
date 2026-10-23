"use client";

import * as React from "react";
import { ChevronRight, Download, ExternalLink, FilePlus2, Loader2, Lock, Paperclip, Trash2, Upload, Wand2 } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { ActiveFramework, EvidenceRecord, EvidenceStatus, FwEvidence } from "@/lib/accreditation/types";
import { STATUS_LABEL } from "@/lib/accreditation/types";
import { recKey } from "@/lib/accreditation/progress";
import { cn, formatBytes, formatTrDate, todayIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { downloadAttachment, listAppDocuments, storeAttachment, type AppDocument } from "@/services/accreditationService";
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

export function EvidenceItem({
  fw,
  e,
  api,
  custom,
  open,
  onToggle,
}: {
  fw: ActiveFramework;
  e: FwEvidence;
  api: AccreditationApi;
  custom: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const rec: EvidenceRecord | undefined = api.ws.records[recKey(fw.slug, e.id)];
  const status = rec?.status ?? "missing";
  const overdue = !!rec?.due && rec.due < todayIso() && status !== "ready" && status !== "na";
  const fwCustom = fw.snapshot.status === "custom";

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
            {(rec?.attachments.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {rec!.attachments.length}
              </span>
            )}
            {rec?.owner && <span>· {rec.owner}</span>}
            {rec?.due && <span className={cn(overdue && "font-medium text-red-700")}>· {overdue ? "Gecikti: " : "Son: "}{formatTrDate(rec.due)}</span>}
          </div>
        </div>
        <StatusSelect value={status} onChange={(s) => api.patchRecord(fw.slug, e.id, { status: s })} />
      </div>
      {open && <EvidenceDetail fw={fw} e={e} api={api} rec={rec} custom={custom} />}
    </li>
  );
}

function EvidenceDetail({ fw, e, api, rec, custom }: { fw: ActiveFramework; e: FwEvidence; api: AccreditationApi; rec?: EvidenceRecord; custom: boolean }) {
  const key = useVault((s) => s.key);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const yokak = fw.slug.startsWith("yokak");

  const upload = async (files: FileList | File[]) => {
    if (!key || !files.length) return;
    setBusy(true);
    try {
      const stored = [];
      for (const f of Array.from(files)) stored.push(await storeAttachment(key, { name: f.name, type: f.type, data: await f.arrayBuffer() }, "upload"));
      api.addAttachments(fw.slug, e.id, stored);
      toast.success(`${stored.length} dosya şifrelenerek eklendi`, "AES-256-GCM · yalnızca bu cihazda");
    } catch (err) {
      toast.error("Dosya eklenemedi", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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
          {e.source && (
            <SourceLink source={e.source} className="mt-1" />
          )}
          {e.versions && e.versions.length > 0 && <p className="mt-1 text-zinc-400">Geçtiği sürümler: {e.versions.join(", ")}</p>}
          {e.note && <p className="mt-1 text-zinc-500">{e.note}</p>}
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
              <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-[12.5px]">
                {a.origin === "app" ? <Wand2 className="h-3.5 w-3.5 shrink-0 text-brand-600" /> : <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-zinc-900" title={a.name}>
                    {a.name}
                  </div>
                  <div className="font-mono text-[10.5px] text-zinc-400" title={`SHA-256 ${a.sha256}`}>
                    {formatBytes(a.size)} · {formatTrDate(a.addedAt.slice(0, 10))} · sha256 {a.sha256.slice(0, 12)}…
                  </div>
                </div>
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
                    if (await confirmDialog({ title: "Dosya silinsin mi?", message: `“${a.name}” kasadan kalıcı olarak silinecek.`, destructive: true, confirmLabel: "Sil" })) await api.removeAttachment(fw.slug, e.id, a);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
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
          <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Dosya ekle
          </Button>
          <Button size="sm" variant="ai" disabled={busy} onClick={() => setPickerOpen(true)}>
            <FilePlus2 className="h-3.5 w-3.5" /> Uygulamadan belge ekle
          </Button>
          {custom && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={async () => {
                if (await confirmDialog({ title: "Kanıt kalemi silinsin mi?", message: "Bu kaleme eklenmiş dosyalar da silinir.", destructive: true, confirmLabel: "Sil" })) await api.removeCustom(fw.slug, e.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Kalemi sil
            </Button>
          )}
        </div>
      </div>
      <AppDocumentPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={async (doc) => {
          if (!key) return;
          const files = await doc.generate();
          const stored = [];
          for (const f of files) stored.push(await storeAttachment(key, { name: f.fileName, type: f.blob.type, data: await f.blob.arrayBuffer() }, "app"));
          api.addAttachments(fw.slug, e.id, stored);
          toast.success(`${doc.label} eklendi`, `${stored.length} dosya şifrelendi`);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

export function SourceLink({ source, className }: { source: string; className?: string }) {
  const m = source.match(/^(https?:\/\/\S+)\s*(?:\((.+)\))?$/);
  if (!m) return <p className={cn("text-zinc-500", className)}>Kaynak: {source}</p>;
  return (
    <a href={m[1]} target="_blank" rel="noreferrer noopener" className={cn("inline-flex items-start gap-1 text-brand-800 underline-offset-2 hover:underline", className)}>
      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
      <span>Kaynak: {m[2] ?? new URL(m[1]).hostname}</span>
    </a>
  );
}

function AppDocumentPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (d: AppDocument) => Promise<void> }) {
  const data = useData();
  const docs = React.useMemo(() => (open ? listAppDocuments(data) : []), [open, data]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const groups = Array.from(new Set(docs.map((d) => d.group)));
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
              {docs
                .filter((d) => d.group === g)
                .map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className={cn("text-[13px]", d.available ? "text-zinc-900" : "text-zinc-400")}>
                      {d.label}
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
                        } catch (err) {
                          toast.error("Belge üretilemedi", err instanceof Error ? err.message : String(err));
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
