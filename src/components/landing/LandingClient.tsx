"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CryptoLattice } from "@/components/three/CryptoLattice";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { BrandMark } from "@/components/shell/BrandMark";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

/** Eski "/#/modül" bağlantılarını uygulamaya yönlendirir. */
export function HashRedirect() {
  React.useEffect(() => {
    if (window.location.hash.startsWith("#/")) window.location.replace(`/app${window.location.hash}`);
  }, []);
  return null;
}

export function HeroLattice() {
  const { resolved } = useTheme();
  return <CryptoLattice variant={resolved === "dark" ? "dark" : "light"} />;
}

export function LandingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("sticky top-0 z-30 transition-colors", scrolled ? "border-b border-zinc-200/70 bg-[var(--surface-topbar)] backdrop-blur-md" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="font-display text-[18px] font-medium text-zinc-950">AkrediteSınav</span>
        </Link>
        <nav className="hidden items-center gap-6 text-[13.5px] text-zinc-600 md:flex">
          <a href="#ozellikler" className="hover:text-zinc-950">Özellikler</a>
          <a href="#guvenlik" className="hover:text-zinc-950">Güvenlik</a>
          <a href="#akreditasyon" className="hover:text-zinc-950">Akreditasyon</a>
          <a href="#sss" className="hover:text-zinc-950">SSS</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/app"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Uygulamayı aç <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
