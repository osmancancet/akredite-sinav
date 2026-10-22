"use client";

// Sıfır Ağ Çıkışı Denetçisi
// fetch / XMLHttpRequest / sendBeacon / WebSocket çağrılarını ve PerformanceObserver ile
// tarayıcının yüklediği tüm kaynakları canlı olarak kaydeder. Uygulama kendi dosyaları
// (aynı köken) dışında hiçbir sunucuya istek göndermez; tek istisna kullanıcının
// bilinçli olarak tetiklediği BYOK AI çağrılarıdır ve ayrıca etiketlenir.

export type RequestCategory = "local" | "ai" | "external";

export interface NetworkEvent {
  id: number;
  time: string;
  url: string;
  method: string;
  kind: "fetch" | "xhr" | "beacon" | "websocket" | "resource";
  category: RequestCategory;
  bytes?: number;
}

const AI_HOSTS = [
  "generativelanguage.googleapis.com",
  "api.openai.com",
  "api.anthropic.com",
  "localhost:11434",
  "127.0.0.1:11434",
];

const events: NetworkEvent[] = [];
const listeners = new Set<() => void>();
let installed = false;
let counter = 0;

function categorize(rawUrl: string): RequestCategory {
  try {
    const u = new URL(rawUrl, window.location.href);
    if (u.protocol === "data:" || u.protocol === "blob:") return "local";
    if (AI_HOSTS.includes(u.host)) return "ai";
    if (u.origin === window.location.origin) return "local";
    return "external";
  } catch {
    return "local";
  }
}

function record(ev: Omit<NetworkEvent, "id" | "time" | "category">) {
  const full: NetworkEvent = { ...ev, id: ++counter, time: new Date().toISOString(), category: categorize(ev.url) };
  events.push(full);
  if (events.length > 500) events.shift();
  listeners.forEach((l) => l());
}

export function installNetworkAudit() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    record({ url, method, kind: "fetch" });
    return origFetch(input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    record({ url: String(url), method, kind: "xhr" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origOpen as any).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;

  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      record({ url: String(url), method: "POST", kind: "beacon" });
      return origBeacon(url, data);
    };
  }

  const OrigWS = window.WebSocket;
  const PatchedWS = function (this: WebSocket, url: string | URL, protocols?: string | string[]) {
    record({ url: String(url), method: "WS", kind: "websocket" });
    return new OrigWS(url, protocols);
  } as unknown as typeof WebSocket;
  PatchedWS.prototype = OrigWS.prototype;
  Object.assign(PatchedWS, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  window.WebSocket = PatchedWS;

  try {
    performance.getEntriesByType("resource").forEach((e) => {
      const r = e as PerformanceResourceTiming;
      record({ url: r.name, method: "GET", kind: "resource", bytes: r.transferSize });
    });
    const obs = new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => {
        const r = e as PerformanceResourceTiming;
        if (r.initiatorType === "fetch" || r.initiatorType === "xmlhttprequest") return; // zaten kaydedildi
        record({ url: r.name, method: "GET", kind: "resource", bytes: r.transferSize });
      });
    });
    obs.observe({ type: "resource", buffered: false });
  } catch {
    /* PerformanceObserver desteklenmiyorsa yalnızca API yamaları çalışır */
  }
}

export function getNetworkEvents(): NetworkEvent[] {
  return [...events];
}

export function subscribeNetwork(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function clearNetworkEvents() {
  events.length = 0;
  listeners.forEach((l) => l());
}
