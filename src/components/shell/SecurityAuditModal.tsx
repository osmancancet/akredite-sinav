"use client";

import * as React from "react";
import { Binary, CheckCircle2, FileDown, Globe2, Plane, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import {
  bytesToBase64,
  bytesToHex,
  decryptBytes,
  encryptBytes,
  generateDeviceKey,
  getKeyringMeta,
  KDF_ITERATIONS,
  listEncryptedRecords,
  type EncryptedRecord,
  type KeyringMeta,
} from "@/lib/cryptoVault";
import { getNetworkEvents, subscribeNetwork, clearNetworkEvents, type NetworkEvent } from "@/lib/networkAudit";
import { useVault } from "@/lib/store";
import { useOnline } from "@/hooks/useOnline";
import { CSP } from "@/lib/csp";
import type { CollectionKey } from "@/lib/types";
import { buildDocument, letterhead, para, saveDocx, sectionTitle, simpleTable, infoTable } from "@/services/docxCommon";
import { cn, todayIso, fixed } from "@/lib/utils";

const LABELS: Partial<Record<CollectionKey, string>> = {
  institution: "Kurum Anteti",
  exams: "Sınavlar & Sorular",
  courses: "Dersler & ÖÇ",
  students: "Öğrenci Listeleri (KVKK)",
  grades: "Not Çizelgeleri",
  invigilators: "Gözetmenler",
  schedule: "Sınav Programı",
  seating: "Oturma Planları",
  rubrics: "Rubrikler",
  ai: "AI Anahtarları",
  rooms: "Derslikler",
  programOutcomes: "Program Çıktıları",
  ui: "Arayüz Durumu",
};

export function SecurityAuditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = React.useState<"cipher" | "network" | "offline">("cipher");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Güvenliği Kanıtla — Zero-Knowledge Denetçisi"
      description="Şüpheci akademisyen için 3 canlı kanıt: şifreli veri, sıfır ağ çıkışı ve çevrimdışı çalışma."
      icon={<ShieldCheck className="h-6 w-6 text-emerald-600" />}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "cipher", label: "1 · Canlı Şifreli Veri", icon: <Binary className="h-3.5 w-3.5" /> },
          { value: "network", label: "2 · Sıfır Ağ Çıkışı", icon: <Globe2 className="h-3.5 w-3.5" /> },
          { value: "offline", label: "3 · Uçak Modu Testi", icon: <Plane className="h-3.5 w-3.5" /> },
        ]}
      />
      <div className="mt-4">
        {open && tab === "cipher" && <CipherInspector />}
        {open && tab === "network" && <NetworkProof />}
        {open && tab === "offline" && <OfflineProof />}
      </div>
    </Dialog>
  );
}

function useRecords() {
  const writeCount = useVault((s) => s.writeCount);
  const [records, setRecords] = React.useState<EncryptedRecord[]>([]);
  const [meta, setMeta] = React.useState<KeyringMeta | undefined>();
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const [r, m] = await Promise.all([listEncryptedRecords(), getKeyringMeta()]);
      if (!alive) return;
      setRecords(r.sort((a, b) => a.key.localeCompare(b.key)));
      setMeta(m);
    })();
    return () => {
      alive = false;
    };
  }, [writeCount, tick]);
  return { records, meta, refresh: () => setTick((t) => t + 1) };
}

