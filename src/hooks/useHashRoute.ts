"use client";

import { useCallback, useSyncExternalStore } from "react";
import { MODULES, type ModuleId } from "@/components/shell/modules";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function read(): ModuleId {
  const id = window.location.hash.replace(/^#\/?/, "") as ModuleId;
  return MODULES.some((m) => m.id === id) ? id : "genel";
}

export function useHashRoute(): [ModuleId, (id: ModuleId) => void] {
  const route = useSyncExternalStore(subscribe, read, () => "genel" as ModuleId);
  const navigate = useCallback((id: ModuleId) => {
    window.location.hash = `/${id}`;
    window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate];
}

export function navigateTo(id: ModuleId) {
  window.location.hash = `/${id}`;
  window.scrollTo({ top: 0 });
}
