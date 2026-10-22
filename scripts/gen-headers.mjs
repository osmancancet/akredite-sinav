// Cloudflare Pages için out/_headers üretir (next build sonrası çalışır).
// CSP, uygulamadaki meta etiketiyle aynı kaynaktan (src/lib/csp-directives.json) gelir;
// HTTP başlığı olarak ek olarak frame-ancestors 'none' uygulanır.
import fs from "node:fs";
import path from "node:path";

const spec = JSON.parse(fs.readFileSync(path.resolve("src/lib/csp-directives.json"), "utf8"));
const entries = Object.entries(spec.directives);
entries.splice(5, 0, ["connect-src", ["'self'", ...spec.aiConnect]]);
entries.push(["frame-ancestors", ["'none'"]]);
const csp = entries.map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");

const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/logos/*
  Cache-Control: public, max-age=604800

/sw.js
  Cache-Control: no-cache
`;

const out = path.resolve("out");
if (!fs.existsSync(out)) {
  console.error("out/ bulunamadı; önce next build çalıştırın.");
  process.exit(1);
}
fs.writeFileSync(path.join(out, "_headers"), headers);
console.log("out/_headers yazıldı.");
