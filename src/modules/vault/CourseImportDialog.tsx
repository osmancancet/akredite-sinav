"use client";

import * as React from "react";
import { ClipboardPaste, Download, FileSpreadsheet, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useData, useVault } from "@/lib/store";
import { emptyDraft, exportCatalogXlsx, mergeDrafts, parseBolognaText, readCatalogFile, type CourseDraft } from "@/lib/courseImport";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useAiRunner } from "@/modules/ai/useAi";
import { aiExtractCourse } from "@/services/aiCopilotService";
import { cn } from "@/lib/utils";

export function CourseImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useData();
  const update = useVault((s) => s.update);
  const [tab, setTab] = React.useState<"bologna" | "excel">("bologna");
  const [drafts, setDrafts] = React.useState<CourseDraft[]>([]);
  const [selected, setSelected] = React.useState<boolean[]>([]);
  const [paste, setPaste] = React.useState("");
  const [draft, setDraft] = React.useState<CourseDraft>(emptyDraft());
  const { run, busy } = useAiRunner();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab("bologna");
      setDrafts([]);
      setSelected([]);
      setPaste("");
      setDraft(emptyDraft());
    }
  }
  const existingCodes = new Set(data.courses.map((c) => c.code.toLocaleUpperCase("tr-TR").replace(/\s+/g, "")));

  const apply = (list: CourseDraft[]) => {
    const valid = list.filter((d) => d.code.trim() && d.name.trim());
    if (!valid.length) return toast.error("Aktarılacak geçerli ders yok", "Ders kodu ve adı zorunludur.");
    const res = mergeDrafts(data.courses, valid, data.programOutcomes.length);
    update("courses", res.courses);
    const known = new Set(data.courses.map((c) => c.id));
    const newIds = res.courses.filter((c) => !known.has(c.id)).map((c) => c.id);
    if (newIds.length) update("schedule", (s) => ({ ...s, settings: { ...s.settings, courseIds: [...s.settings.courseIds, ...newIds] } }));
    toast.success(
      `${res.added.length} ders eklendi, ${res.updated.length} ders güncellendi`,
      [...res.added, ...res.updated].slice(0, 8).join(", ") + (res.added.length + res.updated.length > 8 ? "…" : ""),
    );
    onClose();
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const list = await readCatalogFile(file);
      setDrafts(list);
      setSelected(list.map(() => true));
      toast.info(`${list.length} ders okundu`, `${list.reduce((s, d) => s + d.outcomes.length, 0)} öğrenme çıktısı bulundu.`);
    } catch (e) {
      toast.error("Dosya okunamadı", e instanceof Error ? e.message : String(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const parsePaste = (text: string) => {
    setPaste(text);
    if (text.trim().length > 20) setDraft(parseBolognaText(text));
  };

  const aiExtract = async () => {
    const res = await run("course-ai", (s) => aiExtractCourse(s, paste));
    if (!res) return;
    setDraft((d) => ({
      ...d,
      code: res.code || d.code,
      name: res.name || d.name,
      semesterNo: res.semesterNo || d.semesterNo,
      classYear: res.semesterNo ? Math.max(1, Math.ceil(res.semesterNo / 2)) : d.classYear,
      credit: res.credit || d.credit,
      ects: res.ects || d.ects,
      instructor: res.instructor || d.instructor,
      outcomes: res.outcomes.length ? res.outcomes : d.outcomes,
    }));
    toast.success("AI ders bilgilerini ayıkladı", "Kaydetmeden önce kontrol edin.");
  };

  const set = <K extends keyof CourseDraft>(k: K, v: CourseDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const isUpdate = existingCodes.has(draft.code.toLocaleUpperCase("tr-TR").replace(/\s+/g, ""));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Dersleri içe aktar"
      description="Bologna bilgi paketinden yapıştırın veya Excel/CSV ile toplu yükleyin. Aynı kodlu dersler güncellenir, yeniler kataloğa ve sınav programına eklenir."
      icon={<FileSpreadsheet className="h-5 w-5 text-zinc-500" />}
      footer={
        tab === "bologna" ? (
          <Button onClick={() => apply([draft])} disabled={!draft.code || !draft.name}>
            <Plus className="h-4 w-4" /> {isUpdate ? "Dersi güncelle" : "Kataloğa ekle"}
          </Button>
        ) : (
          <Button onClick={() => apply(drafts.filter((_, i) => selected[i]))} disabled={!selected.some(Boolean)}>
            <Upload className="h-4 w-4" /> {selected.filter(Boolean).length} dersi aktar
          </Button>
        )
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "bologna", label: "Bologna'dan yapıştır", icon: <ClipboardPaste /> },
          { value: "excel", label: "Excel / CSV", icon: <FileSpreadsheet /> },
        ]}
      />

      {tab === "bologna" && (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <Field
              label="Ders bilgi paketi sayfasının metni"
              hint="Üniversitenizin Bologna/ders bilgi paketi sayfasında Ctrl+A → Ctrl+C yapıp buraya yapıştırın. Tarayıcı güvenliği nedeniyle sayfayı uygulama kendisi çekemez."
            >
              <Textarea
                rows={16}
                className="font-mono text-[11.5px]"
                value={paste}
                onChange={(e) => parsePaste(e.target.value)}
                placeholder={"Ders Adı\tKodu\tYarıyıl\tT+U\tKredi\tAKTS\nVeri Tabanı Yönetim Sistemleri\tBLP201\t3\t2+2\t3\t5\n…\nDersin Öğrenme Çıktıları\n1. Veri tabanı kavramlarını açıklar.\n2. …"}
              />
            </Field>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="ai" onClick={aiExtract} loading={busy === "course-ai"} disabled={paste.trim().length < 40}>
                <Sparkles className="h-3.5 w-3.5" /> AI ile ayıkla
              </Button>
              <span className="text-[11px] text-zinc-500">Otomatik ayrıştırma yetersiz kalırsa. Yalnızca bu sayfa metni gönderilir.</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-zinc-700">Önizleme</span>
              {draft.code && <Badge tone={isUpdate ? "amber" : "brand"}>{isUpdate ? "Mevcut ders güncellenecek" : "Yeni ders"}</Badge>}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Ders kodu">
                <Input value={draft.code} onChange={(e) => set("code", e.target.value)} className="font-mono" />
              </Field>
              <Field label="Ders adı" className="sm:col-span-2">
                <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Yarıyıl">
                <Input type="number" value={draft.semesterNo} onChange={(e) => { const v = Number(e.target.value) || 1; setDraft((d) => ({ ...d, semesterNo: v, classYear: Math.max(1, Math.ceil(v / 2)) })); }} />
              </Field>
              <Field label="Kredi">
                <Input type="number" value={draft.credit} onChange={(e) => set("credit", Number(e.target.value) || 0)} />
              </Field>
              <Field label="AKTS">
                <Input type="number" value={draft.ects} onChange={(e) => set("ects", Number(e.target.value) || 0)} />
              </Field>
              <Field label="Öğretim elemanı" className="sm:col-span-2">
                <Input value={draft.instructor} onChange={(e) => set("instructor", e.target.value)} />
              </Field>
              <Field label="Öğrenci sayısı">
                <Input type="number" value={draft.studentCount} onChange={(e) => set("studentCount", Number(e.target.value) || 0)} />
              </Field>
            </div>
            <Field label={`Öğrenme çıktıları (${draft.outcomes.length}) — her satır bir ÖÇ`}>
              <Textarea rows={7} value={draft.outcomes.join("\n")} onChange={(e) => set("outcomes", e.target.value.split("\n").map((l) => l.trimStart()))} />
            </Field>
          </div>
        </div>
      )}

      {tab === "excel" && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Excel / CSV seç
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => exportCatalogXlsx([], data.programOutcomes, "Ders_Katalogu_Sablonu.xlsx")}>
              <Download className="h-4 w-4" /> Boş şablon
            </Button>
            <span className="text-[11.5px] text-zinc-500">
              Sayfalar: <span className="font-mono">Dersler</span>, <span className="font-mono">Öğrenme Çıktıları</span>, isteğe bağlı <span className="font-mono">ÖÇ-PÇ Matrisi</span>. Tek sayfalı CSV de olur.
            </span>
          </div>
          {drafts.length > 0 ? (
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-zinc-200 scrollbar-thin">
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-zinc-50 text-left text-[11px] text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">
                      <Checkbox checked={selected.every(Boolean)} onChange={(v) => setSelected(drafts.map(() => v))} />
                    </th>
                    <th className="px-3 py-2">Kod</th>
                    <th className="px-3 py-2">Ders</th>
                    <th className="px-3 py-2">Sınıf</th>
                    <th className="px-3 py-2">Kredi/AKTS</th>
                    <th className="px-3 py-2">ÖÇ</th>
                    <th className="px-3 py-2">Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d, i) => {
                    const upd = existingCodes.has(d.code.toLocaleUpperCase("tr-TR").replace(/\s+/g, ""));
                    return (
                      <tr key={`${d.code}-${i}`} className={cn("border-t border-zinc-100", !selected[i] && "opacity-45")}>
                        <td className="px-3 py-1.5">
                          <Checkbox checked={!!selected[i]} onChange={(v) => setSelected((s) => s.map((x, j) => (j === i ? v : x)))} />
                        </td>
                        <td className="px-3 py-1.5 font-mono">{d.code}</td>
                        <td className="px-3 py-1.5">{d.name}</td>
                        <td className="px-3 py-1.5 tabular-nums">{d.classYear}.</td>
                        <td className="px-3 py-1.5 tabular-nums">{d.credit} / {d.ects}</td>
                        <td className="px-3 py-1.5 tabular-nums">{d.outcomes.length}{d.matrix ? " + matris" : ""}</td>
                        <td className="px-3 py-1.5">
                          <Badge tone={upd ? "amber" : "brand"}>{upd ? "Güncellenecek" : "Yeni"}</Badge>
                        </td>
                        <td className="px-2">
                          <button className="cursor-pointer text-zinc-300 hover:text-red-500" onClick={() => { setDrafts((x) => x.filter((_, j) => j !== i)); setSelected((x) => x.filter((_, j) => j !== i)); }} aria-label="Satırı çıkar">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-12 text-center text-sm text-zinc-500">
              Henüz dosya seçilmedi. Önce boş şablonu indirip doldurabilir ya da mevcut kataloğu &quot;Excel&apos;e aktar&quot; ile dışa alıp düzenleyebilirsiniz.
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
