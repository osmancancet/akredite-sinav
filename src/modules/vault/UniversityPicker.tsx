"use client";

import * as React from "react";
import { Building2, Check, ImageOff, Search } from "lucide-react";
import { UNIVERSITIES, type UniversityEntry } from "@/lib/universities";
import { useData, useVault } from "@/lib/store";
import { cn, foldTr } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";

const fold = foldTr;

/** /logos altındaki yerel logo dosyasını kasaya yazılacak data URL'e çevirir (aynı köken, harici istek yok). */
export async function logoToDataUrl(file: string): Promise<string> {
  const res = await fetch(`/logos/${file}`);
  if (!res.ok) throw new Error(`Logo okunamadı (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function UniversityPicker() {
  const inst = useData().institution;
  const update = useVault((s) => s.update);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<"all" | "Devlet" | "Vakıf">("all");
  const [busy, setBusy] = React.useState<string | null>(null);

  const list = React.useMemo(() => {
    const f = fold(q.trim());
    return UNIVERSITIES.filter((u) => (type === "all" || u.type === type) && (!f || fold(`${u.name} ${u.city}`).includes(f))).sort((a, b) =>
      a.name.localeCompare(b.name, "tr"),
    );
  }, [q, type]);

  const pick = async (u: UniversityEntry) => {
    setBusy(u.slug);
    try {
      const logoDataUrl = u.logo ? await logoToDataUrl(u.logo) : undefined;
      update("institution", (p) => ({ ...p, university: u.name, city: u.city || p.city, logoDataUrl }));
      if (u.logo) toast.success(`${u.name} seçildi`, "Antet ve logo tüm Word/PDF çıktılarına uygulandı.");
      else toast.warning(`${u.name} seçildi`, "Bu kurumun logosu dizinde yok; 'Logo Yükle' ile kendiniz ekleyebilirsiniz.");
      setOpen(false);
    } catch (e) {
      toast.error("Logo yüklenemedi", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const withLogo = UNIVERSITIES.filter((u) => u.logo).length;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Building2 className="h-3.5 w-3.5" /> Üniversite Seç ({UNIVERSITIES.length} kurum)
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title="Üniversite Seç — Antet ve Logoyu Otomatik Doldur"
        description={`${UNIVERSITIES.length} yükseköğretim kurumu, ${withLogo} logo. Logolar uygulamayla birlikte yerel olarak gelir; seçim internet gerektirmez.`}
        icon={<Building2 className="h-5 w-5 text-brand-600" />}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input autoFocus className="pl-8" placeholder="Üniversite veya şehir ara… (örn. ege, izmir, teknik)" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Tabs
            value={type}
            onChange={setType}
            items={[
              { value: "all", label: "Tümü" },
              { value: "Devlet", label: "Devlet" },
              { value: "Vakıf", label: "Vakıf" },
            ]}
          />
          <span className="text-xs text-zinc-500">{list.length} sonuç</span>
        </div>
        <div className="mt-4 grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-3 lg:grid-cols-4">
          {list.map((u) => {
            const active = inst.university === u.name;
            return (
              <button
                key={u.slug}
                onClick={() => pick(u)}
                disabled={!!busy}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-2.5 text-left ring-1 transition-colors cursor-pointer disabled:opacity-60",
                  active ? "bg-brand-50 ring-brand-400" : "bg-white ring-zinc-200 hover:bg-zinc-50",
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#fff] ring-1 ring-zinc-100">
                  {u.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/logos/${u.logo}`} alt="" loading="lazy" className="max-h-11 max-w-11 object-contain" />
                  ) : (
                    <ImageOff className="h-5 w-5 text-zinc-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-2 text-xs font-semibold text-zinc-900">{u.name}</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Badge tone={u.type === "Devlet" ? "sky" : "amber"} className="px-1.5 py-0 text-[10px]">{u.type}</Badge>
                    <span className="truncate text-[10.5px] text-zinc-500">{u.city}</span>
                    {active && <Check className="h-3.5 w-3.5 text-brand-600" />}
                  </div>
                </div>
              </button>
            );
          })}
          {!list.length && <div className="col-span-full py-10 text-center text-sm text-zinc-400">Sonuç bulunamadı.</div>}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Logolar ilgili kurumların tescilli işaretleridir; yalnızca kurumunuzun resmi belgelerinde kullanım içindir. Kaynak listesi: <span className="font-mono">public/logos/KAYNAKLAR.md</span>
        </p>
      </Dialog>
    </>
  );
}
