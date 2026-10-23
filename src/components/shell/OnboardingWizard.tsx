"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Check, Compass, ImageOff, Search, Sparkles } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import { createEmptyVault } from "@/lib/demoSeeder";
import { UNIVERSITIES, type UniversityEntry } from "@/lib/universities";
import type { Institution, UnitType } from "@/lib/types";
import { cn, foldTr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { logoToDataUrl } from "@/modules/vault/UniversityPicker";
import { navigateTo } from "@/hooks/useHashRoute";
import { useShellUi } from "./shellStore";
import { BrandMark } from "./BrandMark";
import { CryptoLattice } from "@/components/three/CryptoLattice";

const fold = foldTr;

function currentAcademicYear(): { year: string; semester: Institution["semester"] } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (m >= 9) return { year: `${y}-${y + 1}`, semester: "Güz" };
  if (m <= 1) return { year: `${y - 1}-${y}`, semester: "Güz" };
  if (m <= 6) return { year: `${y - 1}-${y}`, semester: "Bahar" };
  return { year: `${y - 1}-${y}`, semester: "Yaz" };
}

export function OnboardingWizard() {
  const data = useData();
  const update = useVault((s) => s.update);
  const replaceAll = useVault((s) => s.replaceAll);
  const setCourseImport = useShellUi((s) => s.setCourseImport);
  const [step, setStep] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [uni, setUni] = React.useState<UniversityEntry | null>(null);
  const [manualName, setManualName] = React.useState("");
  const ay = currentAcademicYear();
  const [form, setForm] = React.useState({
    unitType: "Meslek Yüksekokulu" as UnitType,
    unitName: "",
    department: "",
    program: "",
    academicYear: ay.year,
    semester: ay.semester,
    headOfDepartment: "",
  });
  const [importNow, setImportNow] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const list = React.useMemo(() => {
    const f = fold(q.trim());
    return UNIVERSITIES.filter((u) => !f || fold(`${u.name} ${u.city}`).includes(f))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"))
      .slice(0, 60);
  }, [q]);

  if (data.ui.onboarded) return null;

  const exploreDemo = () => {
    update("ui", (u) => ({ ...u, onboarded: true }));
    navigateTo("genel");
    toast.success("Demo kasa hazır", "Tüm modüller örnek VTYS dersiyle dolu. Kendi kurumunuza geçmek için Veri → Tüm veriyi temizle.");
  };

  const finish = async () => {
    setBusy(true);
    try {
      const vault = createEmptyVault();
      const logo = uni?.logo ? await logoToDataUrl(uni.logo).catch(() => undefined) : undefined;
      vault.institution = {
        ...vault.institution,
        university: uni?.name ?? manualName.trim(),
        city: uni?.city ?? "",
        logoDataUrl: logo,
        unitType: form.unitType,
        unitName: form.unitName.trim(),
        department: form.department.trim(),
        program: form.program.trim(),
        academicYear: form.academicYear.trim(),
        semester: form.semester,
        headOfDepartment: form.headOfDepartment.trim(),
        unitDirector: "",
      };
      vault.schedule.settings.periodName = `${form.academicYear} ${form.semester} Yarıyılı Ara Sınav Dönemi`;
      vault.ai = data.ai;
      vault.ui = { ...vault.ui, onboarded: true, firstUseAt: data.ui.firstUseAt ?? vault.ui.firstUseAt };
      await replaceAll(vault);
      navigateTo("genel");
      toast.success("Kasanız kuruldu", `${vault.institution.university} — antet ve logo tüm çıktılara uygulandı.`);
      if (importNow) setTimeout(() => setCourseImport(true), 250);
    } catch (e) {
      toast.error("Kurulum tamamlanamadı", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const canNext = step === 1 ? !!uni || manualName.trim().length > 3 : step === 2 ? !!(form.unitName.trim() && form.department.trim()) : true;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="no-print fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[var(--shadow-pop)] lg:grid-cols-[0.9fr_1.4fr]"
      >
        <aside className="theme-invariant relative hidden min-h-[560px] overflow-hidden bg-zinc-950 p-8 text-zinc-100 lg:block">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <CryptoLattice variant="dark" />
          </div>
          <div className="relative">
            <BrandMark inverted className="h-10 w-10" />
            <h2 className="font-display mt-6 text-3xl font-medium leading-tight text-white">Sınav, operasyon ve akreditasyon tek kasada.</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">Hesap yok, sunucu yok. Verileriniz bu tarayıcıda AES-256-GCM ile şifrelenir ve internetsiz çalışır.</p>
            <ol className="mt-8 space-y-3 text-[13px]">
              {["Başlangıç", "Üniversite", "Birim ve dönem", "Hazır"].map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[11px]", i < step ? "border-brand-400 bg-brand-500 text-white" : i === step ? "border-white text-white" : "border-white/20 text-zinc-500")}>
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={i === step ? "text-white" : "text-zinc-500"}>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <section className="flex min-h-[560px] flex-col p-7 sm:p-9">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }} className="flex-1">
              {step === 0 && (
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-700">Hoş geldiniz</div>
                  <h3 className="font-display mt-2 text-[28px] font-medium leading-tight text-zinc-950">Nasıl başlamak istersiniz?</h3>
                  <div className="mt-7 grid gap-3">
                    <button onClick={() => setStep(1)} className="group cursor-pointer rounded-xl border border-zinc-200 p-5 text-left transition-colors hover:border-zinc-900">
                      <div className="flex items-center gap-2 text-[15px] font-medium text-zinc-950">
                        <Building2 className="h-4 w-4 text-brand-700" /> Kendi kurumumla başla
                        <ArrowRight className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-zinc-900" />
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                        Üniversitenizi seçin (205 kurum, logolu), birim ve bölüm bilgisini girin; dersleri Bologna sayfasından yapıştırarak aktarın. 2 dakika.
                      </p>
                    </button>
                    <button onClick={exploreDemo} className="group cursor-pointer rounded-xl border border-zinc-200 p-5 text-left transition-colors hover:border-zinc-900">
                      <div className="flex items-center gap-2 text-[15px] font-medium text-zinc-950">
                        <Compass className="h-4 w-4 text-brand-700" /> Demo veriyle keşfet
                        <ArrowRight className="ml-auto h-4 w-4 text-zinc-300 group-hover:text-zinc-900" />
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                        &quot;Veri Tabanı Yönetim Sistemleri&quot; dersi, 6 soru, 75 öğrenci, sınav programı ve not simülasyonu hazır. Tüm çıktıları hemen deneyin.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="flex h-full flex-col">
                  <h3 className="font-display text-[26px] font-medium text-zinc-950">Üniversiteniz</h3>
                  <p className="mt-1 text-sm text-zinc-500">Logo ve resmi ad tüm Word/PDF çıktılarının antetine yerleşir.</p>
                  <div className="relative mt-5">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input autoFocus className="pl-8" placeholder="Ara… (örn. ege, ankara, teknik)" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                  <div className="mt-3 grid max-h-[300px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2">
                    {list.map((u) => (
                      <button
                        key={u.slug}
                        onClick={() => {
                          setUni(u);
                          setManualName("");
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 text-left text-[12.5px]",
                          uni?.slug === u.slug ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300",
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#fff] p-0.5">
                          {u.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/logos/${u.logo}`} alt="" loading="lazy" className="max-h-8 max-w-8 object-contain" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-zinc-300" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 font-medium text-zinc-900">{u.name}</span>
                          <span className="text-[11px] text-zinc-500">{u.city} · {u.type}</span>
                        </span>
                        {uni?.slug === u.slug && <Check className="h-4 w-4 text-brand-700" />}
                      </button>
                    ))}
                  </div>
                  <Field label="Listede yok mu? Kurum adını yazın" className="mt-4">
                    <Input
                      value={manualName}
                      onChange={(e) => {
                        setManualName(e.target.value);
                        if (e.target.value) setUni(null);
                      }}
                      placeholder="örn. Örnek Üniversitesi"
                    />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="font-display text-[26px] font-medium text-zinc-950">Birim ve dönem</h3>
                  <p className="mt-1 text-sm text-zinc-500">Bunları daha sonra Kasa sayfasından değiştirebilirsiniz.</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Field label="Birim türü">
                      <Select value={form.unitType} onChange={(e) => set("unitType", e.target.value as UnitType)}>
                        {["Meslek Yüksekokulu", "Fakülte", "Yüksekokul", "Enstitü"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Birim adı">
                      <Input autoFocus value={form.unitName} onChange={(e) => set("unitName", e.target.value)} placeholder="örn. Teknik Bilimler MYO" />
                    </Field>
                    <Field label="Bölüm">
                      <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="örn. Bilgisayar Teknolojileri Bölümü" />
                    </Field>
                    <Field label="Program">
                      <Input value={form.program} onChange={(e) => set("program", e.target.value)} placeholder="örn. Bilgisayar Programcılığı" />
                    </Field>
                    <Field label="Akademik yıl">
                      <Input value={form.academicYear} onChange={(e) => set("academicYear", e.target.value)} />
                    </Field>
                    <Field label="Yarıyıl">
                      <Select value={form.semester} onChange={(e) => set("semester", e.target.value as Institution["semester"])}>
                        <option>Güz</option>
                        <option>Bahar</option>
                        <option>Yaz</option>
                      </Select>
                    </Field>
                    <Field label="Bölüm başkanı (isteğe bağlı)" className="sm:col-span-2">
                      <Input value={form.headOfDepartment} onChange={(e) => set("headOfDepartment", e.target.value)} placeholder="örn. Doç. Dr. Ad SOYAD" />
                    </Field>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="font-display text-[26px] font-medium text-zinc-950">Hazır</h3>
                  <p className="mt-1 text-sm text-zinc-500">Demo veri kaldırılacak ve kurumunuz için boş, şifreli bir kasa kurulacak.</p>
                  <div className="mt-6 flex items-center gap-4 rounded-xl border border-zinc-200 p-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-100 bg-[#fff]">
                      {uni?.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/logos/${uni.logo}`} alt="" className="max-h-12 max-w-12 object-contain" />
                      ) : (
                        <ImageOff className="h-5 w-5 text-zinc-300" />
                      )}
                    </div>
                    <div className="min-w-0 text-[13px]">
                      <div className="font-medium text-zinc-950">{uni?.name ?? manualName}</div>
                      <div className="text-zinc-500">
                        {form.unitName} · {form.department}
                      </div>
                      <div className="mt-1 flex gap-1.5">
                        <Badge>{form.academicYear} {form.semester}</Badge>
                        {!uni?.logo && <Badge tone="amber">Logo daha sonra yüklenebilir</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <Checkbox checked={importNow} onChange={setImportNow} label="Ardından ders kataloğunu içe aktar (Bologna sayfasından yapıştır veya Excel)" />
                  </div>
                  <p className="mt-6 flex items-start gap-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 text-brand-600" />
                    İpucu: ⌘K ile her yerden arama yapabilir, Genel Bakış ekranındaki iş akışıyla dönemi adım adım tamamlayabilirsiniz.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step > 0 && (
            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-5">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4" /> Geri
              </Button>
              {step < 3 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                  Devam <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={finish} loading={busy}>
                  Kasamı kur <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
