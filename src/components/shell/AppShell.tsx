"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArchiveRestore,
  ChevronDown,
  Database,
  Download,
  Lock,
  Menu,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useVault, useData } from "@/lib/store";
import { useHashRoute } from "@/hooks/useHashRoute";
import { useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";
import { MODULES, type ModuleId } from "./modules";
import { SecurityAuditModal } from "./SecurityAuditModal";
import { BackupModal } from "./BackupModal";
import { VaultModule } from "@/modules/vault/VaultModule";
import { ExamStudio } from "@/modules/exam/ExamStudio";
import { SchedulerModule } from "@/modules/scheduler/SchedulerModule";
import { SeatingModule } from "@/modules/seating/SeatingModule";
import { RubricStudio } from "@/modules/rubric/RubricStudio";
import { MedekModule } from "@/modules/medek/MedekModule";
import { AiModule } from "@/modules/ai/AiModule";

const VIEWS: Record<ModuleId, React.ComponentType> = {
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
  const [auditOpen, setAuditOpen] = React.useState(false);
  const [backupOpen, setBackupOpen] = React.useState<false | "export" | "import">(false);
  const [mobileNav, setMobileNav] = React.useState(false);
  const View = VIEWS[route];
  const current = MODULES.find((m) => m.id === route)!;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gradient-to-b from-indigo-950 to-slate-950 text-indigo-100 transition-transform lg:translate-x-0",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="rounded-xl bg-indigo-600/30 p-2 ring-1 ring-indigo-400/30">
            <ShieldCheck className="h-6 w-6 text-indigo-200" />
          </div>
          <div>
            <div className="text-base font-semibold text-white">AkrediteSınav</div>
            <div className="text-[11px] text-indigo-300">Zero-Knowledge Akademik Stüdyo</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setMobileNav(false)} aria-label="Menüyü kapat">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          {MODULES.map((m) => {
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
                  "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
                  active ? "bg-white/10 text-white ring-1 ring-white/15" : "text-indigo-200 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold", active ? "bg-indigo-500 text-white" : "bg-white/10 text-indigo-200")}>
                  {m.no}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="h-3.5 w-3.5" /> {m.label}
                  </span>
                  <span className="block truncate text-[11px] text-indigo-300/80">{m.short}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <SidebarFooter onAudit={() => setAuditOpen(true)} />
      </aside>
      {mobileNav && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileNav(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <TopBar
          onMenu={() => setMobileNav(true)}
          onAudit={() => setAuditOpen(true)}
          onBackup={(m) => setBackupOpen(m)}
          onAi={() => navigate("ai")}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                Modül {current.no} · {current.emoji}
              </div>
              <h1 className="text-xl font-semibold text-slate-900">{current.label}</h1>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={route} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <View />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <SecurityAuditModal open={auditOpen} onClose={() => setAuditOpen(false)} />
      <BackupModal mode={backupOpen} onClose={() => setBackupOpen(false)} />
    </div>
  );
}

function SidebarFooter({ onAudit }: { onAudit: () => void }) {
  const mode = useVault((s) => s.mode);
  const saving = useVault((s) => s.saving);
  const lastSavedAt = useVault((s) => s.lastSavedAt);
  return (
    <div className="border-t border-white/10 p-4 text-[11px] text-indigo-300">
      <button onClick={onAudit} className="flex w-full items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-left text-emerald-300 ring-1 ring-emerald-400/20 hover:bg-emerald-500/20 cursor-pointer">
        <ShieldCheck className="h-4 w-4" />
        <span>
          <span className="block font-medium">AES-256-GCM aktif</span>
          <span className="block text-emerald-400/80">{mode === "password" ? "Master parola koruması" : "Otomatik yerel kasa anahtarı"}</span>
        </span>
      </button>
      <div className="mt-2 flex items-center gap-1.5">
        <Database className="h-3 w-3" />
        {saving ? "Şifreleniyor…" : lastSavedAt ? `Son şifreli yazım: ${new Date(lastSavedAt).toLocaleTimeString("tr-TR")}` : "Hazır"}
      </div>
    </div>
  );
}

function TopBar({
  onMenu,
  onAudit,
  onBackup,
  onAi,
}: {
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
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button className="lg:hidden" onClick={onMenu} aria-label="Menü">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{inst.unitName || "Kurum bilgisi girilmedi"}</div>
        <div className="truncate text-xs text-slate-500">
          {[inst.university, inst.department, `${inst.academicYear} ${inst.semester}`].filter(Boolean).join(" · ")}
        </div>
      </div>

      <span
        className={cn(
          "hidden items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium md:inline-flex",
          online ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800",
        )}
        title="Uygulama çevrimdışı da tam çalışır"
      >
        {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {online ? "Çevrimiçi" : "Çevrimdışı (Uçak Modu) — tam işlevsel"}
      </span>

      <button
        onClick={onAudit}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 cursor-pointer"
      >
        <ShieldCheck className="h-4 w-4" />
        <span className="hidden xl:inline">🔒 Zero-Knowledge: Verileriniz Cihazınızdan Çıkmaz</span>
        <span className="xl:hidden">Zero-Knowledge</span>
      </button>

      <Button variant="ai" size="sm" onClick={onAi} className="hidden sm:inline-flex">
        <Sparkles className="h-3.5 w-3.5" /> AI Asistan Ayarları
      </Button>

      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setMenu((v) => !v)}>
          <Database className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Veri & Yedek</span> <ChevronDown className="h-3 w-3" />
        </Button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <MenuItem
                icon={<Download className="h-4 w-4 text-indigo-600" />}
                title=".akredite Yedek İndir"
                desc="Tüm kasa, parolalı AES-256 paket olarak"
                onClick={() => {
                  setMenu(false);
                  onBackup("export");
                }}
              />
              <MenuItem
                icon={<ArchiveRestore className="h-4 w-4 text-indigo-600" />}
                title=".akredite Yedek Yükle"
                desc="Şifreli yedekten geri yükle"
                onClick={() => {
                  setMenu(false);
                  onBackup("import");
                }}
              />
              <div className="my-1 border-t border-slate-100" />
              <MenuItem
                icon={<RefreshCw className="h-4 w-4 text-emerald-600" />}
                title="Örnek Veriyi Sıfırla / Yükle"
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
                icon={<Trash2 className="h-4 w-4 text-red-600" />}
                title="Tüm Veriyi Temizle"
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
                  <div className="my-1 border-t border-slate-100" />
                  <MenuItem icon={<Lock className="h-4 w-4 text-slate-700" />} title="Kasayı Kilitle" desc="Anahtar bellekten silinir" onClick={() => lock()} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function MenuItem({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 cursor-pointer">
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-[11px] text-slate-500">{desc}</span>
      </span>
    </button>
  );
}
