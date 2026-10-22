// İçerik Güvenlik Politikası: Tarayıcı seviyesinde ağ çıkışını kilitler.
// connect-src yalnızca uygulamanın kendi kökeni ve kullanıcının BYOK ile bilinçli
// olarak seçtiği AI sağlayıcılarına izin verir. Diğer tüm adreslere istek tarayıcı
// tarafından engellenir. Tek kaynak: csp-directives.json (Cloudflare _headers da
// scripts/gen-headers.mjs ile aynı dosyadan üretilir).

import spec from "./csp-directives.json";

export function buildCsp(dev: boolean, extra: Record<string, string[]> = {}): string {
  const d: Record<string, string[]> = { ...spec.directives, ...extra };
  if (dev) d["script-src"] = [...d["script-src"], "'unsafe-eval'"];
  const connect = ["'self'", ...spec.aiConnect, ...(dev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : [])];
  const entries = Object.entries(d);
  entries.splice(5, 0, ["connect-src", connect]);
  return entries.map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
}

export const CSP = buildCsp(process.env.NODE_ENV !== "production");
