"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY as KEY } from "@/lib/themeScript";

// Tema tercihi yalnızca bu cihazda localStorage'da tutulur (kişisel veri değildir).
export type ThemePref = "light" | "dark" | "system";
const EVENT = "akredite-theme-change";

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(pref: ThemePref = readPref()) {
  const dark = pref === "dark" || (pref === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0f0f12" : "#fafaf9");
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (readPref() === "system") applyTheme("system");
    cb();
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    mq.removeEventListener("change", onSystem);
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const snapshot = () => `${readPref()}|${document.documentElement.classList.contains("dark") ? "dark" : "light"}`;

export function useTheme() {
  const snap = useSyncExternalStore(subscribe, snapshot, () => "system|light");
  const [pref, resolved] = snap.split("|") as [ThemePref, "light" | "dark"];
  const setPref = useCallback((p: ThemePref) => {
    try {
      if (p === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      /* gizli pencere: yalnızca bu oturum */
    }
    applyTheme(p);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { pref, resolved, setPref };
}

