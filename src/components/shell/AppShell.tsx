"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArchiveRestore,
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  UserRound,
  Database,
  Download,
  Lock,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useVault, useData } from "@/lib/store";
import { useHashRoute } from "@/hooks/useHashRoute";
import { useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/ui/card";
import { confirmDialog } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";
import { MODULE_GROUPS, MODULES, type ModuleId } from "./modules";
import { SecurityAuditModal } from "./SecurityAuditModal";
import { BackupModal } from "./BackupModal";
import { CommandPalette, type CommandItem } from "./CommandPalette";
import { BrandMark } from "./BrandMark";
import { useShellUi } from "./shellStore";
import { VaultModule } from "@/modules/vault/VaultModule";
import { OverviewModule } from "@/modules/overview/OverviewModule";
import { CourseImportDialog } from "@/modules/vault/CourseImportDialog";
import { BackupReminder } from "./BackupReminder";
import { OnboardingWizard } from "./OnboardingWizard";
import { requestPersistentStorage } from "@/hooks/useStoragePersist";
import { ExamStudio } from "@/modules/exam/ExamStudio";
import { SchedulerModule } from "@/modules/scheduler/SchedulerModule";
import { SeatingModule } from "@/modules/seating/SeatingModule";
import { RubricStudio } from "@/modules/rubric/RubricStudio";
import { MedekModule } from "@/modules/medek/MedekModule";
import { AiModule } from "@/modules/ai/AiModule";

const VIEWS: Record<ModuleId, React.ComponentType> = {
  genel: OverviewModule,
  kasa: VaultModule,
  sinav: ExamStudio,
  program: SchedulerModule,
  oturma: SeatingModule,
  rubrik: RubricStudio,
  medek: MedekModule,
  ai: AiModule,
};

export function AppShell() {
  const [route, navigate] = useHashRoute();
  const auditOpen = useShellUi((s) => s.auditOpen);
  const setAuditOpen = useShellUi((s) => s.setAudit);
  const backupOpen = useShellUi((s) => s.backupMode);
  const setBackupOpen = useShellUi((s) => s.setBackup);
  const courseImportOpen = useShellUi((s) => s.courseImportOpen);
  const setCourseImport = useShellUi((s) => s.setCourseImport);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const mode = useVault((s) => s.mode);
  const lock = useVault((s) => s.lock);
  const loadDemo = useVault((s) => s.loadDemo);
  const View = VIEWS[route];
  const current = MODULES.find((m) => m.id === route)!;
  const data = useData();
  const update = useVault((s) => s.update);

  const recordCommands: CommandItem[] = React.useMemo(() => {
    const out: CommandItem[] = [];
    data.courses.forEach((c) =>
      out.push({
        id: `course-${c.id}`,
        label: `${c.code} ${c.name}`,
        hint: `${c.classYear}. sınıf · ${c.instructor}`,
        group: "Dersler",
        icon: <BookOpen />,
        searchOnly: true,
        run: () => {
          const exam = data.exams.find((e) => e.courseId === c.id);
          if (exam) update("ui", (u) => ({ ...u, activeExamId: exam.id, activeCourseId: c.id }));
          navigate(exam ? "sinav" : "kasa");
        },
      }),
    );
    data.exams.forEach((e) => {
      const c = data.courses.find((x) => x.id === e.courseId);
      out.push({
        id: `exam-${e.id}`,
        label: e.title,
        hint: `${c?.code ?? ""} · ${e.questions.length} soru`,
        group: "Sınavlar",
        icon: <FileText />,
        searchOnly: true,
        run: () => {
          update("ui", (u) => ({ ...u, activeExamId: e.id }));
          navigate("sinav");
        },
      });
    });
    data.rubrics.forEach((r) =>
      out.push({
        id: `rubric-${r.id}`,
        label: r.title,
        group: "Rubrikler",
        icon: <ClipboardList />,
        searchOnly: true,
        run: () => {
          update("ui", (u) => ({ ...u, activeRubricId: r.id }));
          navigate("rubrik");
        },
      }),
    );
    Object.entries(data.students).forEach(([courseId, list]) => {
      const c = data.courses.find((x) => x.id === courseId);
      list.forEach((st) =>
        out.push({
          id: `student-${courseId}-${st.id}`,
          label: `${st.firstName} ${st.lastName}`,
          hint: `${st.no} · ${c?.code ?? ""}`,
          keywords: st.no,
          group: "Öğrenciler",
          icon: <UserRound />,
          searchOnly: true,
          run: () => {
            const exam = data.exams.find((e) => e.courseId === courseId);
            if (exam) update("ui", (u) => ({ ...u, activeExamId: exam.id }));
            navigate("oturma");
          },
        }),
      );
    });
    return out;
  }, [data.courses, data.exams, data.rubrics, data.students, navigate, update]);

  React.useEffect(() => {
    void requestPersistentStorage();
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands: CommandItem[] = React.useMemo(
    () => [
      ...MODULES.map((m) => {
        const Icon = m.icon;
        return { id: `nav-${m.id}`, label: m.label, hint: m.group, group: "Modüller", icon: <Icon />, keywords: m.description, run: () => navigate(m.id) };
      }),
      { id: "audit", label: "Güvenliği kanıtla", hint: "Zero-Knowledge denetçisi", group: "Eylemler", icon: <ShieldCheck />, keywords: "şifre aes ağ çevrimdışı", run: () => setAuditOpen(true) },
      { id: "import-courses", label: "Dersleri içe aktar", hint: "Bologna / Excel", group: "Eylemler", icon: <Upload />, keywords: "ders katalog bologna excel csv", run: () => setCourseImport(true) },
      { id: "backup", label: ".akredite yedeği indir", group: "Eylemler", icon: <Download />, keywords: "yedek export", run: () => setBackupOpen("export") },
      { id: "restore", label: ".akredite yedeğini yükle", group: "Eylemler", icon: <ArchiveRestore />, keywords: "geri yükle import", run: () => setBackupOpen("import") },
      {
        id: "demo",
        label: "Örnek veriyi yükle",
        group: "Eylemler",
        icon: <RefreshCw />,
        keywords: "demo seeder",
        run: async () => {
          if (await confirmDialog({ title: "Örnek akademik veri yüklensin mi?", message: "Mevcut kasa içeriği demo veri setiyle değiştirilecek (AI anahtarlarınız korunur).", confirmLabel: "Demo Veriyi Yükle" })) {
            await loadDemo();
            toast.success("Demo veri seti yüklendi");
          }
        },
      },
      ...(mode === "password" ? [{ id: "lock", label: "Kasayı kilitle", group: "Eylemler", icon: <Lock />, run: () => lock() }] : []),
    ],
    [navigate, loadDemo, lock, mode, setAuditOpen, setBackupOpen, setCourseImport],
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200/80 bg-[oklch(0.975_0.003_95)] transition-transform lg:translate-x-0",
          mobileNav ? "translate-x-0 shadow-[var(--shadow-pop)]" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <BrandMark className="h-8 w-8" />
          <div className="min-w-0 leading-tight">
            <div className="font-display text-[17px] font-medium text-zinc-950">AkrediteSınav</div>
            <div className="truncate text-[11px] text-zinc-500">Zero-Knowledge akademik stüdyo</div>
          </div>
          <button className="ml-auto text-zinc-500 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Menüyü kapat">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-left text-[12.5px] text-zinc-400 shadow-[var(--shadow-card)] hover:border-zinc-300"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1">Ara veya komut çalıştır</span>
            <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 font-mono text-[10px] text-zinc-500">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          {MODULE_GROUPS.map((g) => (
            <div key={g} className="mt-4 first:mt-2">
              <div className="px-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">{g}</div>
              <div className="space-y-0.5">
                {MODULES.filter((m) => m.group === g).map((m) => {
                  const active = m.id === route;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        navigate(m.id);
                        setMobileNav(false);
                      }}
                      className={cn(
                        "group relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition-colors",
                        active ? "bg-white font-medium text-zinc-950 shadow-[var(--shadow-card)] ring-1 ring-zinc-200/80" : "text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900",
                      )}
                    >
                      {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-brand-600" />}
                      <Icon className={cn("h-4 w-4", active ? "text-brand-700" : "text-zinc-400 group-hover:text-zinc-600")} />
                      <span className="flex-1 truncate" title={m.label}>{m.short}</span>
                      {m.no > 0 && <span className="font-mono text-[10px] text-zinc-300">0{m.no}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <VaultStatus onAudit={() => setAuditOpen(true)} />
      </aside>
      {mobileNav && <div className="fixed inset-0 z-30 bg-zinc-950/30 lg:hidden" onClick={() => setMobileNav(false)} />}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <TopBar
          moduleLabel={current.label}
          group={current.group}
          onMenu={() => setMobileNav(true)}
          onAudit={() => setAuditOpen(true)}
          onBackup={(m) => setBackupOpen(m)}
          onAi={() => navigate("ai")}
        />
        <BackupReminder />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
          <AnimatePresence mode="wait">
            <motion.div key={route} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
              <PageIntro eyebrow={current.no ? `Modül 0${current.no} · ${current.group}` : `${current.group} · ${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}`} title={current.label} description={current.description} />
              <View />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <SecurityAuditModal open={auditOpen} onClose={() => setAuditOpen(false)} />
      <BackupModal mode={backupOpen} onClose={() => setBackupOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={[...commands, ...recordCommands]} />
      <CourseImportDialog open={courseImportOpen} onClose={() => setCourseImport(false)} />
      <OnboardingWizard />
    </div>
  );
}

function VaultStatus({ onAudit }: { onAudit: () => void }) {
  const mode = useVault((s) => s.mode);
  const saving = useVault((s) => s.saving);
  const lastSavedAt = useVault((s) => s.lastSavedAt);
  const online = useOnline();
  return (
    <div className="border-t border-zinc-200/80 p-3">
      <button onClick={onAudit} className="group w-full cursor-pointer rounded-xl border border-zinc-200/80 bg-white p-3 text-left shadow-[var(--shadow-card)] hover:border-brand-300">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60", saving ? "animate-ping bg-brand-400" : "bg-transparent")} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
          </span>
          <span className="text-[12px] font-medium text-zinc-900">AES-256-GCM kasa</span>
          <ShieldCheck className="ml-auto h-3.5 w-3.5 text-zinc-300 group-hover:text-brand-600" />
        </div>
        <div className="mt-1.5 space-y-0.5 font-mono text-[10.5px] text-zinc-500">
          <div>{mode === "password" ? "master parola · bellekte" : "cihaz anahtarı · non-extractable"}</div>
          <div>
            {saving ? "şifreleniyor…" : lastSavedAt ? `son yazım ${new Date(lastSavedAt).toLocaleTimeString("tr-TR")}` : "hazır"} ·{" "}
            <span className={online ? "" : "text-amber-700"}>{online ? "çevrimiçi" : "çevrimdışı"}</span>
          </div>
        </div>
      </button>
    </div>
  );
}

function TopBar({
  moduleLabel,
  group,
  onMenu,
  onAudit,
  onBackup,
  onAi,
}: {
  moduleLabel: string;
  group: string;
  onMenu: () => void;
  onAudit: () => void;
  onBackup: (m: "export" | "import") => void;
  onAi: () => void;
}) {
  const data = useData();
  const online = useOnline();
  const mode = useVault((s) => s.mode);
  const lock = useVault((s) => s.lock);
  const loadDemo = useVault((s) => s.loadDemo);
  const clearAll = useVault((s) => s.clearAll);
  const [menu, setMenu] = React.useState(false);
  const inst = data.institution;

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200/70 bg-[oklch(0.984_0.002_95/0.85)] px-4 backdrop-blur-md sm:px-6 lg:px-10">
      <button className="text-zinc-600 lg:hidden" onClick={onMenu} aria-label="Menü">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
        {inst.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inst.logoDataUrl} alt="" className="h-6 w-6 rounded-sm object-contain" />
        )}
        <span className="hidden truncate text-zinc-500 md:inline">{inst.university || "Kurum seçilmedi"}</span>
        <span className="hidden text-zinc-300 md:inline">/</span>
        <span className="hidden text-zinc-500 sm:inline">{group}</span>
        <span className="hidden text-zinc-300 sm:inline">/</span>
        <span className="truncate font-medium text-zinc-900">{moduleLabel}</span>
      </div>

      <span
        className={cn("hidden items-center gap-1.5 font-mono text-[11px] md:inline-flex", online ? "text-zinc-400" : "text-amber-700")}
        title="Uygulama çevrimdışı da tam çalışır"
      >
        {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {online ? "online" : "uçak modu"}
      </span>

      <button
        onClick={onAudit}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/70 px-2.5 text-[12px] font-medium text-brand-900 hover:border-brand-300 hover:bg-brand-100/70"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-brand-700" />
        <span className="hidden lg:inline">Verileriniz cihazınızdan çıkmaz</span>
        <span className="lg:hidden">Zero-Knowledge</span>
      </button>

      <Button variant="ghost" size="sm" onClick={onAi} className="hidden sm:inline-flex">
        <Sparkles className="h-3.5 w-3.5" /> AI
      </Button>

      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setMenu((v) => !v)}>
          <Database className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Veri</span> <ChevronDown className="h-3 w-3 text-zinc-400" />
        </Button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[var(--shadow-pop)]">
              <MenuItem icon={<Download />} title=".akredite yedeği indir" desc="Tüm kasa, parolalı AES-256 paket" onClick={() => { setMenu(false); onBackup("export"); }} />
              <MenuItem icon={<ArchiveRestore />} title=".akredite yedeğini yükle" desc="Şifreli yedekten geri yükle" onClick={() => { setMenu(false); onBackup("import"); }} />
              <div className="my-1 border-t border-zinc-100" />
              <MenuItem
                icon={<RefreshCw />}
                title="Örnek veriyi yükle"
                desc="VTYS dersi, 6 soru, 75 öğrenci, program"
                onClick={async () => {
                  setMenu(false);
                  if (await confirmDialog({ title: "Örnek akademik veri yüklensin mi?", message: "Mevcut kasa içeriği demo veri setiyle değiştirilecek (AI anahtarlarınız korunur).", confirmLabel: "Demo Veriyi Yükle" })) {
                    await loadDemo();
                    toast.success("Demo veri seti yüklendi", "Tüm modüller örnek verilerle hazır.");
                  }
                }}
              />
              <MenuItem
                icon={<Trash2 />}
                danger
                title="Tüm veriyi temizle"
                desc="Boş kasa ile sıfırdan başla"
                onClick={async () => {
                  setMenu(false);
                  if (await confirmDialog({ title: "Tüm veriler silinsin mi?", message: "Dersler, sınavlar, öğrenci listeleri, program ve notlar silinecek. Önce .akredite yedeği almanız önerilir.", destructive: true, confirmLabel: "Temizle" })) {
                    await clearAll();
                    toast.info("Kasa temizlendi");
                  }
                }}
              />
              {mode === "password" && (
                <>
                  <div className="my-1 border-t border-zinc-100" />
                  <MenuItem icon={<Lock />} title="Kasayı kilitle" desc="Anahtar bellekten silinir" onClick={() => lock()} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function MenuItem({ icon, title, desc, onClick, danger }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-50">
      <span className={cn("mt-0.5 [&_svg]:h-4 [&_svg]:w-4", danger ? "text-red-600" : "text-zinc-500")}>{icon}</span>
      <span>
        <span className={cn("block text-[13px] font-medium", danger ? "text-red-700" : "text-zinc-900")}>{title}</span>
        <span className="block text-[11.5px] text-zinc-500">{desc}</span>
      </span>
    </button>
  );
}
