// İçerik Güvenlik Politikası: Tarayıcı seviyesinde ağ çıkışını kilitler.
// connect-src yalnızca uygulamanın kendi kökeni ve kullanıcının BYOK ile bilinçli
// olarak seçtiği AI sağlayıcılarına izin verir. Diğer tüm adreslere istek tarayıcı
// tarafından engellenir.

const AI_CONNECT = [
  "https://generativelanguage.googleapis.com",
  "https://api.openai.com",
  "https://api.anthropic.com",
  "http://localhost:11434",
  "http://127.0.0.1:11434",
];

export function buildCsp(dev: boolean): string {
  const connect = ["'self'", ...AI_CONNECT, ...(dev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : [])];
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join("; ");
}

export const CSP = buildCsp(process.env.NODE_ENV !== "production");
