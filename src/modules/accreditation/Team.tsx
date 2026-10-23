"use client";

import * as React from "react";
import { saveAs } from "file-saver";
import { Copy, Download, FileDown, Inbox, KeyRound, Loader2, Mail, Paperclip, Search, Send, ShieldCheck, Trash2, Upload, Users } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { ActiveFramework, EvidenceAttachment, EvidenceRequest, IncomingRequest } from "@/lib/accreditation/types";
import { criterionEvidence, recKey } from "@/lib/accreditation/progress";
import {
  createRequestKeys,
  fromBase64,
  openSubmission,
  parseRequestFile,
  parseSubmissionFile,
  sealSubmission,
  toBase64,
  type SubmissionPayload,
} from "@/lib/accreditation/exchange";
import { acceptedItems, answerOf, buildRequestFile, existingEvidenceIds, fileSafe, incomingFromFile, openItemsOf } from "@/lib/accreditation/team";
import { cn, foldTr, formatBytes, formatTrDate, todayIso, toIsoDate, uid } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { readBlob } from "@/lib/cryptoVault";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { removeAttachment as deleteStoredFile, storeAttachment } from "@/services/accreditationService";
import { SourceLink } from "./EvidenceItem";
import type { AccreditationApi } from "./useAccreditation";

const MAX_SUBMISSION_BYTES = 200 * 1024 * 1024;

const downloadJson = (obj: unknown, name: string) => saveAs(new Blob([JSON.stringify(obj)], { type: "application/json" }), name);

function VerificationCode({ code, className }: { code: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11.5px] tracking-wider text-zinc-800", className)} title="Doğrulama kodu: talep dosyasındaki açık anahtarın parmak izi. İki tarafta aynı olmalıdır.">
      <ShieldCheck className="h-3 w-3 text-brand-700" />
      {code}
    </span>
  );
}

function mailText(req: EvidenceRequest, fw: ActiveFramework, coordinator: string) {
  const app = typeof window !== "undefined" ? `${window.location.origin}/app` : "";
  const subject = `${fw.snapshot.code} kanıt talebi — ${req.recipient}${req.due ? ` (son tarih ${formatTrDate(req.due)})` : ""}`;
  const body = [
    `Sayın ${req.recipient},`,
    "",
    `${fw.snapshot.code} akreditasyonu (${fw.scopeLabel}) için sizden ${req.items.length} kanıt istiyoruz.${req.due ? ` Son tarih: ${formatTrDate(req.due)}.` : ""}`,
    ...(req.message ? ["", req.message] : []),
    "",
    "1. Ekteki .akredite-talep dosyasını kaydedin.",
    `2. ${app} adresini açın → Kanıt merkezi → “Bana gelen talepler” → “Talep dosyasını aç”.`,
    "3. Her kaleme dosyalarınızı ekleyin, “Teslim paketini oluştur” ile .akredite-teslim dosyasını indirip bu e-postaya yanıt olarak gönderin.",
    "",
    `Doğrulama kodu: ${req.fingerprint} (talebi açtığınızda aynı kod görünmelidir).`,
    "Dosyalarınız tarayıcınızda şifrelenir; teslim paketini yalnızca bu talebi oluşturan kişi açabilir.",
    "",
    coordinator,
  ].join("\n");
  return { subject, body };
}

// ---------------------------------------------------------------------------
// Koordinatör: talep oluştur
// ---------------------------------------------------------------------------

/** recipient: null = kapalı, "" = serbest alıcı, "Ad" = o kişiye atanmış açık kalemlerle */
export function RequestDialog({ fw, api, recipient, onClose }: { fw: ActiveFramework; api: AccreditationApi; recipient: string | null; onClose: () => void }) {
  const open = recipient !== null;
  return open ? <RequestDialogBody fw={fw} api={api} initialRecipient={recipient!} onClose={onClose} /> : null;
}

