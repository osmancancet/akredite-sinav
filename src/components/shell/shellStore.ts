"use client";

import { create } from "zustand";

/** Kabuk düzeyindeki pencereler (denetçi, yedek) — modüller içinden de açılabilsin diye. */
export const useShellUi = create<{
  auditOpen: boolean;
  backupMode: false | "export" | "import";
  courseImportOpen: boolean;
  setAudit: (v: boolean) => void;
  setBackup: (v: false | "export" | "import") => void;
  setCourseImport: (v: boolean) => void;
  pendingTab: { module: string; tab: string } | null;
  requestTab: (module: string, tab: string) => void;
}>((set) => ({
  auditOpen: false,
  backupMode: false,
  courseImportOpen: false,
  setAudit: (auditOpen) => set({ auditOpen }),
  setBackup: (backupMode) => set({ backupMode }),
  setCourseImport: (courseImportOpen) => set({ courseImportOpen }),
  pendingTab: null,
  requestTab: (module, tab) => set({ pendingTab: { module, tab } }),
}));

/** Başka ekrandan istenen sekmeyi bir kez tüketir (ör. Genel Bakış → Soru Bankası). */
export function takePendingTab<T extends string>(module: string, fallback: T): T {
  const p = useShellUi.getState().pendingTab;
  if (p && p.module === module) {
    useShellUi.setState({ pendingTab: null });
    return p.tab as T;
  }
  return fallback;
}
