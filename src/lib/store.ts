"use client";

import { create } from "zustand";
import {
  openVault,
  pruneBlobs,
  readAllCollections,
  removeMasterPassword,
  setMasterPassword,
  unlockWithPassword,
  wipeVault,
  writeAllCollections,
  writeCollection,
  type KeyMode,
} from "./cryptoVault";
import { createDemoVault, createEmptyVault } from "./demoSeeder";
import { COLLECTION_KEYS, type CollectionKey, type VaultData } from "./types";
import { referencedBlobIds } from "./accreditation/progress";
import { withDemoAccreditation } from "./accreditation/demoAccreditation";

type Updater<T> = T | ((prev: T) => T);

interface VaultState {
  status: "booting" | "locked" | "ready" | "error";
  error: string | null;
  mode: KeyMode;
  key: CryptoKey | null;
  data: VaultData | null;
  saving: boolean;
  lastSavedAt: string | null;
  writeCount: number;
  boot: () => Promise<void>;
  unlock: (password: string) => Promise<void>;
  update: <K extends CollectionKey>(key: K, updater: Updater<VaultData[K]>) => void;
  replaceAll: (data: VaultData) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  removePassword: () => Promise<void>;
  lock: () => void;
  loadDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
  wipe: () => Promise<void>;
  flush: () => Promise<void>;
}

const pending = new Set<CollectionKey>();
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing: Promise<void> | null = null;

function normalize(loaded: Partial<VaultData>): VaultData {
  const base = createEmptyVault();
  const merged = { ...base, ...loaded } as VaultData;
  merged.ai = { ...base.ai, ...(loaded.ai ?? {}), keys: { ...base.ai.keys, ...(loaded.ai?.keys ?? {}) }, models: { ...base.ai.models, ...(loaded.ai?.models ?? {}) } };
  merged.ui = { ...base.ui, ...(loaded.ui ?? {}) };
  if (loaded.ui && loaded.ui.onboarded === undefined) merged.ui.onboarded = true;
  merged.questionBank = loaded.questionBank ?? [];
  merged.accreditation = { ...base.accreditation, ...(loaded.accreditation ?? {}) };
  merged.institution = { ...base.institution, ...(loaded.institution ?? {}) };
  return merged;
}

export const useVault = create<VaultState>((set, get) => {
  const scheduleFlush = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void get().flush();
    }, 350);
  };

  return {
    status: "booting",
    error: null,
    mode: "device",
    key: null,
    data: null,
    saving: false,
    lastSavedAt: null,
    writeCount: 0,

    boot: async () => {
      try {
        if (typeof indexedDB === "undefined" || !crypto?.subtle) {
          throw new Error("Bu tarayıcı IndexedDB veya Web Crypto API desteklemiyor.");
        }
        const res = await openVault();
        if (res.status === "locked") {
          set({ status: "locked", mode: "password" });
          return;
        }
        let data: VaultData;
        if (res.isNew) {
          data = await withDemoAccreditation(createDemoVault());
          await writeAllCollections(res.key, data);
        } else {
          data = normalize(await readAllCollections(res.key));
        }
        set({ status: "ready", key: res.key, mode: res.mode, data, lastSavedAt: new Date().toISOString() });
      } catch (e) {
        set({ status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    },

    unlock: async (password) => {
      const key = await unlockWithPassword(password);
      const data = normalize(await readAllCollections(key));
      set({ status: "ready", key, mode: "password", data, error: null });
    },

    update: (k, updater) => {
      const { data } = get();
      if (!data) return;
      const prev = data[k];
      const next = typeof updater === "function" ? (updater as (p: typeof prev) => typeof prev)(prev) : updater;
      if (next === prev) return;
      set({ data: { ...data, [k]: next } });
      pending.add(k);
      scheduleFlush();
    },

    flush: async () => {
      if (flushing) await flushing;
      const { key, data } = get();
      if (!key || !data || pending.size === 0) return;
      const keys = Array.from(pending);
      pending.clear();
      set({ saving: true });
      flushing = (async () => {
        for (const k of keys) await writeCollection(key, k, data[k]);
      })();
      try {
        await flushing;
        set((s) => ({ saving: false, lastSavedAt: new Date().toISOString(), writeCount: s.writeCount + keys.length }));
      } catch (e) {
        keys.forEach((k) => pending.add(k));
        set({ saving: false, error: e instanceof Error ? e.message : String(e) });
      } finally {
        flushing = null;
      }
    },

    replaceAll: async (incoming) => {
      const { key } = get();
      if (!key) return;
      const data = normalize(incoming);
      pending.clear();
      await writeAllCollections(key, data);
      await pruneBlobs(referencedBlobIds(data));
      set({ data, lastSavedAt: new Date().toISOString() });
    },

    setPassword: async (password) => {
      await get().flush();
      const { data, key: oldKey } = get();
      if (!data) return;
      const key = await setMasterPassword(password, data, oldKey ?? undefined);
      set({ key, mode: "password" });
    },

    removePassword: async () => {
      await get().flush();
      const { data, key: oldKey } = get();
      if (!data) return;
      const key = await removeMasterPassword(data, oldKey ?? undefined);
      set({ key, mode: "device" });
    },

    lock: () => {
      if (get().mode !== "password") return;
      void get()
        .flush()
        .then(() => set({ status: "locked", key: null, data: null }));
    },

    loadDemo: async () => {
      const prev = get().data;
      const demo = await withDemoAccreditation(createDemoVault());
      if (prev) {
        demo.ai = prev.ai; // kullanıcının AI anahtarlarını koru
        demo.ui = { ...demo.ui, onboarded: true, firstUseAt: prev.ui.firstUseAt ?? demo.ui.firstUseAt, lastBackupAt: prev.ui.lastBackupAt };
      }
      await get().replaceAll(demo);
    },

    clearAll: async () => {
      const prev = get().data;
      const empty = createEmptyVault();
      if (prev) {
        empty.ai = prev.ai;
        empty.ui = { ...empty.ui, firstUseAt: prev.ui.firstUseAt ?? empty.ui.firstUseAt, lastBackupAt: prev.ui.lastBackupAt };
      }
      await get().replaceAll(empty);
    },

    wipe: async () => {
      pending.clear();
      await wipeVault();
      set({ status: "booting", key: null, data: null });
      await get().boot();
    },
  };
});

/** Kaydedilmeyi bekleyen değişiklik var mı (sayfadan çıkış uyarısı için) */
export function hasPendingWrites(): boolean {
  return pending.size > 0;
}

export function useData(): VaultData {
  const data = useVault((s) => s.data);
  if (!data) throw new Error("Kasa henüz açılmadı.");
  return data;
}

export { COLLECTION_KEYS };
