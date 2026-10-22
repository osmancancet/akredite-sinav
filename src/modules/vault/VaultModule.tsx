"use client";

import * as React from "react";
import {
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
  Users,
} from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { Course, Institution, UnitType } from "@/lib/types";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { navigateTo } from "@/hooks/useHashRoute";
import { KDF_ITERATIONS } from "@/lib/cryptoVault";
import { uid } from "@/lib/utils";
import { UniversityPicker } from "./UniversityPicker";

export function VaultModule() {
  const data = useData();
  const totalStudents = Object.values(data.students).reduce((s, l) => s + l.length, 0);
  const totalQuestions = data.exams.reduce((s, e) => s + e.questions.length, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <QuickTile icon={<BookOpen className="h-4 w-4" />} label="Ders" value={data.courses.length} onClick={() => navigateTo("kasa")} />
        <QuickTile icon={<FileText className="h-4 w-4" />} label="Sınav / Soru" value={`${data.exams.length} / ${totalQuestions}`} onClick={() => navigateTo("sinav")} />
        <QuickTile icon={<CalendarClock className="h-4 w-4" />} label="Programlı Sınav" value={data.schedule.entries.length} onClick={() => navigateTo("program")} />
        <QuickTile icon={<Users className="h-4 w-4" />} label="Öğrenci (OBS)" value={totalStudents} onClick={() => navigateTo("oturma")} />
        <QuickTile icon={<LayoutGrid className="h-4 w-4" />} label="Rubrik" value={data.rubrics.length} onClick={() => navigateTo("rubrik")} />
        <QuickTile icon={<LineChart className="h-4 w-4" />} label="Not Çizelgesi" value={Object.keys(data.grades).length} onClick={() => navigateTo("medek")} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <InstitutionCard />
        <div className="space-y-6">
          <SecurityCard />
          <ProgramOutcomesCard />
        </div>
      </div>
      <CoursesCard />
    </div>
  );
}

function QuickTile({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left cursor-pointer">
      <StatTile label={label} value={value} icon={<span className="text-indigo-500">{icon}</span>} />
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
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
            {inst.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inst.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <ImagePlus className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
              <ImagePlus className="h-3.5 w-3.5" /> Logo Yükle (PNG/JPG)
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            </label>
            {inst.logoDataUrl && (
              <Button size="sm" variant="ghost" onClick={() => set("logoDataUrl", undefined)}>
                <Trash2 className="h-3.5 w-3.5" /> Logoyu kaldır
              </Button>
            )}
            <p className="text-[11px] text-slate-500">Logo da şifreli kasada saklanır.</p>
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
        actions={<Badge tone={mode === "password" ? "emerald" : "indigo"}>{mode === "password" ? "Master Parola" : "Otomatik Yerel Anahtar"}</Badge>}
      />
      <CardBody className="space-y-3 text-sm">
        <p className="text-slate-600">
          {mode === "password"
            ? "Kasanız master parolanızdan türetilen anahtarla şifreli. Anahtar yalnızca bu oturumun belleğinde yaşar; kilitlediğinizde silinir."
            : "Kasanız, tarayıcıda üretilen ve dışa aktarılamayan (non-extractable) bir AES-256 cihaz anahtarıyla şifreli. Ek koruma için master parola belirleyebilirsiniz."}
        </p>
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
              <div key={i} className={`h-1.5 flex-1 rounded ${i < strength ? ["bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-600"][strength - 1] : "bg-slate-200"}`} />
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
            <span className="mt-2 w-12 shrink-0 text-xs font-semibold text-indigo-700">{po.code}</span>
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
        title="Dersler"
        description="Sınav kağıdı, sınav programı ve MEDEK analizlerinin ortak ders kataloğu. Öğrenme çıktıları Modül 2'de düzenlenir."
        actions={
          <Button size="sm" onClick={addCourse}>
            <Plus className="h-3.5 w-3.5" /> Ders Ekle
          </Button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
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
              <tr key={c.id} className="border-t border-slate-100">
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
                  <Badge tone="indigo">{c.outcomes.length}</Badge>
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
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </td>
              </tr>
            ))}
            {data.courses.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                  Henüz ders yok. &quot;Ders Ekle&quot; ile başlayın veya üst bardan örnek veriyi yükleyin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