function RequestDialogBody({ fw, api, initialRecipient, onClose }: { fw: ActiveFramework; api: AccreditationApi; initialRecipient: string; onClose: () => void }) {
  const data = useData();
  const ws = api.ws;
  const [name, setName] = React.useState(initialRecipient);
  const [picked, setPicked] = React.useState<string[]>(() => (initialRecipient ? openItemsOf(ws, fw, initialRecipient) : []));
  const [due, setDue] = React.useState(() => {
    const latest = picked.map((id) => ws.records[recKey(fw.slug, id)]?.due).filter(Boolean).sort().pop();
    return latest ?? toIsoDate(new Date(Date.now() + 14 * 86400000));
  });
  const [message, setMessage] = React.useState("");
  const [coordinator, setCoordinator] = React.useState(ws.profileName || data.institution.headOfDepartment || "Kalite Komisyonu");
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [created, setCreated] = React.useState<EvidenceRequest | null>(null);
  const fq = foldTr(q.trim());
  const all = fw.snapshot.criteria.flatMap((c) => criterionEvidence(ws, fw, c).map((e) => ({ c, e, r: ws.records[recKey(fw.slug, e.id)] })));
  const list = all.filter(({ c, e, r }) => picked.includes(e.id) || !fq || foldTr(`${c.id} ${c.title} ${e.sub ?? ""} ${e.title} ${r?.owner ?? ""}`).includes(fq)).slice(0, 120);

  const create = async () => {
    setBusy(true);
    try {
      const keys = await createRequestKeys();
      const base = { id: uid("talep"), createdAt: new Date().toISOString(), recipient: name.trim(), message: message.trim() || undefined, due: due || undefined, items: picked, publicJwk: keys.publicJwk };
      const file = await buildRequestFile(base, fw, ws, { coordinator: coordinator.trim(), institution: data.institution.university });
      const req: EvidenceRequest = { ...base, slug: fw.slug, privateJwk: keys.privateJwk, fingerprint: file.fingerprint, file, submissions: [] };
      api.addRequest(req);
      if (coordinator.trim() && coordinator.trim() !== ws.profileName) api.setProfileName(coordinator.trim());
      // Talep edilen kalemlerde sorumlu boşsa alıcıyı sorumlu yap
      picked.forEach((id) => !ws.records[recKey(fw.slug, id)]?.owner && api.patchRecord(fw.slug, id, { owner: req.recipient, ...(req.due ? { due: req.due } : {}) }));
      downloadJson(file, `${fileSafe(req.recipient)}_${fileSafe(fw.snapshot.code)}_Kanit_Talebi.akredite-talep`);
      setCreated(req);
    } catch (e) {
      toast.error("Talep oluşturulamadı", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const m = mailText(created, fw, coordinator);
    return (
      <Dialog
        open
        onClose={onClose}
        title="Talep dosyası indirildi"
        description="Dosyayı e-postayla, kurum içi paylaşım klasörüyle veya USB ile iletin. Teslim paketini yalnızca bu kasa açabilir."
        footer={<Button onClick={onClose}>Tamam</Button>}
      >
        <div className="space-y-3 text-[13px] text-zinc-700">
          <p>
            Doğrulama kodu: <VerificationCode code={created.fingerprint} />
          </p>
          <p className="text-[12px] text-zinc-500">Alıcı talebi açtığında aynı kodu görmelidir. Kodu telefonla veya ayrı bir kanaldan teyit etmek, dosyanın yolda değiştirilmediğini garanti eder.</p>
          <Field label="E-posta metni">
            <Textarea readOnly value={`${m.subject}\n\n${m.body}`} className="min-h-[180px] font-mono text-[11.5px]" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(`${m.subject}\n\n${m.body}`);
                toast.success("E-posta metni kopyalandı");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Metni kopyala
            </Button>
            <a
              href={`mailto:?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              <Mail className="h-3.5 w-3.5" /> E-posta uygulamasında aç
            </a>
          </div>
          <p className="text-[11.5px] text-zinc-500">E-posta uygulaması açıldığında indirilen .akredite-talep dosyasını eklemeyi unutmayın.</p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Kanıt talebi oluştur"
      description="Seçtiğiniz kalemler için bir talep dosyası üretilir. Dosya yalnızca kalem başlıklarını ve bu talebe özel açık anahtarı içerir; kasanızdan başka bir bilgi çıkmaz."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant="success" disabled={busy || !name.trim() || !picked.length || !coordinator.trim()} onClick={create}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} {picked.length} kalemle talep dosyası indir
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kime">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. Öğr. Gör. Burak ŞAHİN" autoFocus={!initialRecipient} />
        </Field>
        <Field label="Talep eden (sizin adınız / birim)">
          <Input value={coordinator} onChange={(e) => setCoordinator(e.target.value)} />
        </Field>
        <Field label="Son tarih">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Mesaj (isteğe bağlı)">
          <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ör. Son iki yılın belgelerini ekleyiniz." />
        </Field>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-medium text-zinc-600">İstenecek kanıtlar ({picked.length})</span>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kanıt veya sorumlu ara" className="h-8 pl-8 text-[12px]" aria-label="Talep için kanıt ara" />
          </div>
        </div>
        <ul className="max-h-[40vh] divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200/80">
          {list.map(({ c, e, r }) => (
            <li key={e.id} className="px-3 py-2">
              <Checkbox
                checked={picked.includes(e.id)}
                onChange={(v) => setPicked((p) => (v ? [...p, e.id] : p.filter((x) => x !== e.id)))}
                label={
                  <span className="text-[12.5px]">
                    <span className="font-mono text-[10.5px] text-zinc-500">{e.sub ?? c.id}</span> {e.title}
                    {r?.owner && <span className="ml-1 text-[11px] text-zinc-400">· {r.owner}</span>}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Koordinatör: gönderilen talepler + teslim alma
// ---------------------------------------------------------------------------

export function TeamCoordinator({ fw, api }: { fw: ActiveFramework; api: AccreditationApi }) {
  const data = useData();
  const key = useVault((s) => s.key);
  const ws = api.ws;
  const [newOpen, setNewOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<{ req: EvidenceRequest; payload: SubmissionPayload } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const requests = ws.requests.filter((r) => r.slug === fw.slug);
  const coordinator = ws.profileName || data.institution.headOfDepartment || "Kalite Komisyonu";

  const onFile = async (f: File) => {
    try {
      const sub = parseSubmissionFile(await f.text());
      const req = ws.requests.find((r) => r.id === sub.requestId);
      if (!req) throw new Error("Bu teslim paketi bu kasada oluşturulmuş bir talebe ait değil.");
      const payload = await openSubmission(sub, req);
      if (req.submissions.some((s) => s.id === payload.submissionId)) throw new Error("Bu teslim paketi daha önce içe aktarıldı.");
      if (req.slug !== fw.slug) api.setCurrent(req.slug);
      setPreview({ req, payload });
    } catch (e) {
      toast.error("Teslim paketi açılamadı", e instanceof Error ? e.message : String(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const importPayload = async () => {
    if (!preview || !key) return;
    setBusy(true);
    const { req, payload } = preview;
    const target = ws.active.find((a) => a.slug === req.slug);
    const written: EvidenceAttachment[] = [];
    try {
      if (!target) throw new Error("Bu talebin akreditasyon çalışma alanı kaldırılmış.");
      const items = acceptedItems(req, payload, existingEvidenceIds(ws, target));
      // Önce bütün dosyalar şifrelenip yazılır; biri başarısız olursa yazılanlar silinir ve hiçbir kayıt değişmez
      const entries = [];
      for (const it of items) {
        const files = [];
        for (const f of it.files) {
          const bytes = fromBase64(f.data);
          const a = await storeAttachment(key, { name: f.name, type: f.mime, data: bytes.buffer }, "team", { period: f.period, submittedBy: payload.respondent, addedAt: f.addedAt });
          written.push(a);
          files.push(a);
        }
        const note = it.note?.trim() ? `[${payload.respondent}, ${formatTrDate(payload.submittedAt.slice(0, 10))}] ${it.note.trim()}` : undefined;
        entries.push({ evidenceId: it.evidenceId, files, note });
      }
      const files = entries.reduce((n, e) => n + e.files.length, 0);
      api.importSubmission(req.slug, req.id, entries, { id: payload.submissionId, receivedAt: new Date().toISOString(), submittedAt: payload.submittedAt, respondent: payload.respondent, files, items: entries.length });
      toast.success(`${payload.respondent}: ${files} dosya ${entries.length} kanıta eklendi`, "Dosyalar kasanızda yeniden şifrelendi.");
      setPreview(null);
    } catch (e) {
      await Promise.all(written.map((a) => deleteStoredFile(a).catch(() => undefined)));
      toast.error("İçe aktarılamadı", `${e instanceof Error ? e.message : String(e)} Hiçbir kanıt değiştirilmedi.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader
          icon={<Send />}
          title="Gönderilen kanıt talepleri"
          description="Her talep, yalnızca bu kasanın açabileceği şifreli teslim paketleri için özel bir anahtar taşır."
          actions={
            <>
              <input ref={fileRef} type="file" accept=".akredite-teslim,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Teslim paketini al
              </Button>
              <Button size="sm" onClick={() => setNewOpen(true)}>
                <Send className="h-3.5 w-3.5" /> Yeni talep
              </Button>
            </>
          }
        />
        {requests.length ? (
          <ul className="divide-y divide-zinc-100">
            {requests.map((r) => {
              const last = r.submissions[r.submissions.length - 1];
              const late = !last && !!r.due && r.due < todayIso();
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="text-[13px] font-medium text-zinc-900">{r.recipient}</div>
                    <div className="mt-0.5 text-[11.5px] text-zinc-500">
                      {r.items.length} kanıt · gönderildi {formatTrDate(r.createdAt.slice(0, 10))}
                      {r.due && <span className={cn(late && "font-medium text-red-700")}> · son {formatTrDate(r.due)}</span>}
                    </div>
                  </div>
                  {last ? (
                    <Badge tone="emerald">
                      {r.submissions.length} teslim · son {formatTrDate(last.receivedAt.slice(0, 10))}
                    </Badge>
                  ) : (
                    <Badge tone={late ? "red" : "amber"}>{late ? "Gecikti" : "Bekleniyor"}</Badge>
                  )}
                  <VerificationCode code={r.fingerprint} />
                  <div className="flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Talep dosyasını yeniden indir"
                      title="Talep dosyasını yeniden indir"
                      onClick={() => downloadJson(r.file, `${fileSafe(r.recipient)}_${fileSafe(fw.snapshot.code)}_Kanit_Talebi.akredite-talep`)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="E-posta metnini kopyala"
                      title="E-posta metnini kopyala"
                      onClick={() => {
                        const m = mailText(r, fw, coordinator);
                        void navigator.clipboard?.writeText(`${m.subject}\n\n${m.body}`);
                        toast.success("E-posta metni kopyalandı");
                      }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Talebi sil"
                      onClick={async () => {
                        if (
                          await confirmDialog({
                            title: "Talep silinsin mi?",
                            message: "Bu talebin özel anahtarı silinir; bu talebe ait teslim paketleri artık açılamaz. Daha önce içe aktarılmış dosyalar kanıtlarda kalır.",
                            destructive: true,
                            confirmLabel: "Sil",
                          })
                        )
                          api.removeRequest(r.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <CardBody>
            <p className="text-sm text-zinc-500">Henüz talep yok. “Yeni talep” ile ya da Görevler sekmesinde bir sorumlunun yanındaki “Kanıt talebi gönder” ile başlayın.</p>
          </CardBody>
        )}
      </Card>
      <Card>
        <CardHeader icon={<KeyRound />} title="Nasıl çalışır?" />
        <CardBody>
          <ol className="list-decimal space-y-2 pl-4 text-[12.5px] leading-relaxed text-zinc-600">
            <li>Talep dosyası (.akredite-talep) yalnızca istenen kalemlerin başlıklarını ve bu talebe özel açık anahtarı içerir.</li>
            <li>Öğretim elemanı dosyayı kendi tarayıcısında açar, belgelerini ekler ve teslim paketini (.akredite-teslim) indirir.</li>
            <li>Paket ECDH P-256 + AES-256-GCM ile şifrelenir; yalnızca bu kasa açabilir. E-postayla göndermek güvenlidir.</li>
            <li>İçe aktarırken her dosyanın SHA-256 özeti doğrulanır, aynı paket ikinci kez alınmaz ve dosyalar yalnızca talep edilen kanıtlara eklenir.</li>
          </ol>
          <p className="mt-3 text-[11.5px] text-zinc-500">Sunucu yoktur; dosyalar sizin seçtiğiniz kanaldan taşınır. Doğrulama kodu iki tarafta aynı olmalıdır.</p>
        </CardBody>
      </Card>

      {newOpen && <RequestDialog fw={fw} api={api} recipient="" onClose={() => setNewOpen(false)} />}
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview ? `${preview.payload.respondent} — teslim paketi` : ""}
        description={preview ? `Gönderim: ${new Date(preview.payload.submittedAt).toLocaleString("tr-TR")} · talep: ${preview.req.recipient} · bütünlük özetleri doğrulandı` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Vazgeç
            </Button>
            <Button variant="success" disabled={busy} onClick={importPayload}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kanıtlara ekle
            </Button>
          </>
        }
      >
        {preview && <SubmissionPreview fw={fw} api={api} req={preview.req} payload={preview.payload} />}
      </Dialog>
    </div>
  );
}

function SubmissionPreview({ api, req, payload }: { fw: ActiveFramework; api: AccreditationApi; req: EvidenceRequest; payload: SubmissionPayload }) {
  const target = api.ws.active.find((a) => a.slug === req.slug);
  const existing = target ? existingEvidenceIds(api.ws, target) : new Set<string>();
  const titles = new Map(target ? target.snapshot.criteria.flatMap((c) => criterionEvidence(api.ws, target, c).map((e) => [e.id, e.title] as const)) : []);
  const accepted = acceptedItems(req, payload, existing);
  const rejected = payload.items.length - accepted.length;
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[11.5px] leading-relaxed text-zinc-600">
        Teslim eden: <b>{payload.respondent || "—"}</b> (beyan). Paket bu talebin anahtarıyla açıldı ve her dosyanın özeti doğrulandı; teslim edenin kimliği ise talep dosyasının kime iletildiğine dayanır.
      </p>
      {accepted.map((it) => (
        <div key={it.evidenceId} className="rounded-lg border border-zinc-200/80 px-3 py-2">
          <div className="text-[12.5px] font-medium text-zinc-900">{titles.get(it.evidenceId) ?? it.evidenceId}</div>
          {it.note && <p className="mt-1 text-[12px] text-zinc-600">“{it.note}”</p>}
          <ul className="mt-1 space-y-0.5">
            {it.files.map((f) => (
              <li key={f.sha256 + f.name} className="flex items-center gap-2 text-[11.5px] text-zinc-600">
                <Paperclip className="h-3 w-3 text-zinc-400" /> {f.name} <span className="font-mono text-[10.5px] text-zinc-400">{formatBytes(f.size)} · {f.period ?? "dönem yok"}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!accepted.length && <p className="text-sm text-zinc-500">Pakette eklenecek dosya veya not yok.</p>}
      {rejected > 0 && <p className="text-[11.5px] text-amber-800">{rejected} kalem alınmayacak (talepte yok, kaldırılmış ya da boş).</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Öğretim elemanı: gelen talepler
// ---------------------------------------------------------------------------

export function TeamInbox({ api }: { api: AccreditationApi }) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const ws = api.ws;
  const onFile = async (f: File) => {
    try {
      const file = await parseRequestFile(await f.text());
      if (ws.requests.some((r) => r.id === file.id)) throw new Error("Bu talebi bu kasada siz oluşturdunuz; öğretim elemanının kendi tarayıcısında açılmalıdır.");
      const existing = ws.inbox.find((r) => r.id === file.id);
      if (existing) {
        toast.info("Bu talep zaten açık", `${file.coordinator} · ${file.items.length} kanıt`);
        return;
      }
      api.addIncoming(incomingFromFile(file, new Date().toISOString()));
      toast.success(`${file.coordinator} talebi açıldı`, `Doğrulama kodu ${file.fingerprint}`);
    } catch (e) {
      toast.error("Talep dosyası açılamadı", e instanceof Error ? e.message : String(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<Inbox />}
          title="Bana gelen kanıt talepleri"
          description="Kalite komisyonundan gelen .akredite-talep dosyasını açın, istenen belgeleri ekleyin ve şifreli teslim paketini geri gönderin. Dosyalarınız bu tarayıcıda şifreli tutulur."
          actions={
            <>
              <input ref={fileRef} type="file" accept=".akredite-talep,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Talep dosyasını aç
              </Button>
            </>
          }
        />
        {!ws.inbox.length && (
          <CardBody>
            <p className="text-sm text-zinc-500">Henüz açılmış talep yok.</p>
          </CardBody>
        )}
      </Card>
      {ws.inbox.map((r) => (
        <IncomingCard key={r.id} req={r} api={api} />
      ))}
    </div>
  );
}

function IncomingCard({ req, api }: { req: IncomingRequest; api: AccreditationApi }) {
  const data = useData();
  const key = useVault((s) => s.key);
  const [name, setName] = React.useState(api.ws.profileName || req.recipient);
  const [busy, setBusy] = React.useState<string | null>(null);
  const period = data.institution.academicYear;
  const filled = req.items.filter((it) => (answerOf(req, it.evidenceId)?.attachments.length ?? 0) > 0 || !!answerOf(req, it.evidenceId)?.note?.trim()).length;
  const totalBytes = req.items.reduce((s, it) => s + (answerOf(req, it.evidenceId)?.attachments ?? []).reduce((t, f) => t + f.size, 0), 0);
  const late = !!req.due && req.due < todayIso();

  const addFiles = async (evidenceId: string, files: FileList) => {
    if (!key) return;
    setBusy(evidenceId);
    try {
      const stored = [];
      for (const f of Array.from(files)) stored.push(await storeAttachment(key, { name: f.name, type: f.type, data: await f.arrayBuffer() }, "upload", { period }));
      api.appendIncomingFiles(req.id, evidenceId, stored);
    } catch (e) {
      toast.error("Dosya eklenemedi", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (!key) return;
    if (totalBytes > MAX_SUBMISSION_BYTES) {
      toast.error("Teslim paketi çok büyük", `Toplam ${formatBytes(totalBytes)}; 200 MB altına indirin veya paketi bölerek gönderin.`);
      return;
    }
    setBusy("submit");
    try {
      const items: SubmissionPayload["items"] = [];
      for (const it of req.items) {
        const ans = answerOf(req, it.evidenceId);
        if (!ans || (!ans.attachments.length && !ans.note?.trim())) continue;
        const files = [];
        for (const a of ans.attachments) {
          const bytes = await readBlob(key, a.id);
          if (!bytes) throw new Error(`“${a.name}” kasada bulunamadı.`);
          files.push({ name: a.name, mime: a.mime, size: a.size, sha256: a.sha256, addedAt: a.addedAt, ...(a.period ? { period: a.period } : {}), data: toBase64(new Uint8Array(bytes)) });
        }
        items.push({ evidenceId: it.evidenceId, ...(ans.note?.trim() ? { note: ans.note.trim() } : {}), files });
      }
      const payload: SubmissionPayload = { submissionId: uid("teslim"), requestId: req.id, respondent: name.trim(), submittedAt: new Date().toISOString(), items };
      const sealed = await sealSubmission(req, payload);
      downloadJson(sealed, `${fileSafe(name)}_${fileSafe(req.frameworkCode)}_Kanit_Teslimi.akredite-teslim`);
      if (name.trim() !== api.ws.profileName) api.setProfileName(name.trim());
      api.markSubmitted(req.id);
      toast.success("Teslim paketi indirildi", `${req.coordinator} kişisine gönderin. Paketi yalnızca o açabilir.`);
    } catch (e) {
      toast.error("Teslim paketi oluşturulamadı", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const groups = Array.from(new Set(req.items.map((i) => i.criterionId)));
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-zinc-950">{req.frameworkCode}</span>
            <span className="text-[13px] text-zinc-600">· {req.scopeLabel}</span>
            {req.submissions.length > 0 && <Badge tone="emerald">{req.submissions.length} kez teslim edildi</Badge>}
          </div>
          <div className="mt-1 text-[12px] text-zinc-500">
            Kime: {req.recipient} · gönderen: {req.coordinator} · {req.institution} · {req.items.length} kanıt · açıldı {formatTrDate(req.receivedAt.slice(0, 10))}
            {req.due && <span className={cn(late && "font-medium text-red-700")}> · son tarih {formatTrDate(req.due)}</span>}
          </div>
          {req.message && <p className="mt-1.5 text-[12.5px] text-zinc-700">“{req.message}”</p>}
        </div>
        <div className="text-right">
          <div className="text-[10.5px] text-zinc-500">Doğrulama kodu</div>
          <VerificationCode code={req.fingerprint} />
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {groups.map((g) => (
          <section key={g}>
            <h3 className="mb-1.5 text-[12px] font-semibold text-zinc-700">
              {g} · {req.items.find((i) => i.criterionId === g)?.criterionTitle}
            </h3>
            <ul className="space-y-2">
              {req.items
                .filter((i) => i.criterionId === g)
                .map((it) => {
                  const ans = answerOf(req, it.evidenceId);
                  return (
                    <li key={it.evidenceId} className="rounded-lg border border-zinc-200/80 px-3 py-2.5">
                      <div className="text-[13px] text-zinc-900">
                        {it.sub && <span className="mr-1 font-mono text-[10.5px] text-zinc-500">{it.sub}</span>}
                        {it.title}
                      </div>
                      {it.source && <SourceLink source={it.source} className="mt-0.5 text-[10.5px]" />}
                      {ans?.attachments.length ? (
                        <ul className="mt-2 space-y-1">
                          {ans.attachments.map((a) => (
                            <li key={a.id} className="flex items-center gap-2 text-[12px] text-zinc-700">
                              <Paperclip className="h-3 w-3 text-zinc-400" />
                              <span className="min-w-0 flex-1 truncate">{a.name}</span>
                              <span className="font-mono text-[10.5px] text-zinc-400">{formatBytes(a.size)}</span>
                              <Button size="icon" variant="ghost" aria-label="Dosyayı kaldır" disabled={!!busy} onClick={() => api.removeIncomingFile(req.id, it.evidenceId, a)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50", busy && "pointer-events-none opacity-60")}>
                          {busy === it.evidenceId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Dosya ekle
                          <input type="file" multiple className="hidden" aria-label={`${it.title} için dosya`} onChange={(e) => e.target.files?.length && addFiles(it.evidenceId, e.target.files)} />
                        </label>
                        <Input
                          key={ans?.note ?? ""}
                          defaultValue={ans?.note ?? ""}
                          placeholder="Not (isteğe bağlı)"
                          aria-label={`${it.title} için not`}
                          className="h-8 min-w-0 flex-1"
                          onBlur={(e) => e.target.value !== (ans?.note ?? "") && api.patchAnswer(req.id, it.evidenceId, { note: e.target.value })}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-zinc-100 px-5 py-3">
        <Field label="Adınız (teslimde görünür)" className="w-72">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-zinc-500">
            {filled}/{req.items.length} kalem dolu · {formatBytes(totalBytes)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-700 hover:bg-red-50"
            onClick={async () => {
              if (await confirmDialog({ title: "Talep silinsin mi?", message: "Bu talep için eklediğiniz dosyalar bu tarayıcıdan silinir.", destructive: true, confirmLabel: "Sil" })) await api.removeIncoming(req.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Talebi sil
          </Button>
          <Button variant="success" disabled={!filled || !name.trim() || !!busy} onClick={submit}>
            {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Teslim paketini oluştur
          </Button>
        </div>
      </div>
      <p className="px-5 pb-3 text-[11px] text-zinc-400">
        Paket {BRAND.name} içinde ECDH P-256 + AES-256-GCM ile şifrelenir; yalnızca {req.coordinator} açabilir.
      </p>
    </Card>
  );
}
