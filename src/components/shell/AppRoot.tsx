"use client";

import * as React from "react";
import { KeyRound, Loader2, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { useVault } from "@/lib/store";
import { installNetworkAudit } from "@/lib/networkAudit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Toaster } from "@/components/ui/toast";
import { ConfirmHost, confirmDialog } from "@/components/ui/confirm";
import { PrintHost } from "@/components/print/PrintHost";
import { AppShell } from "./AppShell";

if (typeof window !== "undefined") installNetworkAudit();

export function AppRoot() {
  const status = useVault((s) => s.status);
  const boot = useVault((s) => s.boot);

  React.useEffect(() => {
    void boot();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, [boot]);

  return (
    <>
      {status === "booting" && <BootScreen />}
      {status === "locked" && <LockScreen />}
      {status === "error" && <ErrorScreen />}
      {status === "ready" && <AppShell />}
      <PrintHost />
      <Toaster />
      <ConfirmHost />
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">{children}</div>
    </div>
  );
}

function BootScreen() {
  return (
    <Frame>
      <div className="flex flex-col items-center text-center">
        <ShieldCheck className="h-12 w-12 text-indigo-700" />
        <h1 className="mt-3 text-lg font-semibold">AkrediteSınav</h1>
        <p className="mt-1 text-sm text-slate-500">Şifreli yerel kasa açılıyor…</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> AES-256-GCM • IndexedDB
        </div>
      </div>
    </Frame>
  );
}

function ErrorScreen() {
  const error = useVault((s) => s.error);
  const wipe = useVault((s) => s.wipe);
  return (
    <Frame>
      <ShieldAlert className="h-10 w-10 text-red-600" />
      <h1 className="mt-3 text-lg font-semibold">Kasa açılamadı</h1>
      <p className="mt-1 text-sm text-slate-600">{error}</p>
      <p className="mt-3 text-xs text-slate-500">
        Gizli (incognito) pencerede IndexedDB kısıtlanmış olabilir. Normal pencerede deneyin veya kasayı sıfırlayın.
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>Yeniden Dene</Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (await confirmDialog({ title: "Kasa sıfırlansın mı?", message: "Tüm yerel şifreli veriler kalıcı olarak silinecek.", destructive: true, confirmLabel: "Sıfırla" })) await wipe();
          }}
        >
          Kasayı Sıfırla
        </Button>
      </div>
    </Frame>
  );
}

function LockScreen() {
  const unlock = useVault((s) => s.unlock);
  const wipe = useVault((s) => s.wipe);
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await unlock(pw);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Frame>
      <form onSubmit={submit}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Kasa Kilitli</h1>
            <p className="text-xs text-slate-500">Master parolanızla şifreli kasayı çözün.</p>
          </div>
        </div>
        <div className="mt-5">
          <Input type="password" autoFocus placeholder="Master parola" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        </div>
        <Button type="submit" className="mt-4 w-full" loading={busy} disabled={!pw}>
          <KeyRound className="h-4 w-4" /> Kilidi Aç (PBKDF2 · 100.000 iterasyon)
        </Button>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Parolanız hiçbir yere gönderilmez ve saklanmaz. Parolayı unutursanız veriler kurtarılamaz — Zero-Knowledge mimarisinin doğası budur.
        </p>
        <button
          type="button"
          className="mt-3 text-[11px] text-red-600 underline"
          onClick={async () => {
            if (
              await confirmDialog({
                title: "Parolamı unuttum — kasayı sil",
                message: "Şifreli kasa kalıcı olarak silinecek ve demo verisiyle yeni bir kasa oluşturulacak. .akredite yedeğiniz varsa sonradan geri yükleyebilirsiniz.",
                destructive: true,
                confirmLabel: "Kasayı Sil",
              })
            )
              await wipe();
          }}
        >
          Parolamı unuttum (kasayı sil)
        </button>
      </form>
    </Frame>
  );
}
