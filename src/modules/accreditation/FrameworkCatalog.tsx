"use client";

import * as React from "react";
import { ArrowLeft, BadgeCheck, Building2, ExternalLink, FileText, GraduationCap, Layers, ListPlus, Loader2, PenLine, Search } from "lucide-react";
import { useData } from "@/lib/store";
import type { FrameworkIndexEntry } from "@/lib/accreditation/types";
import { buildCustomFramework, parseCustomCriteria } from "@/lib/accreditation/customFramework";
import { ACCREDITATION_BODIES, YOKAK_REGISTRY_ACCESSED, YOKAK_REGISTRY_URL } from "@/lib/accreditationBodies";
import { cn, foldTr, formatTrDate, num } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { loadFramework, loadFrameworkIndex } from "@/services/accreditationService";
import type { AccreditationApi } from "./useAccreditation";

export function FrameworkCatalog({ api, onBack }: { api: AccreditationApi; onBack?: () => void }) {
  const data = useData();
  const [index, setIndex] = React.useState<FrameworkIndexEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [pick, setPick] = React.useState<FrameworkIndexEntry | null>(null);
  const [customOpen, setCustomOpen] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    loadFrameworkIndex()
      .then((x) => alive && setIndex(x))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const q = foldTr(query.trim());
  const match = (...s: (string | undefined)[]) => !q || s.some((x) => x && foldTr(x).includes(q));
  const preferred = foldTr(data.institution.accreditationBody ?? "");
  const isPreferred = (e: FrameworkIndexEntry) => foldTr(e.registryCode ?? e.code) === preferred && e.status === "verified";
  const entries = (index ?? []).filter((e) => match(e.code, e.name, e.scope)).sort((a, b) => Number(isPreferred(b)) - Number(isPreferred(a)));
  const covered = new Set((index ?? []).map((e) => foldTr(e.registryCode ?? e.code)));
  const others = ACCREDITATION_BODIES.filter((b) => !covered.has(foldTr(b.code)) && match(b.code, b.name, b.field));
  const activeSlugs = new Set(api.ws.active.map((a) => a.slug));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" /> Çalışma alanına dön
            </Button>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kuruluş veya alan ara (ör. mühendislik, MEDEK)" className="w-72 pl-8" aria-label="Kuruluş ara" />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCustomOpen(true)}>
          <ListPlus className="h-4 w-4" /> Kendi ölçüt setimi oluştur
        </Button>
      </div>

      <Card>
        <CardHeader
          icon={<Layers />}
          title={`Ölçüt kataloğu · ${index ? index.length : "…"} çerçeve`}
          description="Her ölçüt, alt ölçüt ve örnek kanıt, kuruluşun yayımladığı belgeden sayfa atfıyla alınmıştır. Belgede açıkça yazmayan kanıtlar “ölçütten türetilmiş” olarak ayrıca işaretlenir."
        />
        <CardBody>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {!index && !error && (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Katalog yükleniyor…
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {entries.map((e) => (
              <FrameworkCard key={e.slug} entry={e} preferred={isPreferred(e)} active={activeSlugs.has(e.slug)} onOpen={() => api.setCurrent(e.slug)} onActivate={() => setPick(e)} onBack={onBack} />
            ))}
          </div>
          {index && !entries.length && <p className="text-sm text-zinc-500">Aramanızla eşleşen katalog kaydı yok.</p>}
        </CardBody>
      </Card>

      {others.length > 0 && (
        <Card>
          <CardHeader
            icon={<Building2 />}
            title="Katalogda ölçüt seti bulunmayan tescilli kuruluşlar"
            description={
              <>
                YÖKAK tescil listesi ({formatTrDate(YOKAK_REGISTRY_ACCESSED)} erişim). Bu kuruluşların ölçütleri kataloğa henüz doğrulanarak işlenmedi; kuruluşun ölçüt belgesindeki başlıkları
                “Kendi ölçüt setimi oluştur” ile yapıştırıp aynı kanıt yönetimini kullanabilirsiniz.{" "}
                <a href={YOKAK_REGISTRY_URL} target="_blank" rel="noreferrer noopener" className="text-brand-700 underline-offset-2 hover:underline">
                  Tescil listesi
                </a>
              </>
            }
          />
          <div className="grid divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-3">
            {others.map((b) => (
              <div key={b.code} className="flex items-start justify-between gap-3 px-5 py-3 sm:border-b sm:border-zinc-100">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-zinc-900">{b.code}</div>
                  <div className="truncate text-xs text-zinc-500" title={b.name}>
                    {b.field} · tescil {formatTrDate(b.validUntil)}’e kadar
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setCustomOpen(true)} title={`${b.code} için ölçüt setini kendiniz tanımlayın`}>
                  <PenLine className="h-3.5 w-3.5" /> Tanımla
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ActivateDialog
        entry={pick}
        defaultScope={pick?.kind === "institutional" ? data.institution.university || "Kurum geneli" : data.institution.program || data.institution.department || ""}
        onClose={() => setPick(null)}
        onActivate={async (scope) => {
          const fw = await loadFramework(pick!.slug);
          api.activate(fw, scope);
          toast.success(`${fw.code} çalışma alanı açıldı`, `${fw.criteria.length} ölçüt · ${fw.criteria.reduce((s, c) => s + (c.evidence?.length ?? 0), 0)} kanıt kalemi`);
          setPick(null);
          onBack?.();
        }}
      />
      <CustomFrameworkDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onCreate={(code, name, text, scope) => {
          const fw = buildCustomFramework(code, name, text);
          api.activate(fw, scope);
          toast.success(`${fw.code} ölçüt seti oluşturuldu`, `${fw.criteria.length} ölçüt`);
          setCustomOpen(false);
          onBack?.();
        }}
      />
    </div>
  );
}

function FrameworkCard({ entry: e, preferred, active, onOpen, onActivate, onBack }: { entry: FrameworkIndexEntry; preferred: boolean; active: boolean; onOpen: () => void; onActivate: () => void; onBack?: () => void }) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-xl border p-4", active ? "border-brand-300 bg-brand-50/40" : "border-zinc-200/80")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[15px] font-semibold tracking-tight text-zinc-950">{e.code}</span>
        <Badge tone={e.kind === "institutional" ? "sky" : "slate"}>
          {e.kind === "institutional" ? <Building2 className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
          {e.kind === "institutional" ? "Kurumsal" : "Program"}
        </Badge>
        {e.status === "verified" ? (
          <Badge tone="emerald">
            <BadgeCheck className="h-3 w-3" /> Kaynakla doğrulandı
          </Badge>
        ) : (
          <Badge tone="amber" title="Ölçütler doğrulandı; örnek kanıt listesi kuruluş belgesinde yer almıyor veya eksik">
            Kısmi
          </Badge>
        )}
        {active && <Badge tone="brand">Açık</Badge>}
        {preferred && !active && <Badge tone="brand">Kurum ayarınızdaki kuruluş</Badge>}
      </div>
      <div className="mt-1 text-[12.5px] leading-snug text-zinc-700">{e.name}</div>
      {e.scope && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-500">{e.scope}</p>}
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ["Ölçüt", e.criteria],
          ["Alt ölçüt", e.subcriteria],
          ["Kanıt kalemi", e.evidence],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-lg bg-zinc-50 px-2 py-1.5">
            <dt className="text-[10.5px] text-zinc-500">{k}</dt>
            <dd className="font-mono text-[15px] tabular-nums text-zinc-900">{num(v as number, 0)}</dd>
          </div>
        ))}
      </dl>
      {e.evidence > 0 && (
        <div className="mt-1.5 text-[11px] text-zinc-500">
          {num(e.explicit, 0)} kalem kuruluşun “örnek kanıt” listesinden birebir; {num(e.evidence - e.explicit, 0)} kalem ölçüt metninden türetilmiş.
        </div>
      )}
      {e.document && (
        <a href={e.document.url} target="_blank" rel="noreferrer noopener" className="mt-3 flex items-start gap-1.5 text-[11.5px] text-zinc-600 hover:text-brand-800">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">
            {e.document.title} {e.document.version && <span className="text-zinc-400">· {e.document.version}</span>}
            <ExternalLink className="ml-1 inline h-3 w-3" />
          </span>
        </a>
      )}
      <div className="mt-auto flex justify-end gap-2 pt-4">
        {active ? (
          <Button
            size="sm"
            onClick={() => {
              onOpen();
              onBack?.();
            }}
          >
            Çalışma alanını aç
          </Button>
        ) : (
          <Button size="sm" variant="success" onClick={onActivate}>
            Bu akreditasyonla çalış
          </Button>
        )}
      </div>
    </div>
  );
}

function ActivateDialog({
  entry,
  defaultScope,
  onClose,
  onActivate,
}: {
  entry: FrameworkIndexEntry | null;
  defaultScope: string;
  onClose: () => void;
  onActivate: (scope: string) => Promise<void>;
}) {
  const [scope, setScope] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const value = scope ?? defaultScope;
  const close = () => {
    setScope(null);
    onClose();
  };
  return (
    <Dialog
      open={!!entry}
      onClose={close}
      title={entry ? `${entry.code} ile çalışmaya başla` : ""}
      description="Ölçüt seti kasanıza kopyalanır; kuruluş belgeyi güncellese bile çalışmanız bu sürüm üzerinde kalır ve çevrimdışı çalışır."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Vazgeç
          </Button>
          <Button
            variant="success"
            disabled={busy || !value.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onActivate(value.trim());
                setScope(null);
              } catch (e) {
                toast.error("Ölçüt seti yüklenemedi", e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Çalışma alanını oluştur
          </Button>
        </>
      }
    >
      <Field label={entry?.kind === "institutional" ? "Kurum" : "Akreditasyona başvurulacak program"} hint="Raporların ve kanıt paketinin başlığında kullanılır.">
        <Input value={value} onChange={(e) => setScope(e.target.value)} autoFocus />
      </Field>
    </Dialog>
  );
}

const CUSTOM_EXAMPLE = `1. Öğrenciler
- Öğrenci kabul ve yatay geçiş yönergesi
- Danışmanlık görüşme kayıtları
2. Program Çıktıları
- Program çıktıları – TYYÇ eşleştirme tablosu
- Program çıktıları ölçme sonuçları`;

function CustomFrameworkDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (code: string, name: string, text: string, scope: string) => void }) {
  const data = useData();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [scope, setScope] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const parsed = parseCustomCriteria(text);
  const scopeValue = scope ?? (data.institution.program || data.institution.department || "");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Kendi ölçüt setinizi oluşturun"
      description="Katalogda olmayan kuruluşlar, iç değerlendirme veya ISO denetimleri için. Ölçüt başlıklarını ve altındaki kanıtları yapıştırın."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant="success" disabled={!code.trim() || !parsed.length || !scopeValue.trim()} onClick={() => onCreate(code, name, text, scopeValue.trim())}>
            {parsed.length} ölçütle oluştur
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <Field label="Kısa ad">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ör. MÜDEK" />
        </Field>
        <Field label="Tam ad">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. Mühendislik Lisans Programları Ölçütleri 2026" />
        </Field>
      </div>
      <Field label="Kapsam (program / birim)" className="mt-4">
        <Input value={scopeValue} onChange={(e) => setScope(e.target.value)} />
      </Field>
      <Field label="Ölçütler ve kanıtlar" hint="Her ölçüt bir satır; kanıtlar altında “-” ile başlayan satırlar." className="mt-4">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={CUSTOM_EXAMPLE} className="min-h-[200px] font-mono text-[12px]" />
      </Field>
      {parsed.length > 0 && (
        <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {parsed.length} ölçüt · {parsed.reduce((s, c) => s + (c.evidence?.length ?? 0), 0)} kanıt kalemi algılandı:{" "}
          {parsed
            .slice(0, 6)
            .map((c) => `${c.id} ${c.title}`)
            .join(" · ")}
          {parsed.length > 6 && " …"}
        </div>
      )}
    </Dialog>
  );
}
