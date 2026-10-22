"use client";

import { create } from "zustand";

/** Kabuk düzeyindeki pencereler (denetçi, yedek) — modüller içinden de açılabilsin diye. */
export const useShellUi = create<{
  auditOpen: boolean;
  backupMode: false | "export" | "import";
  setAudit: (v: boolean) => void;
  setBackup: (v: false | "export" | "import") => void;
}>((set) => ({
  auditOpen: false,
  backupMode: false,
  setAudit: (auditOpen) => set({ auditOpen }),
  setBackup: (backupMode) => set({ backupMode }),
}));
