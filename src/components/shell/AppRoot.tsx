"use client";

import * as React from "react";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useVault } from "@/lib/store";
import { installNetworkAudit } from "@/lib/networkAudit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Toaster } from "@/components/ui/toast";
import { ConfirmHost, confirmDialog } from "@/components/ui/confirm";
import { PrintHost } from "@/components/print/PrintHost";
import { AppShell } from "./AppShell";
import { BrandMark } from "./BrandMark";
import { CryptoLattice } from "@/components/three/CryptoLattice";

if (typeof window !== "undefined") installNetworkAudit();

export function AppRoot() {
  const status = useVault((s) => s.status);
  const boot = useVault((s) => s.boot);

  React.useEffect(() => {
    void boot();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      // İlk ziyarette servis çalışanı devreye girmeden yüklenen uygulama parçalarını da önbelleğe aldır (çevrimdışı ilk yeniden yükleme)
      void navigator.serviceWorker.ready.then((reg) => {
        const urls = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => u.startsWith(`${location.origin}/_next/static/`));
        reg.active?.postMessage({ type: "precache", urls });
      });
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
    <div className="theme-invariant relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-6">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <CryptoLattice variant="dark" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgb(9_9_11/0.55)_55%,rgb(9_9_11/0.95)_100%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/70 p-8 text-zinc-100 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}

function BootScreen() {
  return (
    <Frame>
      <div className="flex flex-col items-center text-center">
        <BrandMark inverted className="h-11 w-11" />
        <h1 className="font-display mt-4 text-2xl font-medium text-white">AkrediteSınav</h1>
        <p className="mt-1 text-sm text-zinc-400">Şifreli yerel kasa açılıyor…</p>
        <div className="mt-5 flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" /> AES-256-GCM · IndexedDB · PBKDF2
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
      <ShieldAlert className="h-9 w-9 text-red-400" />
      <h1 className="font-display mt-3 text-2xl font-medium text-white">Kasa açılamadı</h1>
      <p className="mt-1 text-sm text-zinc-300">{error}</p>
      <p className="mt-3 text-xs text-zinc-500">
        Gizli (incognito) pencerede IndexedDB kısıtlanmış olabilir. Normal pencerede deneyin veya kasayı sıfırlayın.
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={() => window.location.reload()}>Yeniden Dene</Button>
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
          <BrandMark inverted className="h-10 w-10" />
          <div>
            <h1 className="font-display text-2xl font-medium text-white">Kasa kilitli</h1>
            <p className="text-xs text-zinc-400">Master parolanızla şifreli kasayı çözün.</p>
          </div>
        </div>
        <div className="mt-5">
          <Input
            type="password"
            autoFocus
            placeholder="Master parola"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="h-11 border-white/10 bg-white/5 text-white placeholder:text-zinc-500 hover:border-white/20 focus:border-brand-400"
          />
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
        </div>
        <Button type="submit" size="lg" className="mt-4 w-full bg-white text-zinc-950 hover:bg-zinc-200" loading={busy} disabled={!pw}>
          <KeyRound className="h-4 w-4" /> Kilidi Aç (PBKDF2 · 100.000 iterasyon)
        </Button>
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
          Parolanız hiçbir yere gönderilmez ve saklanmaz. Parolayı unutursanız veriler kurtarılamaz — Zero-Knowledge mimarisinin doğası budur.
        </p>
        <button
          type="button"
          className="mt-3 cursor-pointer text-[11px] text-red-400 underline underline-offset-2"
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
