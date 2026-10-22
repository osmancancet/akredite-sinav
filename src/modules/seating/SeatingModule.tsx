"use client";

import * as React from "react";
import {
  ClipboardPaste,
  Download,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  FolderArchive,
  Mail,
  Plus,
  Printer,
  Search,
  Shuffle,
  SortAsc,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useData, useVault } from "@/lib/store";
import type { SeatingMode, Student } from "@/lib/types";
import { buildSeatingPlan, compareStudentNo, fullName, parseStudentRows, parseStudentText, seatingCapacity } from "@/lib/seating";
import { cn, maskName, maskStudentNo, uid } from "@/lib/utils";
import { Card, CardBody, CardHeader, StatTile } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { printDocument } from "@/components/print/PrintHost";
import {
  downloadStudentTemplate,
  exportAttendanceDocx,
  exportDoorListDocx,
  exportEnvelopeDocx,
  exportEvidenceCoversDocx,
  pickEvidenceSamples,
  readStudentFile,
  roomSheets,
  type EvidenceSample,
  type SeatingCtx,
} from "@/services/seatingExportService";
import { AttendanceDocument, DoorListDocument, EnvelopeDocument, EvidenceCoversDocument } from "./SeatingDocuments";

export function SeatingModule() {
  const data = useData();
  const update = useVault((s) => s.update);
  const exam = data.exams.find((e) => e.id === data.ui.activeExamId) ?? data.exams[0];
  const course = exam ? data.courses.find((c) => c.id === exam.courseId) : undefined;
  const students = React.useMemo(() => (course ? data.students[course.id] ?? [] : []), [course, data.students]);
  const plan = exam ? data.seating[exam.id] : undefined;
  const entry = course ? data.schedule.entries.find((e) => e.courseId === course.id) : undefined;
  const [roomIds, setRoomIds] = React.useState<string[]>(() => plan?.roomIds ?? entry?.rooms.map((r) => r.roomId) ?? []);
  const [mode, setMode] = React.useState<SeatingMode>(plan?.mode ?? "butterfly");
  const [alternate, setAlternate] = React.useState(true);
  const [mask, setMask] = React.useState(true);
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [lastExam, setLastExam] = React.useState(exam?.id);

  if (exam?.id !== lastExam) {
    setLastExam(exam?.id);
    setRoomIds(plan?.roomIds ?? entry?.rooms.map((r) => r.roomId) ?? []);
    setMode(plan?.mode ?? "butterfly");
  }

  if (!exam || !course) {
    return (
      <Card>
        <CardBody className="py-12 text-center text-sm text-slate-500">Önce Modül 2&apos;de bir sınav oluşturun.</CardBody>
      </Card>
    );
  }

  const setStudents = (list: Student[]) => update("students", (p) => ({ ...p, [course.id]: list }));
  const selectedRooms = data.rooms.filter((r) => roomIds.includes(r.id));
  const capacity = seatingCapacity(selectedRooms);

  const distribute = () => {
    if (!students.length) return toast.error("Öğrenci listesi boş.");
    if (!selectedRooms.length) return toast.error("En az bir derslik seçin.");
    if (capacity < students.length) return toast.error("Kapasite yetersiz", `${students.length} öğrenci için ${capacity} sıra var. Derslik ekleyin.`);
    const seed = Math.floor(Math.random() * 1_000_000);
    const p = buildSeatingPlan(exam.id, students, selectedRooms, mode, seed, alternate);
    update("seating", (prev) => ({ ...prev, [exam.id]: p }));
    toast.success("Oturma düzeni oluşturuldu", `${students.length} öğrenci ${selectedRooms.length} dersliğe ${mode === "butterfly" ? "kelebek düzeninde" : "numara sırasıyla"} dağıtıldı.`);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const rows = await readStudentFile(file);
      const list = parseStudentRows(rows);
      if (!list.length) return toast.error("Dosyada öğrenci bulunamadı", "İlk sütunda öğrenci numarası, yanında ad-soyad olmalıdır.");
      const ok = await confirmDialog({ title: `${list.length} öğrenci bulundu`, message: `${course.code} öğrenci listesi bu dosyayla değiştirilsin mi? (Mevcut: ${students.length})`, confirmLabel: "Listeyi Değiştir" });
      if (!ok) return;
      setStudents(list);
      update("courses", (p) => p.map((c) => (c.id === course.id ? { ...c, studentCount: list.length } : c)));
      toast.success("OBS listesi yüklendi", `${list.length} öğrenci, ders öğrenci sayısı güncellendi.`);
    } catch (e) {
      toast.error("Dosya okunamadı", e instanceof Error ? e.message : String(e));
    }
  };

  const ctx: SeatingCtx | null = plan
    ? { inst: data.institution, course, exam, plan, students, rooms: data.rooms, invigilators: data.invigilators, schedule: data.schedule }
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3 py-4">
          <Field label="Sınav" className="min-w-72 flex-1">
            <Select value={exam.id} onChange={(e) => update("ui", (u) => ({ ...u, activeExamId: e.target.value }))}>
              {data.exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {data.courses.find((c) => c.id === e.courseId)?.code} — {e.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid flex-[2] grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Öğrenci (OBS)" value={students.length} icon={<Users className="h-4 w-4 text-indigo-500" />} />
            <StatTile label="Seçili Kapasite" value={capacity} tone={capacity >= students.length ? "emerald" : "red"} />
            <StatTile label="Derslik" value={selectedRooms.length} />
            <StatTile label="Plan" value={plan ? (plan.mode === "butterfly" ? "Kelebek" : "Sıralı") : "Yok"} tone={plan ? "indigo" : "amber"} />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <StudentListCard students={students} onChange={setStudents} onFile={onFile} onPaste={() => setPasteOpen(true)} courseCode={course.code} />
        <div className="space-y-4">
          <Card>
            <CardHeader icon={<Shuffle className="h-4 w-4" />} title="Derslik Dağıtım Motoru" description={entry ? `Sınav programındaki derslikler önceden seçildi (${entry.rooms.length}).` : "Bu ders sınav programında yok; derslikleri elle seçin."} />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.rooms.map((r) => {
                  const on = roomIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRoomIds(on ? roomIds.filter((x) => x !== r.id) : [...roomIds, r.id])}
                      className={cn("rounded-lg px-3 py-2 text-left text-xs ring-1 cursor-pointer", on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white ring-slate-300 hover:bg-slate-50")}
                    >
                      <div className="font-semibold">{r.name}</div>
                      <div className={on ? "text-indigo-100" : "text-slate-500"}>{r.capacity} kişilik</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg bg-slate-100 p-1">
                  <button onClick={() => setMode("butterfly")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer", mode === "butterfly" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600")}>
                    <Shuffle className="h-3.5 w-3.5" /> Rastgele Karıştır (Kelebek / Anti-Kopya)
                  </button>
                  <button onClick={() => setMode("sorted")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer", mode === "sorted" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600")}>
                    <SortAsc className="h-3.5 w-3.5" /> Numara Sıralı
                  </button>
                </div>
                <Checkbox checked={alternate} onChange={setAlternate} label="A/B kitapçıkları dönüşümlü dağıt" />
                <Button onClick={distribute} className="ml-auto">
                  <Shuffle className="h-4 w-4" /> Dağıt ve Sıra No Ata
                </Button>
              </div>
              {capacity < students.length && <p className="text-xs text-red-600">Kapasite {students.length - capacity} sıra eksik.</p>}
            </CardBody>
          </Card>
          {ctx && <PlanPreview ctx={ctx} />}
        </div>
      </div>

      {ctx && <OutputsCard ctx={ctx} mask={mask} setMask={setMask} />}

      <PasteDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onApply={(list, replace) => {
          const merged = replace ? list : [...students, ...list.filter((s) => !students.some((x) => x.no === s.no))];
          setStudents(merged);
          update("courses", (p) => p.map((c) => (c.id === course.id ? { ...c, studentCount: merged.length } : c)));
          toast.success(`${list.length} öğrenci aktarıldı`);
        }}
      />
    </div>
  );
}

function StudentListCard({
  students,
  onChange,
  onFile,
  onPaste,
  courseCode,
}: {
  students: Student[];
  onChange: (l: Student[]) => void;
  onFile: (f?: File) => void;
  onPaste: () => void;
  courseCode: string;
}) {
  const [q, setQ] = React.useState("");
  const [preview, setPreview] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);
  const filtered = students.filter((s) => `${s.no} ${s.firstName} ${s.lastName}`.toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR")));
  return (
    <Card>
      <CardHeader
        icon={<FileSpreadsheet className="h-4 w-4" />}
        title={`OBS Öğrenci Listesi — ${courseCode}`}
        description="Excel (.xlsx/.xls) veya CSV yükleyin ya da kopyala-yapıştır yapın. Liste yalnızca şifreli kasada tutulur."
        actions={
          <>
            <Button size="sm" onClick={() => ref.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Excel/CSV Yükle
            </Button>
            <input
              ref={ref}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" onClick={onPaste}>
              <ClipboardPaste className="h-3.5 w-3.5" /> Yapıştır
            </Button>
            <Button size="sm" variant="ghost" onClick={downloadStudentTemplate}>
              <Download className="h-3.5 w-3.5" /> Şablon
            </Button>
          </>
        }
      />
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder="Numara veya ad ara…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Switch checked={preview} onChange={setPreview} label={<span className="flex items-center gap-1 text-xs"><EyeOff className="h-3.5 w-3.5" /> KVKK görünüm</span>} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange([...students, { id: uid("st"), no: String(Number(students[students.length - 1]?.no ?? 251010000) + 1), firstName: "Yeni", lastName: "ÖĞRENCİ" }])}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-200 scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Öğrenci No</th>
                <th className="px-3 py-2">Adı</th>
                <th className="px-3 py-2">Soyadı</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-1 text-xs text-slate-400">{i + 1}</td>
                  {preview ? (
                    <>
                      <td className="px-3 py-1 font-mono text-xs">{maskStudentNo(s.no)}</td>
                      <td className="px-3 py-1" colSpan={2}>{maskName(fullName(s))}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-1">
                        <input className="w-28 bg-transparent font-mono text-xs outline-none" value={s.no} onChange={(e) => onChange(students.map((x) => (x.id === s.id ? { ...x, no: e.target.value } : x)))} />
                      </td>
                      <td className="px-3 py-1">
                        <input className="w-full bg-transparent outline-none" value={s.firstName} onChange={(e) => onChange(students.map((x) => (x.id === s.id ? { ...x, firstName: e.target.value } : x)))} />
                      </td>
                      <td className="px-3 py-1">
                        <input className="w-full bg-transparent outline-none" value={s.lastName} onChange={(e) => onChange(students.map((x) => (x.id === s.id ? { ...x, lastName: e.target.value.toLocaleUpperCase("tr-TR") } : x)))} />
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1">
                    <button className="text-slate-300 hover:text-red-500 cursor-pointer" onClick={() => onChange(students.filter((x) => x.id !== s.id))} aria-label="Öğrenciyi sil">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">Öğrenci yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>{students.length} öğrenci</span>
          <button className="underline cursor-pointer" onClick={() => onChange([...students].sort(compareStudentNo))}>
            Numaraya göre sırala
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function PlanPreview({ ctx }: { ctx: SeatingCtx }) {
  const sheets = roomSheets(ctx, false);
  const [roomId, setRoomId] = React.useState(sheets[0]?.room.id);
  const sheet = sheets.find((s) => s.room.id === roomId) ?? sheets[0];
  if (!sheet) return null;
  const cols = 6;
  return (
    <Card>
      <CardHeader
        title="Oturma Planı Önizleme"
        description={`Plan: ${new Date(ctx.plan.generatedAt).toLocaleString("tr-TR")} · tohum ${ctx.plan.seed}`}
        actions={
          <div className="flex gap-1">
            {sheets.map((s) => (
              <Button key={s.room.id} size="sm" variant={s.room.id === sheet.room.id ? "default" : "outline"} onClick={() => setRoomId(s.room.id)}>
                {s.room.name} ({s.rows.length})
              </Button>
            ))}
          </div>
        }
      />
      <CardBody>
        <div className="mb-2 rounded-md bg-slate-800 py-1 text-center text-[11px] font-medium text-white">KÜRSÜ / TAHTA</div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {sheet.rows.map((r) => (
            <div key={r.seatNo} className={cn("rounded-md border px-1.5 py-1 text-[10.5px]", r.booklet === "A" ? "border-sky-200 bg-sky-50" : "border-violet-200 bg-violet-50")} title={`${r.no} ${r.name}`}>
              <div className="flex justify-between font-semibold">
                <span>#{r.seatNo}</span>
                <Badge tone={r.booklet === "A" ? "sky" : "violet"} className="px-1 py-0 text-[9px]">{r.booklet}</Badge>
              </div>
              <div className="truncate text-slate-700">{r.name}</div>
              <div className="font-mono text-[9.5px] text-slate-500">{r.no}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
          <span>A kitapçığı: {sheet.countA}</span>
          <span>B kitapçığı: {sheet.countB}</span>
          <span>Gözetmen: {sheet.invigilatorNames.join(", ") || "—"}</span>
        </div>
      </CardBody>
    </Card>
  );
}

function OutputsCard({ ctx, mask, setMask }: { ctx: SeatingCtx; mask: boolean; setMask: (v: boolean) => void }) {
  const data = useData();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [coverMask, setCoverMask] = React.useState(false);
  const picked = pickEvidenceSamples(ctx.exam, data.grades[ctx.exam.id]);
  const [manual, setManual] = React.useState<Record<string, string>>({});
  const samples: EvidenceSample[] = picked.samples.length
    ? picked.samples
    : (["En Yüksek", "Ortalama", "En Düşük"] as const).map((kind) => {
        const st = ctx.students.find((s) => s.id === manual[kind]);
        return { kind, studentNo: st?.no ?? "", fullName: st ? fullName(st) : "", score: 0 };
      });

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error("Çıktı üretilemedi", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const items = [
    {
      key: "door",
      icon: <Users className="h-4 w-4" />,
      title: "Sınav Kapı Listesi",
      desc: "Derslik başına bir sayfa; Sıra No, Öğrenci No, Ad Soyad, Kitapçık.",
      word: () => exportDoorListDocx(ctx, mask),
      pdf: () => printDocument(<DoorListDocument ctx={ctx} mask={mask} />, { title: `${ctx.course.code} Kapi Listesi` }),
      extra: <Switch checked={mask} onChange={setMask} label={<span className="text-xs">KVKK maskeleme (251010*** - A*** Y***)</span>} />,
    },
    {
      key: "att",
      icon: <FileDown className="h-4 w-4" />,
      title: "Resmi Sınav Yoklama ve İmza Tutanağı",
      desc: "İmza sütunu + Sınava Giren/Girmeyen/Teslim Edilen Evrak ve Gözetmen/Ders Sorumlusu imza bloğu.",
      word: () => exportAttendanceDocx(ctx),
      pdf: () => printDocument(<AttendanceDocument ctx={ctx} />, { title: `${ctx.course.code} Yoklama Tutanagi` }),
    },
    {
      key: "env",
      icon: <Mail className="h-4 w-4" />,
      title: "Sınav Zarfı Üst Etiketi",
      desc: "Her derslik için zarf etiketi: kitapçık dağılımı, kağıt sayısı, teslim imzaları.",
      word: () => exportEnvelopeDocx(ctx),
      pdf: () => printDocument(<EnvelopeDocument ctx={ctx} />, { title: `${ctx.course.code} Sinav Zarfi` }),
    },
  ];

  return (
    <Card>
      <CardHeader title="Resmi Çıktılar (.docx / A4 PDF)" description="Tüm belgeler kurum antetli ve düzenlenebilir Word formatındadır." />
      <CardBody className="grid gap-4 lg:grid-cols-2">
        {items.map((it) => (
          <div key={it.key} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-indigo-600">{it.icon}</span> {it.title}
            </div>
            <p className="mt-1 text-xs text-slate-500">{it.desc}</p>
            {it.extra && <div className="mt-2">{it.extra}</div>}
            <div className="mt-3 flex gap-2">
              <Button size="sm" loading={busy === it.key} onClick={() => run(it.key, it.word, `${it.title} indirildi`)}>
                <FileDown className="h-3.5 w-3.5" /> Word (.docx)
              </Button>
              <Button size="sm" variant="outline" onClick={it.pdf}>
                <Printer className="h-3.5 w-3.5" /> A4 PDF
              </Button>
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FolderArchive className="h-4 w-4 text-indigo-600" /> {data.institution.accreditationBody} Kanıt Klasörü Kapakları
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {picked.samples.length ? "Modül 6 notlarından otomatik seçildi:" : "Not girilmediği için örnek kağıtları elle seçin:"}
          </p>
          <div className="mt-2 space-y-1.5">
            {samples.map((s) =>
              picked.samples.length ? (
                <div key={s.kind} className="flex justify-between rounded-md bg-slate-50 px-2 py-1 text-xs">
                  <span className="font-semibold">{s.kind}</span>
                  <span>
                    {s.studentNo} {s.fullName} — <strong>{s.score}</strong>
                  </span>
                </div>
              ) : (
                <div key={s.kind} className="flex items-center gap-2 text-xs">
                  <span className="w-20 font-semibold">{s.kind}</span>
                  <Select className="h-8" value={manual[s.kind] ?? ""} onChange={(e) => setManual({ ...manual, [s.kind]: e.target.value })}>
                    <option value="">Öğrenci seçin</option>
                    {ctx.students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.no} {fullName(st)}
                      </option>
                    ))}
                  </Select>
                </div>
              ),
            )}
          </div>
          <div className="mt-2">
            <Switch checked={coverMask} onChange={setCoverMask} label={<span className="text-xs">Kapaklarda KVKK maskeleme</span>} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              loading={busy === "cov"}
              onClick={() => run("cov", () => exportEvidenceCoversDocx({ inst: data.institution, course: ctx.course, exam: ctx.exam }, samples, picked.classMean, coverMask), "Kanıt klasörü kapakları indirildi")}
            >
              <FileDown className="h-3.5 w-3.5" /> Word (.docx)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                printDocument(<EvidenceCoversDocument inst={data.institution} course={ctx.course} exam={ctx.exam} samples={samples} classMean={picked.classMean} mask={coverMask} />, {
                  title: `${ctx.course.code} Kanit Klasoru Kapaklari`,
                })
              }
            >
              <Printer className="h-3.5 w-3.5" /> A4 PDF
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function PasteDialog({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (l: Student[], replace: boolean) => void }) {
  const [text, setText] = React.useState("");
  const [replace, setReplace] = React.useState(true);
  const parsed = parseStudentText(text);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Kopyala-Yapıştır Öğrenci Listesi"
      description="OBS ekranından veya Excel'den satırları kopyalayın: '251010001 Ahmet Yılmaz', sekmeli ya da noktalı virgüllü biçimler desteklenir."
      footer={
        <>
          <Checkbox checked={replace} onChange={setReplace} label="Mevcut listenin yerine koy" />
          <Button
            disabled={!parsed.length}
            onClick={() => {
              onApply(parsed, replace);
              setText("");
              onClose();
            }}
          >
            {parsed.length} öğrenciyi aktar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Textarea rows={14} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Öğrenci No\tAdı\tSoyadı\n251010001\tAhmet\tYILMAZ\n251010002 Ayşe Kaya"} />
        <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs scrollbar-thin">
          {parsed.map((s) => (
            <div key={s.id} className="flex gap-2 border-b border-slate-100 py-0.5">
              <span className="w-24 font-mono">{s.no}</span>
              <span>{fullName(s)}</span>
            </div>
          ))}
          {!parsed.length && <div className="p-4 text-center text-slate-400">Ayıklanan öğrenci yok</div>}
        </div>
      </div>
    </Dialog>
  );
}