function CipherInspector() {
  const { records, meta, refresh } = useRecords();
  const data = useVault((s) => s.data);
  const key = useVault((s) => s.key);
  const [selected, setSelected] = React.useState<CollectionKey>("exams");
  const [tamper, setTamper] = React.useState<null | { iv: string; ct: string; ok: boolean; tampered: boolean }>(null);
  const rec = records.find((r) => r.key === selected);
  const plain = data ? JSON.stringify(data[selected], null, 1) : "";
  const totalBytes = records.reduce((s, r) => s + r.byteLength, 0);

  const runTamperTest = async () => {
    const k = await generateDeviceKey();
    const msg = new TextEncoder().encode("S1) Aşağıdakilerden hangisi bir VTYS işlevi değildir?");
    const { iv, ciphertext } = await encryptBytes(k, msg, "test");
    const roundtrip = new TextDecoder().decode(await decryptBytes(k, iv, ciphertext, "test"));
    const bad = new Uint8Array(ciphertext.slice(0));
    bad[3] ^= 0x01;
    let tampered = false;
    try {
      await decryptBytes(k, iv, bad.buffer, "test");
    } catch {
      tampered = true;
    }
    setTamper({ iv: bytesToHex(iv), ct: bytesToBase64(ciphertext), ok: roundtrip.startsWith("S1)"), tampered });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Proof ok label="Algoritma" value="AES-256-GCM (128-bit etiket)" />
        <Proof ok label="Anahtar türetme" value={`PBKDF2-SHA256 · ${KDF_ITERATIONS.toLocaleString("tr-TR")} it.`} />
        <Proof ok label="Anahtar modu" value={meta?.mode === "password" ? "Master parola (yalnız bellekte)" : "Cihaz anahtarı (dışa aktarılamaz)"} />
        <Proof ok={key ? !key.extractable : true} label="CryptoKey.extractable" value={key ? String(key.extractable) : "—"} />
      </div>

      <div className="rounded-xl border border-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5">
          <div className="text-sm font-medium">IndexedDB → AkrediteSinavVault.records (diskte duran gerçek veri)</div>
          <div className="flex items-center gap-2">
            <Badge tone="emerald">{records.length} şifreli kayıt · {fixed((totalBytes / 1024), 1)} KB</Badge>
            <Button size="sm" variant="outline" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" /> Yenile
            </Button>
          </div>
        </div>
        <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
          <div className="max-h-72 overflow-y-auto border-r border-zinc-100 p-2 scrollbar-thin">
            {records.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelected(r.key)}
                className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs cursor-pointer", selected === r.key ? "bg-brand-50 text-brand-800" : "hover:bg-zinc-50")}
              >
                <span>{LABELS[r.key] ?? r.key}</span>
                <span className="tabular-nums text-zinc-400">{fixed((r.byteLength / 1024), 1)}K</span>
              </button>
            ))}
          </div>
          <div className="grid min-w-0 gap-3 p-3 md:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-red-700">
                <XCircle className="h-3.5 w-3.5" /> Bellekteki açık metin (yalnızca bu sekmede)
              </div>
              <pre className="theme-invariant h-56 overflow-auto rounded-lg bg-zinc-900 p-2 text-[10.5px] leading-snug text-zinc-200 scrollbar-thin">{plain.slice(0, 2500)}</pre>
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Diskteki şifreli hal (Base64)
              </div>
              <pre className="theme-invariant h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-emerald-950 p-2 font-mono text-[10.5px] leading-snug text-emerald-300 scrollbar-thin">
                {rec ? bytesToBase64(rec.ciphertext).slice(0, 2500) : "Kayıt bulunamadı"}
              </pre>
              {rec && (
                <div className="mt-1 text-[10.5px] text-zinc-500">
                  IV (12 byte): <span className="font-mono">{bytesToHex(rec.iv)}</span> · AAD: <span className="font-mono">{rec.key}</span> · {new Date(rec.updatedAt).toLocaleString("tr-TR")}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-2 text-xs">
          <span className="text-zinc-500">Görüntülenecek koleksiyon:</span>
          <Select className="h-8 w-56" value={selected} onChange={(e) => setSelected(e.target.value as CollectionKey)}>
            {records.map((r) => (
              <option key={r.key} value={r.key}>
                {LABELS[r.key] ?? r.key}
              </option>
            ))}
          </Select>
          <span className="text-zinc-400">Bir soruyu düzenleyin — şifreli metin her yazımda yeni IV ile tamamen değişir.</span>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Canlı Bütünlük (Tamper) Testi</div>
            <div className="text-xs text-zinc-500">Bir soru metnini şifreler, tek bit değiştirir ve GCM etiketinin değişikliği reddettiğini gösterir.</div>
          </div>
          <Button size="sm" onClick={runTamperTest}>Testi Çalıştır</Button>
        </div>
        {tamper && (
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <Proof ok={tamper.ok} label="Şifrele → Çöz" value={tamper.ok ? "Başarılı (aynı metin)" : "Hata"} />
            <Proof ok={tamper.tampered} label="1 bit değiştirilmiş veri" value={tamper.tampered ? "REDDEDİLDİ (OperationError)" : "Kabul edildi!"} />
            <div className="rounded-lg bg-zinc-50 p-2 font-mono text-[10px] break-all text-zinc-600">IV {tamper.iv}<br />{tamper.ct.slice(0, 120)}…</div>
          </div>
        )}
      </div>
    </div>
  );
}

