"use client";

import * as React from "react";
import { create } from "zustand";

// Tarayıcıdan kalıcı depolama izni: verilirse tarayıcı disk baskısında kasayı kendiliğinden silmez.
const useStorageState = create<{ persisted: boolean | null; usage: number | null; quota: number | null }>(() => ({
  persisted: null,
  usage: null,
  quota: null,
}));

let requested = false;

export async function requestPersistentStorage(): Promise<void> {
  if (requested || typeof navigator === "undefined" || !navigator.storage) return;
  requested = true;
  try {
    let persisted = (await navigator.storage.persisted?.()) ?? false;
    if (!persisted && navigator.storage.persist) persisted = await navigator.storage.persist();
    const est = await navigator.storage.estimate?.();
    useStorageState.setState({ persisted, usage: est?.usage ?? null, quota: est?.quota ?? null });
  } catch {
    useStorageState.setState({ persisted: false });
  }
}

export function useStoragePersist() {
  const state = useStorageState();
  React.useEffect(() => {
    void requestPersistentStorage();
  }, []);
  return state;
}
