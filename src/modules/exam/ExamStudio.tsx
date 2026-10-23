"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  FileDown,
  FilePlus2,
  KeyRound,
  Library,
  ListChecks,
  MoreHorizontal,
  FileArchive,
  ScanLine,
  Printer,
  Settings2,
  Table2,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { printDocument } from "@/components/print/PrintHost";
import { auditExam, buildBlueprint } from "@/lib/medekMath";
import { BLOOM_LEVELS, cn, round, uid } from "@/lib/utils";
import type { BookletType } from "@/lib/booklet";
import { exportAnswerKeyDocx, exportExamDocx, exportOpticKeyTxt, exportOpticKeyXlsx } from "@/services/examExportService";
import { exportEvidencePack } from "@/services/evidencePackService";
import { useData } from "@/lib/store";
import { AnswerKeyDocument, BlueprintTable, ExamPaper } from "./ExamDocuments";
import { QuestionEditor } from "./QuestionEditor";
import { QuestionBankPanel } from "./QuestionBankPanel";
import { takePendingTab } from "@/components/shell/shellStore";
import { ExamSettings } from "./ExamSettings";
import { blankExam, useActiveExam } from "./useExam";

export function ExamStudio() {
  const { data, exam, course, update } = useActiveExam();
  const [leftTab, setLeftTab] = React.useState<"questions" | "bank" | "settings">(() => takePendingTab<"questions" | "bank" | "settings">("sinav", "questions"));
  const [rightTab, setRightTab] = React.useState<"preview" | "blueprint" | "audit">("preview");
  const [booklet, setBooklet] = React.useState<BookletType | "key">("A");
  const [newOpen, setNewOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const setActive = (id: string) => update("ui", (u) => ({ ...u, activeExamId: id }));

  if (!exam || !course) {
    return (
      <Card>
        <CardBody className="py-14 text-center">
          <FilePlus2 className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-3 text-sm text-zinc-600">{data.courses.length ? "Henüz sınav oluşturulmadı." : "Önce Modül 1'de bir ders ekleyin veya örnek veriyi yükleyin."}</p>
          {data.courses.length > 0 && (
            <Button className="mt-4" onClick={() => setNewOpen(true)}>
              <FilePlus2 className="h-4 w-4" /> Yeni Sınav Oluştur
            </Button>
          )}
          <NewExamDialog open={newOpen} onClose={() => setNewOpen(false)} />
        </CardBody>
      </Card>
    );
  }

  const issues = auditExam(exam, course);
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;

  const doWord = async (kind: "paper" | "key") => {
    setBusy(kind);
    try {
      if (kind === "paper") await exportExamDocx(data.institution, course, exam, ["A", "B"]);
      else await exportAnswerKeyDocx(data.institution, course, exam);
      toast.success("Word belgesi indirildi", kind === "paper" ? "A ve B kitapçıkları ayrı bölümlerde." : "Cevap anahtarı, rubrik ve belirtke tablosu.");
    } catch (e) {
      toast.error("Word çıktısı üretilemedi", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doPrint = (kind: "A" | "B" | "AB" | "key") => {
    const node =
      kind === "key" ? (
        <AnswerKeyDocument inst={data.institution} course={course} exam={exam} />
      ) : (
        <>
          {(kind === "AB" ? (["A", "B"] as const) : [kind]).map((b) => (
            <ExamPaper key={b} inst={data.institution} course={course} exam={exam} booklet={b} />
          ))}
        </>
      );
    printDocument(node, { title: `${course.code} ${exam.title} ${kind === "key" ? "Cevap Anahtari" : `Kitapcik ${kind}`}` });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 py-4">
          <Field label="Aktif Sınav" className="min-w-72 flex-1">
            <Select value={exam.id} onChange={(e) => setActive(e.target.value)}>
              {data.exams.map((e) => {
                const c = data.courses.find((x) => x.id === e.courseId);
                return (
                  <option key={e.id} value={e.id}>
                    {c?.code} — {e.title}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Button variant="outline" onClick={() => setNewOpen(true)}>
            <FilePlus2 className="h-4 w-4" /> Yeni
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const now = new Date().toISOString();
              const copy = { ...structuredClone(exam), id: uid("exam"), title: `${exam.title} (Kopya)`, createdAt: now, updatedAt: now };
              copy.questions = copy.questions.map((q) => ({ ...q, id: uid("q") }));
              update("exams", (p) => [...p, copy]);
              setActive(copy.id);
              toast.success("Sınav çoğaltıldı");
            }}
          >
            <Copy className="h-4 w-4" /> Çoğalt
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              if (await confirmDialog({ title: "Sınav silinsin mi?", message: `"${exam.title}" ve bağlı not çizelgesi/oturma planı silinecek.`, destructive: true, confirmLabel: "Sil" })) {
                update("exams", (p) => p.filter((e) => e.id !== exam.id));
                update("grades", (g) => Object.fromEntries(Object.entries(g).filter(([k]) => k !== exam.id)));
                update("seating", (g) => Object.fromEntries(Object.entries(g).filter(([k]) => k !== exam.id)));
                update("ui", (u) => ({ ...u, activeExamId: data.exams.find((e) => e.id !== exam.id)?.id ?? null }));
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          <div className="mx-1 hidden h-9 w-px bg-zinc-200 lg:block" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => doWord("paper")} loading={busy === "paper"}>
              <FileDown className="h-4 w-4" /> Sınav Kağıdı (.docx A+B)
            </Button>
            <Button variant="secondary" onClick={() => doWord("key")} loading={busy === "key"}>
              <KeyRound className="h-4 w-4" /> Cevap Anahtarı & Rubrik (.docx)
            </Button>
            <PrintMenu onPrint={doPrint} />
            <MoreMenu />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <Tabs
            value={leftTab}
            onChange={setLeftTab}
            items={[
              { value: "questions", label: `Soru Editörü (${exam.questions.length})`, icon: <ListChecks className="h-3.5 w-3.5" /> },
              { value: "bank", label: `Soru Bankası (${data.questionBank.length})`, icon: <Library className="h-3.5 w-3.5" /> },
              { value: "settings", label: "Antet, Sınav & ÖÇ Ayarları", icon: <Settings2 className="h-3.5 w-3.5" /> },
            ]}
          />
          {leftTab === "questions" && <QuestionEditor />}
          {leftTab === "bank" && <QuestionBankPanel />}
          {leftTab === "settings" && <ExamSettings />}
        </div>

        <div className="min-w-0">
          <div className="sticky top-20 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tabs
                value={rightTab}
                onChange={setRightTab}
                items={[
                  { value: "preview", label: "Canlı A4 Önizleme", icon: <Eye className="h-3.5 w-3.5" /> },
                  { value: "blueprint", label: "Belirtke Tablosu", icon: <Table2 className="h-3.5 w-3.5" /> },
                  {
                    value: "audit",
                    label: "MEDEK Denetçisi",
                    icon: errors ? <XCircle className="h-3.5 w-3.5 text-red-500" /> : warnings ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
                  },
                ]}
              />
              {rightTab === "preview" && (
                <Tabs
                  value={booklet}
                  onChange={setBooklet}
                  items={[
                    { value: "A", label: "A Kitapçığı" },
                    { value: "B", label: "B Kitapçığı" },
                    { value: "key", label: "Cevap Anahtarı" },
                  ]}
                />
              )}
            </div>
            {rightTab === "preview" && (
              <div className="max-h-[calc(100vh-11rem)] overflow-auto rounded-xl bg-zinc-300/60 p-4 scrollbar-thin">
                <div style={{ zoom: 0.72 }}>
                  {booklet === "key" ? (
                    <AnswerKeyDocument inst={data.institution} course={course} exam={exam} />
                  ) : (
                    <ExamPaper inst={data.institution} course={course} exam={exam} booklet={booklet} />
                  )}
                </div>
              </div>
            )}
            {rightTab === "blueprint" && <BlueprintPanel />}
            {rightTab === "audit" && (
              <Card>
                <CardHeader title="MEDEK Uyumluluk Denetçisi" description="Toplam puan, ÖÇ kapsama, rubrik ve Bloom dengesi kontrolleri" />
                <CardBody className="space-y-2">
                  {issues.map((i, k) => (
                    <div
                      key={k}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
                        i.level === "error" && "bg-red-50 text-red-800",
                        i.level === "warning" && "bg-amber-50 text-amber-800",
                        i.level === "ok" && "bg-emerald-50 text-emerald-800",
                      )}
                    >
                      {i.level === "error" ? <XCircle className="mt-0.5 h-4 w-4" /> : i.level === "warning" ? <AlertTriangle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
                      {i.message}
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
      <NewExamDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function BlueprintPanel() {
  const { exam, course } = useActiveExam();
  if (!exam || !course) return null;
  const bp = buildBlueprint(exam, course);
  const maxBloom = Math.max(1, ...Object.values(bp.bloomTotals));
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader title="Otomatik Belirtke Tablosu" description="Çok ÖÇ'lü sorularda puan ÖÇ'ler arasında eşit paylaştırılır." />
        <CardBody className="overflow-x-auto">
          <BlueprintTable course={course} exam={exam} />
          {bp.uncovered.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Kapsanmayan ÖÇ: {course.outcomes.filter((o) => bp.uncovered.includes(o.id)).map((o) => o.code).join(", ")}
            </div>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="ÖÇ Ağırlık Dağılımı ve Bloom Profili" />
        <CardBody className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            {course.outcomes.map((o) => {
              const pct = bp.percents[o.id] ?? 0;
              return (
                <div key={o.id} title={o.text}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-700">{o.code}</span>
                    <span className="tabular-nums text-zinc-600">%{round(pct, 1)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-zinc-100">
                    <div className={cn("h-2 rounded-full", pct === 0 ? "bg-red-400" : "bg-brand-600")} style={{ width: `${Math.max(pct, pct === 0 ? 2 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            {BLOOM_LEVELS.map((b) => (
              <div key={b.value}>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-700">{b.order}. {b.label}</span>
                  <span className="tabular-nums text-zinc-600">{bp.bloomTotals[b.value]} p</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-zinc-800" style={{ width: `${(bp.bloomTotals[b.value] / maxBloom) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function PrintMenu({ onPrint }: { onPrint: (k: "A" | "B" | "AB" | "key") => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        <Printer className="h-4 w-4" /> A4 PDF / Yazdır
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
            {(
              [
                ["A", "A Kitapçığı"],
                ["B", "B Kitapçığı"],
                ["AB", "A + B Kitapçıkları"],
                ["key", "Cevap Anahtarı & Belirtke"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-50 cursor-pointer"
                onClick={() => {
                  setOpen(false);
                  onPrint(k);
                }}
              >
                {label}
              </button>
            ))}
            <div className="px-3 pb-1 pt-1 text-[11px] text-zinc-500">Yazdır penceresinde &quot;PDF olarak kaydet&quot; seçin.</div>
          </div>
        </>
      )}
    </div>
  );
}

function NewExamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, update } = useActiveExam();
  const [courseId, setCourseId] = React.useState(data.courses[0]?.id ?? "");
  const create = () => {
    const c = data.courses.find((x) => x.id === courseId);
    if (!c) return;
    const exam = blankExam(c);
    update("exams", (p) => [...p, exam]);
    update("ui", (u) => ({ ...u, activeExamId: exam.id }));
    toast.success("Yeni sınav oluşturuldu");
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} size="sm" title="Yeni Sınav" footer={<Button onClick={create} disabled={!courseId}>Oluştur</Button>}>
      <Field label="Ders">
        <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {data.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <p className="mt-2 text-xs text-zinc-500">
        <Badge tone="brand">{data.courses.find((c) => c.id === courseId)?.outcomes.length ?? 0} ÖÇ</Badge> ile eşleştirilebilir.
      </p>
    </Dialog>
  );
}

function MoreMenu() {
  const { exam, course } = useActiveExam();
  const data = useData();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  if (!exam || !course) return null;
  const objective = exam.questions.some((q) => q.type === "mcq" || q.type === "truefalse");
  const item = (icon: React.ReactNode, label: string, desc: string, fn: () => void | Promise<void>, disabled = false) => (
    <button
      disabled={disabled}
      className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      onClick={async () => {
        setOpen(false);
        await fn();
      }}
    >
      <span className="mt-0.5 text-zinc-500 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span>
        <span className="block text-[13px] font-medium text-zinc-900">{label}</span>
        <span className="block text-[11.5px] text-zinc-500">{desc}</span>
      </span>
    </button>
  );
  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((v) => !v)} loading={busy} aria-label="Diğer çıktılar">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[var(--shadow-pop)]">
            {item(<ScanLine />, "Optik cevap anahtarı (.xlsx)", objective ? "A/B kitapçık anahtarları, optik okuyucu için" : "Sınavda nesnel soru yok", () => exportOpticKeyXlsx(course, exam), !objective)}
            {item(<ScanLine />, "Optik anahtar dizisi (.txt)", "A,CBDA… biçiminde düz metin", () => exportOpticKeyTxt(course, exam), !objective)}
            <div className="my-1 border-t border-zinc-100" />
            {item(<FileArchive />, "Ders kanıt klasörü (.zip)", "Tüm resmi belgeler + SHA-256 içindekiler", async () => {
              setBusy(true);
              try {
                const res = await exportEvidencePack(data, exam.id);
                toast.success(`Kanıt klasörü hazır — ${res.files} belge`, res.skipped.length ? `${res.skipped.length} belge eksik; ayrıntı ZIP içindeki İÇİNDEKİLER dosyasında.` : undefined);
              } catch (e) {
                toast.error("Kanıt klasörü oluşturulamadı", e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            })}
          </div>
        </>
      )}
    </div>
  );
}