function useNetworkEvents(): NetworkEvent[] {
  const [events, setEvents] = React.useState<NetworkEvent[]>(() => getNetworkEvents());
  React.useEffect(() => subscribeNetwork(() => setEvents(getNetworkEvents())), []);
  return events;
}

function NetworkProof() {
  const events = useNetworkEvents();
  const external = events.filter((e) => e.category === "external");
  const ai = events.filter((e) => e.category === "ai");
  const local = events.filter((e) => e.category === "local");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Proof ok={external.length === 0} label="Harici sunuculara istek" value={`${external.length} istek`} big />
        <Proof ok label="Kullanıcı başlatmalı BYOK AI çağrısı" value={`${ai.length} istek (yalnızca siz tetiklerseniz)`} />
        <Proof ok label="Yerel uygulama dosyası" value={`${local.length} kaynak (aynı köken)`} />
      </div>
      <div className="rounded-xl border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 text-sm font-medium">
          Canlı ağ günlüğü (fetch · XHR · sendBeacon · WebSocket · PerformanceObserver)
          <Button size="sm" variant="ghost" onClick={clearNetworkEvents}>Temizle</Button>
        </div>
        <div className="max-h-64 overflow-y-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-3 py-1.5">Saat</th>
                <th className="px-3 py-1.5">Tür</th>
                <th className="px-3 py-1.5">Hedef</th>
                <th className="px-3 py-1.5">Sınıf</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().map((e) => (
                <tr key={e.id} className="border-t border-zinc-100">
                  <td className="px-3 py-1 tabular-nums text-zinc-500">{new Date(e.time).toLocaleTimeString("tr-TR")}</td>
                  <td className="px-3 py-1">{e.kind}</td>
                  <td className="max-w-md truncate px-3 py-1 font-mono text-[10.5px]">{shortUrl(e.url)}</td>
                  <td className="px-3 py-1">
                    {e.category === "local" && <Badge tone="emerald">Yerel</Badge>}
                    {e.category === "ai" && <Badge tone="brand">BYOK AI</Badge>}
                    {e.category === "external" && <Badge tone="red">Harici</Badge>}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">Henüz hiçbir ağ olayı yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 p-4">
        <div className="text-sm font-medium">Tarayıcı seviyesinde kilit: Content-Security-Policy</div>
        <p className="mt-1 text-xs text-zinc-500">
          Uygulama kodu bile izin verilmeyen bir adrese istek atmaya çalışsa tarayıcı bunu engeller. connect-src yalnızca uygulamanın kendisini ve sizin seçtiğiniz AI sağlayıcılarını içerir.
        </p>
        <pre className="theme-invariant mt-2 whitespace-pre-wrap break-all rounded-lg bg-zinc-900 p-3 font-mono text-[10.5px] text-zinc-200">{CSP.split("; ").join(";\n")}</pre>
      </div>
    </div>
  );
}

function shortUrl(u: string) {
  try {
    const url = new URL(u, window.location.href);
    if (url.origin === window.location.origin) return url.pathname + (url.search ? url.search.slice(0, 30) : "");
    return url.host + url.pathname;
  } catch {
    return u.slice(0, 80);
  }
}

function OfflineProof() {
  const online = useOnline();
  const events = useNetworkEvents();
  const data = useVault((s) => s.data);
  const [busy, setBusy] = React.useState(false);

  const generate = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const records = await listEncryptedRecords();
      const meta = await getKeyringMeta();
      const doc = buildDocument("Zero-Knowledge Güvenlik Denetim Kanıt Raporu", [
        {
          footer: "AkrediteSınav — Güvenlik Denetim Kanıtı",
          children: [
            ...letterhead(data.institution, "Zero-Knowledge Güvenlik Denetim Kanıt Raporu", `Rapor tarihi: ${new Date().toLocaleString("tr-TR")}`),
            infoTable([
              ["Şifreleme", "AES-256-GCM, 12 byte rastgele IV, 128-bit doğrulama etiketi"],
              ["Anahtar türetme", `PBKDF2 / SHA-256 / ${KDF_ITERATIONS.toLocaleString("tr-TR")} iterasyon / 16 byte salt`],
              ["Anahtar modu", meta?.mode === "password" ? "Master parola (anahtar yalnızca bellekte)" : "Dışa aktarılamaz cihaz anahtarı"],
              ["Ağ durumu (rapor anı)", online ? "Çevrimiçi" : "ÇEVRİMDIŞI — rapor ağ bağlantısı olmadan üretildi"],
              ["Harici istek sayısı", String(events.filter((e) => e.category === "external").length)],
              ["BYOK AI istek sayısı", String(events.filter((e) => e.category === "ai").length)],
            ], undefined, 1),
            sectionTitle("IndexedDB Şifreli Kayıt Envanteri"),
            simpleTable(
              ["Koleksiyon", "Boyut (byte)", "IV (hex)", "Şifreli veri örneği (Base64)", "Son yazım"],
              records.map((r) => [LABELS[r.key] ?? r.key, r.byteLength, bytesToHex(r.iv), bytesToBase64(r.ciphertext).slice(0, 36) + "…", new Date(r.updatedAt).toLocaleString("tr-TR")]),
              [18, 10, 24, 30, 18],
              undefined,
              { size: 8 },
            ),
            sectionTitle("Content-Security-Policy"),
            para(CSP, { size: 8, font: "Courier New" }),
            para(
              "Bu belge, AkrediteSınav uygulamasının tarayıcı içinde (istemci tarafında) docx kütüphanesi ile ürettiği bir çıktıdır. Belge üretimi sırasında hiçbir sunucuya veri gönderilmemiştir.",
              { size: 9, italics: true, spacingBefore: 200 },
            ),
          ],
        },
      ]);
      await saveDocx(doc, `Guvenlik_Denetim_Kaniti_${todayIso()}.docx`);
      toast.success("Kanıt raporu üretildi", online ? "İsterseniz Uçak Modunu açıp tekrar deneyin." : "Çevrimdışı üretim başarılı!");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex items-center gap-4 rounded-xl p-5 ring-1", online ? "bg-zinc-50 ring-zinc-200" : "bg-emerald-50 ring-emerald-200")}>
        <Plane className={cn("h-10 w-10", online ? "text-zinc-400" : "text-emerald-600")} />
        <div>
          <div className="text-base font-semibold">{online ? "Şu anda ÇEVRİMİÇİ" : "ÇEVRİMDIŞI — Uçak Modu aktif"}</div>
          <div className="text-xs text-zinc-600">
            navigator.onLine = <span className="font-mono">{String(online)}</span> · Durum canlı olarak izleniyor.
          </div>
        </div>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-700">
        <li>Wi-Fi&apos;yi kapatın veya Uçak Modunu açın (ya da Geliştirici Araçları → Network → Offline).</li>
        <li>Yukarıdaki durumun &quot;ÇEVRİMDIŞI&quot; olarak değiştiğini görün.</li>
        <li>Aşağıdaki düğmeyle Word çıktısı üretin; ardından herhangi bir modülde sınav kağıdı, tutanak veya PUKÖ raporu indirin.</li>
      </ol>
      <Button onClick={generate} loading={busy} variant="success">
        <FileDown className="h-4 w-4" /> Çevrimdışı Kanıt Raporu Üret (.docx)
      </Button>
      <p className="text-xs text-zinc-500">
        Tüm modüller tek bir statik pakette yüklenir; çıktılar (docx, xlsx, PDF/yazdır) tamamen tarayıcınızda üretilir. Service Worker uygulama dosyalarını önbelleğe alır, böylece sayfa yenilense bile çevrimdışı açılır.
      </p>
    </div>
  );
}

function Proof({ ok, label, value, big }: { ok: boolean; label: string; value: string; big?: boolean }) {
  return (
    <div className={cn("rounded-lg p-3 ring-1", ok ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200")}>
      <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-600">
        {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-red-600" />}
        {label}
      </div>
      <div className={cn("mt-0.5 font-semibold", big ? "text-lg" : "text-xs", ok ? "text-emerald-800" : "text-red-800")}>{value}</div>
    </div>
  );
}
