// Ürün markası tek yerde. Marka değişikliğinde public/manifest.webmanifest de güncellenmelidir.
// Not: kasa veritabanı adı ("AkrediteSinavVault"), yedek biçim kimliği ve ".akredite" uzantısı
// mevcut kullanıcı verisiyle uyum için marka değişse de DEĞİŞMEZ.
export const BRAND = {
  name: "AkrediteSınav",
  tagline: "Akreditasyon kanıtlarınız, tek ve şifreli bir yerde",
  descriptor: "Zero-Knowledge akreditasyon kanıt stüdyosu",
} as const;
