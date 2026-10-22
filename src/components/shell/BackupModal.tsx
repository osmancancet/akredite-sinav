"use client";

import * as React from "react";
import { ArchiveRestore, Download, FileLock2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import { exportAkredite, importAkredite, KDF_ITERATIONS } from "@/lib/cryptoVault";
import { useVault } from "@/lib/store";
import { downloadBlob, todayIso } from "@/lib/utils";

export function BackupModal({ mode, onClose }: { mode: false | "export" | "import"; onClose: () => void }) {
  const [tab, setTab] = React.useState<"export" | "import">("export");
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const flush = useVault((s) => s.flush);
  const replaceAll = useVault((s) => s.replaceAll);
  const [lastMode, setLastMode] = React.useState(mode);

  if (mode !== lastMode) {
    setLastMode(mode);
    if (mode) {
      setTab(mode);
      setPw("");
      setPw2("");
      setFile(null);
    }
  }

  const doExport = async () => {
    if (pw.length < 6) return toast.error("Parola en az 6 karakter olmalıdır.");
    if (pw !== pw2) return toast.error("Parolalar eşleşmiyor.");
    setBusy(true);
    try {
      await flush();
      const data = useVault.getState().data;
      if (!data) return;
      const blob = await exportAkredite(data, pw);
      downloadBlob(blob, `AkrediteSinav_Yedek_${todayIso()}.akredite`);
      useVault.getState().update("ui", (u) => ({ ...u, lastBackupAt: new Date().toISOString() }));
      toast.success(".akredite yedeği indirildi", "Paket PBKDF2 + AES-256-GCM ile şifrelendi.");
      onClose();
    } catch (e) {
      toast.error("Yedek oluşturulamadı", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!file) return toast.error("Bir .akredite dosyası seçin.");
    setBusy(true);
    try {
      const data = await importAkredite(file, pw);
      const ok = await confirmDialog({
        title: "Yedek geri yüklensin mi?",
        message: `Yedekte ${data.courses?.length ?? 0} ders, ${data.exams?.length ?? 0} sınav ve ${data.rubrics?.length ?? 0} rubrik bulundu. Mevcut kasa içeriğinin yerini alacak.`,
        confirmLabel: "Geri Yükle",
      });
      if (!ok) return;
      await replaceAll({ ...data, ui: { ...data.ui, onboarded: true, lastBackupAt: new Date().toISOString() } });
      toast.success("Yedek başarıyla geri yüklendi");
      onClose();
    } catch (e) {
      toast.error("Geri yükleme başarısız", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!mode}
      onClose={onClose}
      title="Şifreli .akredite Yedek Paketi"
      description={`PBKDF2-SHA256 (${KDF_ITERATIONS.toLocaleString("tr-TR")} iterasyon) + AES-256-GCM. Yedek parolası hiçbir yerde saklanmaz.`}
      icon={<FileLock2 className="h-5 w-5 text-brand-600" />}
      footer={
        tab === "export" ? (
          <Button onClick={doExport} loading={busy}>
            <Download className="h-4 w-4" /> Şifrele ve İndir
          </Button>
        ) : (
          <Button onClick={doImport} loading={busy}>
            <ArchiveRestore className="h-4 w-4" /> Çöz ve Geri Yükle
          </Button>
        )
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "export", label: "Yedek İndir", icon: <Download className="h-3.5 w-3.5" /> },
          { value: "import", label: "Yedek Yükle", icon: <ArchiveRestore className="h-3.5 w-3.5" /> },
        ]}
      />
      <div className="mt-4 space-y-3">
        {tab === "import" && (
          <Field label=".akredite dosyası">
            <Input type="file" accept=".akredite,application/octet-stream,application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="py-1.5" />
          </Field>
        )}
        <Field label="Yedek parolası">
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </Field>
        {tab === "export" && (
          <Field label="Parola (tekrar)">
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </Field>
        )}
        <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
          {tab === "export"
            ? "Paket; tüm dersler, sınavlar, öğrenci listeleri, program, rubrikler, notlar ve şifreli AI anahtarlarınızı içerir. Başka bir bilgisayarda aynı parolayla açabilirsiniz."
            : "Hatalı parola veya değiştirilmiş dosyada AES-GCM kimlik doğrulama etiketi tutmaz ve içe aktarma reddedilir."}
        </div>
      </div>
    </Dialog>
  );
}
