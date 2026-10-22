"use client";

import * as React from "react";
import katex from "katex";
import type { Institution } from "@/lib/types";
import { cn, trUpper } from "@/lib/utils";

/** A4 sayfa kabuğu — ekranda önizleme, baskıda gerçek sayfa. */
export function A4Page({
  children,
  orientation = "portrait",
  className,
}: {
  children: React.ReactNode;
  orientation?: "portrait" | "landscape";
  className?: string;
}) {
  return <section className={cn("a4-page", orientation === "landscape" && "a4-landscape", className)}>{children}</section>;
}

export function OfficialHeader({
  inst,
  title,
  subtitle,
  right,
}: {
  inst: Institution;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="doc-header">
      <div className="doc-header-grid">
        <div className="doc-logo">
          {inst.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inst.logoDataUrl} alt="Logo" />
          ) : (
            <div className="doc-logo-placeholder">{(inst.university || "Ü").charAt(0)}</div>
          )}
        </div>
        <div className="doc-header-text">
          <div>T.C.</div>
          <div className="font-bold">{trUpper(inst.university || "Üniversite Adı")}</div>
          <div className="font-bold">{trUpper(inst.unitName || "Birim Adı")}</div>
          <div>{inst.department}</div>
          {inst.program && <div>{inst.program}</div>}
        </div>
        <div className="doc-header-right">{right}</div>
      </div>
      {title && <div className="doc-title">{title}</div>}
      {subtitle && <div className="doc-subtitle">{subtitle}</div>}
    </header>
  );
}

export function SignatureRow({ items }: { items: { title: string; name?: string }[] }) {
  return (
    <div className="doc-signatures" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((it, i) => (
        <div key={i} className="doc-signature">
          <div className="font-semibold">{it.title}</div>
          <div>{it.name || " "}</div>
          <div className="doc-signature-line">İmza</div>
        </div>
      ))}
    </div>
  );
}

/** **kalın** işaretlemesini destekleyen satır içi metin */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i}><u>{p.slice(2, -2)}</u></strong> : <React.Fragment key={i}>{p}</React.Fragment>,
      )}
    </>
  );
}

export function Latex({ expr, block = true }: { expr: string; block?: boolean }) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(expr, { displayMode: block, throwOnError: false, output: "html" });
    } catch {
      return expr;
    }
  }, [expr, block]);
  return <span className={block ? "block my-2 text-center" : ""} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Klasik sorular için yazdırmada güvenilir cevap satırları */
export function AnswerLines({ count, className }: { count: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="doc-answer-line" />
      ))}
    </div>
  );
}
