"use client";

import * as React from "react";
import {
  Download,
  BookOpen,
  Building2,
  CalendarClock,
  FileText,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  LineChart,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  Users,
} from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { Course, Institution, UnitType } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { navigateTo } from "@/hooks/useHashRoute";
import { KDF_ITERATIONS, listEncryptedRecords } from "@/lib/cryptoVault";
import { CryptoLattice } from "@/components/three/CryptoLattice";
import { useShellUi } from "@/components/shell/shellStore";
import { useStoragePersist } from "@/hooks/useStoragePersist";
import { uid, fixed } from "@/lib/utils";
import { UniversityPicker } from "./UniversityPicker";
import { exportCatalogXlsx } from "@/lib/courseImport";

export function VaultModule() {
  const data = useData();
  const totalStudents = Object.values(data.students).reduce((s, l) => s + l.length, 0);
  const totalQuestions = data.exams.reduce((s, e) => s + e.questions.length, 0);
  return (
    <div className="space-y-6">
      <VaultHero />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <QuickTile icon={<BookOpen />} label="Ders" value={data.courses.length} onClick={() => document.getElementById("ders-katalogu")?.scrollIntoView({ behavior: "smooth" })} />
        <QuickTile icon={<FileText />} label="Sınav / soru" value={`${data.exams.length}/${totalQuestions}`} onClick={() => navigateTo("sinav")} />
        <QuickTile icon={<CalendarClock />} label="Programlı sınav" value={data.schedule.entries.length} onClick={() => navigateTo("program")} />
        <QuickTile icon={<Users />} label="Öğrenci (OBS)" value={totalStudents} onClick={() => navigateTo("oturma")} />
        <QuickTile icon={<LayoutGrid />} label="Rubrik" value={data.rubrics.length} onClick={() => navigateTo("rubrik")} />
        <QuickTile icon={<LineChart />} label="Not çizelgesi" value={Object.keys(data.grades).length} onClick={() => navigateTo("medek")} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <InstitutionCard />
        <div className="space-y-6">
          <SecurityCard />
          <ProgramOutcomesCard />
        </div>
      </div>
      <div id="ders-katalogu" className="scroll-mt-20">
        <CoursesCard />
      </div>
    </div>
  );
}

