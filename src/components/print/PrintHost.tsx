"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { useMounted } from "@/hooks/useMounted";

interface PrintJob {
  node: React.ReactNode;
  orientation: "portrait" | "landscape";
  title: string;
}

const usePrintStore = create<{ job: PrintJob | null; set: (j: PrintJob | null) => void }>((set) => ({
  job: null,
  set: (job) => set({ job }),
}));

/**
 * A4 PDF / Yazdır: Belgeyi gizli #print-root alanına çizer ve tarayıcının yerel
 * yazdırma motorunu açar ("PDF olarak kaydet" hedefi ile tamamen çevrimdışı PDF).
 */
export function printDocument(node: React.ReactNode, opts: { orientation?: "portrait" | "landscape"; title?: string } = {}) {
  usePrintStore.getState().set({ node, orientation: opts.orientation ?? "portrait", title: opts.title ?? document.title });
}

export function PrintHost() {
  const { job, set } = usePrintStore();
  const mounted = useMounted();

  React.useEffect(() => {
    if (!job) return;
    const prevTitle = document.title;
    document.title = job.title;
    const style = document.createElement("style");
    style.setAttribute("data-print-orientation", "");
    style.textContent = `@page { size: A4 ${job.orientation}; margin: 11mm 13mm; }`;
    document.head.appendChild(style);
    document.body.classList.add("is-printing");
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      document.title = prevTitle;
      style.remove();
      document.body.classList.remove("is-printing");
      set(null);
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    const t = setTimeout(() => {
      window.print();
      // Bazı tarayıcılar afterprint olayını tetiklemez
      setTimeout(cleanup, 800);
    }, 250);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", cleanup);
    };
  }, [job, set]);

  if (!mounted || !job) return null;
  return createPortal(
    <div id="print-root" data-orientation={job.orientation}>
      {job.node}
    </div>,
    document.body,
  );
}