function VaultHero() {
  const writeCount = useVault((s) => s.writeCount);
  const mode = useVault((s) => s.mode);
  const lastSavedAt = useVault((s) => s.lastSavedAt);
  const setAudit = useShellUi((s) => s.setAudit);
  const setBackup = useShellUi((s) => s.setBackup);
  const [stats, setStats] = React.useState<{ records: number; bytes: number } | null>(null);

  React.useEffect(() => {
    let alive = true;
    listEncryptedRecords().then((r) => {
      if (alive) setStats({ records: r.length, bytes: r.reduce((s, x) => s + x.byteLength, 0) });
    });
    return () => {
      alive = false;
    };
  }, [writeCount]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--shadow-card)]">
      <div className="bg-dotgrid absolute inset-0 opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
      <div className="relative grid items-center gap-2 lg:grid-cols-[1.1fr_1fr]">
        <div className="p-7 sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-brand-800">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Zero-Knowledge kasa aktif
          </div>
          <h2 className="font-display mt-4 text-[34px] font-medium leading-[1.08] text-zinc-950 sm:text-[40px]">
            Sınavlarınız bu cihazda,
            <br />
            <span className="text-brand-700">yalnızca sizin anahtarınızla</span> açılır.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">
            Her koleksiyon IndexedDB&apos;ye AES-256-GCM ile, her yazımda yeni bir IV ile şifrelenir. Sunucu yok, hesap yok, ağ çıkışı yok. Kafes her şifreli yazımda titreşir.
          </p>
          <dl className="mt-6 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-200/80">
            {[
              ["Şifreli kayıt", stats ? String(stats.records) : "—"],
              ["Disk", stats ? `${fixed((stats.bytes / 1024), 1)} KB` : "—"],
              ["Son yazım", lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-3.5 py-3">
                <dt className="text-[11px] text-zinc-500">{k}</dt>
                <dd className="mt-0.5 font-mono text-[15px] text-zinc-900 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => setAudit(true)}>
              <ShieldCheck className="h-4 w-4" /> Güvenliği kanıtla
            </Button>
            <Button variant="outline" onClick={() => setBackup("export")}>
              <Download className="h-4 w-4" /> .akredite yedeği al
            </Button>
          </div>
          <p className="mt-3 font-mono text-[10.5px] text-zinc-400">
            {mode === "password" ? "master parola · PBKDF2-SHA256 · 100.000 it." : "cihaz anahtarı · non-extractable CryptoKey"}
          </p>
        </div>
        <div className="relative h-[300px] lg:h-[420px]">
          <CryptoLattice pulseKey={writeCount} />
        </div>
      </div>
    </section>
  );
}

function QuickTile({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-zinc-200/80 bg-white p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-zinc-300"
    >
      <div className="flex items-center justify-between text-[11.5px] font-medium text-zinc-500">
        {label}
        <span className="text-zinc-300 transition-colors group-hover:text-brand-600 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      </div>
      <div className="mt-2 font-mono text-[24px] leading-none text-zinc-900 tabular-nums">{value}</div>
    </button>
  );
}

function InstitutionCard() {
  const inst = useData().institution;
  const update = useVault((s) => s.update);
  const set = <K extends keyof Institution>(k: K, v: Institution[K]) => update("institution", (p) => ({ ...p, [k]: v }));

  const onLogo = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) return toast.error("Logo PNG veya JPG olmalıdır.");
    if (file.size > 600_000) return toast.error("Logo 600 KB'tan küçük olmalıdır.");
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader
        icon={<Building2 className="h-4 w-4" />}
        title="Kurum Anteti"
        description="Tüm Word/PDF çıktılarının resmi başlığında kullanılır."
        actions={<UniversityPicker />}
      />
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
            {inst.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inst.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <ImagePlus className="h-6 w-6 text-zinc-400" />
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50">
              <ImagePlus className="h-3.5 w-3.5" /> Logo Yükle (PNG/JPG)
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            </label>
            {inst.logoDataUrl && (
              <Button size="sm" variant="ghost" onClick={() => set("logoDataUrl", undefined)}>
                <Trash2 className="h-3.5 w-3.5" /> Logoyu kaldır
              </Button>
            )}
            <p className="text-[11px] text-zinc-500">Logo da şifreli kasada saklanır.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Üniversite" className="sm:col-span-2">
            <Input value={inst.university} onChange={(e) => set("university", e.target.value)} />
          </Field>
          <Field label="Birim Türü">
            <Select value={inst.unitType} onChange={(e) => set("unitType", e.target.value as UnitType)}>
              {["Meslek Yüksekokulu", "Fakülte", "Yüksekokul", "Enstitü"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Birim Adı">
            <Input value={inst.unitName} onChange={(e) => set("unitName", e.target.value)} />
          </Field>
          <Field label="Bölüm">
            <Input value={inst.department} onChange={(e) => set("department", e.target.value)} />
          </Field>
          <Field label="Program">
            <Input value={inst.program} onChange={(e) => set("program", e.target.value)} />
          </Field>
          <Field label="Akademik Yıl">
            <Input value={inst.academicYear} onChange={(e) => set("academicYear", e.target.value)} placeholder="2026-2027" />
          </Field>
          <Field label="Yarıyıl">
            <Select value={inst.semester} onChange={(e) => set("semester", e.target.value as Institution["semester"])}>
              <option>Güz</option>
              <option>Bahar</option>
              <option>Yaz</option>
            </Select>
          </Field>
          <Field label="Bölüm Başkanı">
            <Input value={inst.headOfDepartment} onChange={(e) => set("headOfDepartment", e.target.value)} />
          </Field>
          <Field label="Unvan">
            <Input value={inst.headTitle} onChange={(e) => set("headTitle", e.target.value)} />
          </Field>
          <Field label="Birim Yöneticisi (Müdür/Dekan)">
            <Input value={inst.unitDirector} onChange={(e) => set("unitDirector", e.target.value)} />
          </Field>
          <Field label="Yönetici Unvanı">
            <Input value={inst.unitDirectorTitle} onChange={(e) => set("unitDirectorTitle", e.target.value)} />
          </Field>
          <Field label="Şehir">
            <Input value={inst.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Akreditasyon Çerçevesi">
            <Select value={inst.accreditationBody} onChange={(e) => set("accreditationBody", e.target.value as Institution["accreditationBody"])}>
              <option>MEDEK</option>
              <option>MÜDEK</option>
              <option>FEDEK</option>
              <option>YÖKAK</option>
            </Select>
          </Field>
          <Field label="PUKÖ Hedef Eşik (%)" hint="Bu değerin altındaki ÖÇ'ler için iyileştirme bayrağı açılır.">
            <Input type="number" min={1} max={100} value={inst.targetThreshold} onChange={(e) => set("targetThreshold", Number(e.target.value) || 60)} />
          </Field>
        </div>
      </CardBody>
    </Card>
  );
}

function SecurityCard() {
  const mode = useVault((s) => s.mode);
  const setPassword = useVault((s) => s.setPassword);
  const removePassword = useVault((s) => s.removePassword);
  const lock = useVault((s) => s.lock);
  const wipe = useVault((s) => s.wipe);
  const [open, setOpen] = React.useState(false);
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const storage = useStoragePersist();
  const strength = Math.min(4, [/.{10,}/, /[A-ZÇĞİÖŞÜ]/, /[0-9]/, /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/].filter((r) => r.test(pw)).length);

  const save = async () => {
    if (pw.length < 8) return toast.error("Master parola en az 8 karakter olmalıdır.");
    if (pw !== pw2) return toast.error("Parolalar eşleşmiyor.");
    setBusy(true);
    try {
      await setPassword(pw);
      toast.success("Master parola etkin", "Tüm kasa yeni anahtarla yeniden şifrelendi.");
      setOpen(false);
      setPw("");
      setPw2("");
    } catch (e) {
      toast.error("Parola ayarlanamadı", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="AES-256 Master Key Yönetimi"
        description={`PBKDF2-SHA256 · ${KDF_ITERATIONS.toLocaleString("tr-TR")} iterasyon · AES-256-GCM`}
        actions={<Badge tone={mode === "password" ? "emerald" : "brand"}>{mode === "password" ? "Master Parola" : "Otomatik Yerel Anahtar"}</Badge>}
      />
      <CardBody className="space-y-3 text-sm">
        <p className="text-zinc-600">
          {mode === "password"
            ? "Kasanız master parolanızdan türetilen anahtarla şifreli. Anahtar yalnızca bu oturumun belleğinde yaşar; kilitlediğinizde silinir."
            : "Kasanız, tarayıcıda üretilen ve dışa aktarılamayan (non-extractable) bir AES-256 cihaz anahtarıyla şifreli. Ek koruma için master parola belirleyebilirsiniz."}
        </p>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <span className={storage.persisted ? "h-1.5 w-1.5 rounded-full bg-emerald-500" : "h-1.5 w-1.5 rounded-full bg-amber-500"} />
          {storage.persisted === null
            ? "Kalıcı depolama durumu sorgulanıyor…"
            : storage.persisted
              ? "Kalıcı depolama izni verildi: tarayıcı kasayı kendiliğinden silmez."
              : "Tarayıcı kalıcı depolama iznini vermedi: düzenli .akredite yedeği alın."}
          {storage.usage !== null && <span className="ml-auto font-mono text-[11px] text-zinc-400">{fixed((storage.usage / 1024 / 1024), 1)} MB kullanılıyor</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" /> {mode === "password" ? "Master Parolayı Değiştir" : "Master Parola Belirle"}
          </Button>
          {mode === "password" && (
            <>
              <Button size="sm" variant="outline" onClick={lock}>
                <Lock className="h-3.5 w-3.5" /> Şimdi Kilitle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (await confirmDialog({ title: "Master parola kaldırılsın mı?", message: "Kasa otomatik cihaz anahtarına geri döner ve yeniden şifrelenir." })) {
                    await removePassword();
                    toast.info("Otomatik yerel anahtara dönüldü");
                  }
                }}
              >
                <Unlock className="h-3.5 w-3.5" /> Parolayı Kaldır
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            onClick={async () => {
              if (await confirmDialog({ title: "Kasa kalıcı olarak imha edilsin mi?", message: "IndexedDB'deki tüm şifreli kayıtlar ve anahtarlar silinir; ardından demo veriyle yeni bir kasa oluşturulur.", destructive: true, confirmLabel: "İmha Et" })) {
                await wipe();
                toast.info("Kasa imha edildi ve yeniden oluşturuldu");
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Kasayı İmha Et
          </Button>
        </div>
      </CardBody>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Master Parola"
        description="Parola hiçbir yerde saklanmaz. Unutulursa veriler kurtarılamaz; .akredite yedeği almanız önerilir."
        footer={<Button onClick={save} loading={busy}>Kaydet ve Yeniden Şifrele</Button>}
      >
        <div className="space-y-3">
          <Field label="Yeni master parola">
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded ${i < strength ? ["bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-600"][strength - 1] : "bg-zinc-200"}`} />
            ))}
          </div>
          <Field label="Parola (tekrar)">
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
      </Dialog>
    </Card>
  );
}

function ProgramOutcomesCard() {
  const pos = useData().programOutcomes;
  const update = useVault((s) => s.update);
  return (
    <Card>
      <CardHeader title="Program Çıktıları (PÇ-1 … PÇ-12)" description="ÖÇ-PÇ matrisi ve PÇ sağlanma oranı hesaplarında kullanılır." />
      <CardBody className="max-h-80 space-y-2 overflow-y-auto scrollbar-thin">
        {pos.map((po, i) => (
          <div key={po.id} className="flex gap-2">
            <span className="mt-2 w-12 shrink-0 text-xs font-semibold text-brand-700">{po.code}</span>
            <Textarea
              className="min-h-[40px] text-xs"
              rows={2}
              value={po.text}
              onChange={(e) => update("programOutcomes", (prev) => prev.map((p, j) => (j === i ? { ...p, text: e.target.value } : p)))}
            />
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function CoursesCard() {
  const data = useData();
  const update = useVault((s) => s.update);
  const setImportOpen = useShellUi((s) => s.setCourseImport);
  const setCourse = (id: string, patch: Partial<Course>) => update("courses", (prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const addCourse = () => {
    const id = uid("crs");
    const course: Course = {
      id,
      code: "YENI101",
      name: "Yeni Ders",
      classYear: 1,
      semesterNo: 1,
      credit: 3,
      ects: 4,
      instructor: "",
      studentCount: 40,
      examDurationMin: 60,
      outcomes: [{ id: uid("oc"), code: "ÖÇ-1", text: "" }],
      ocPcMatrix: {},
    };
    update("courses", (prev) => [...prev, course]);
    update("schedule", (s) => ({ ...s, settings: { ...s.settings, courseIds: [...s.settings.courseIds, id] } }));
  };

  return (
    <Card>
      <CardHeader
        icon={<BookOpen className="h-4 w-4" />}
        title="Ders kataloğu"
        description="Sınav kağıdı, sınav programı ve MEDEK analizlerinin ortak ders kataloğu. Bologna'dan yapıştırarak veya Excel ile toplu aktarabilirsiniz."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => exportCatalogXlsx(data.courses, data.programOutcomes)} disabled={!data.courses.length}>
              <Download className="h-3.5 w-3.5" /> Excel&apos;e aktar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> İçe aktar
            </Button>
            <Button size="sm" onClick={addCourse}>
              <Plus className="h-3.5 w-3.5" /> Ders ekle
            </Button>
          </>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Kod</th>
              <th className="px-4 py-2">Ders Adı</th>
              <th className="px-4 py-2">Sınıf</th>
              <th className="px-4 py-2">Öğretim Elemanı</th>
              <th className="px-4 py-2">Öğrenci</th>
              <th className="px-4 py-2">Kredi/AKTS</th>
              <th className="px-4 py-2">ÖÇ</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.courses.map((c) => (
              <tr key={c.id} className="border-t border-zinc-100">
                <td className="px-4 py-1.5">
                  <Input className="h-8 w-24" value={c.code} onChange={(e) => setCourse(c.id, { code: e.target.value })} />
                </td>
                <td className="px-4 py-1.5">
                  <Input className="h-8 min-w-56" value={c.name} onChange={(e) => setCourse(c.id, { name: e.target.value })} />
                </td>
                <td className="px-4 py-1.5">
                  <Select className="h-8 w-20" value={c.classYear} onChange={(e) => setCourse(c.id, { classYear: Number(e.target.value) })}>
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>{y}.</option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-1.5">
                  <Input className="h-8 min-w-48" value={c.instructor} onChange={(e) => setCourse(c.id, { instructor: e.target.value })} />
                </td>
                <td className="px-4 py-1.5">
                  <Input className="h-8 w-20" type="number" value={c.studentCount} onChange={(e) => setCourse(c.id, { studentCount: Number(e.target.value) || 0 })} />
                </td>
                <td className="px-4 py-1.5">
                  <div className="flex gap-1">
                    <Input className="h-8 w-14" type="number" value={c.credit} onChange={(e) => setCourse(c.id, { credit: Number(e.target.value) || 0 })} />
                    <Input className="h-8 w-14" type="number" value={c.ects} onChange={(e) => setCourse(c.id, { ects: Number(e.target.value) || 0 })} />
                  </div>
                </td>
                <td className="px-4 py-1.5">
                  <Badge tone="brand">{c.outcomes.length}</Badge>
                </td>
                <td className="px-4 py-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Dersi sil"
                    onClick={async () => {
                      const linked = data.exams.filter((e) => e.courseId === c.id).length;
                      if (
                        await confirmDialog({
                          title: `${c.code} silinsin mi?`,
                          message: linked ? `Bu derse bağlı ${linked} sınav da silinecek.` : "Ders katalogdan kaldırılacak.",
                          destructive: true,
                          confirmLabel: "Sil",
                        })
                      ) {
                        const examIds = data.exams.filter((e) => e.courseId === c.id).map((e) => e.id);
                        update("courses", (prev) => prev.filter((x) => x.id !== c.id));
                        update("exams", (prev) => prev.filter((x) => x.courseId !== c.id));
                        update("schedule", (s) => ({
                          ...s,
                          entries: s.entries.filter((e) => e.courseId !== c.id),
                          settings: { ...s.settings, courseIds: s.settings.courseIds.filter((id) => id !== c.id) },
                        }));
                        update("grades", (g) => Object.fromEntries(Object.entries(g).filter(([k]) => !examIds.includes(k))));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-zinc-400" />
                  </Button>
                </td>
              </tr>
            ))}
            {data.courses.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-400">
                  Henüz ders yok. &quot;İçe aktar&quot; ile Bologna sayfasından veya Excel&apos;den aktarın ya da &quot;Ders ekle&quot; ile başlayın.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
