// Ürün markası tek yerde. Marka değişikliğinde public/manifest.webmanifest de güncellenmelidir.
// Not: kasa veritabanı adı ("AkrediteSinavVault"), yedek biçim kimliği ve ".akredite" uzantısı
// mevcut kullanıcı verisiyle uyum için marka değişse de DEĞİŞMEZ.
export const BRAND = {
  name: "Kanıthane",
  tagline: "Akreditasyon kanıtlarınız, tek ve şifreli bir yerde",
  descriptor: "Zero-Knowledge akreditasyon kanıt stüdyosu",
  /** Kanonik adres; www ve eski adresler buraya yönlendirilir */
  host: "kanithane.com",
  url: "https://kanithane.com",
} as const;

/** Kasa tarayıcıda adrese göre saklanır; bu adreslerdeki kullanıcılar verilerini yedekle taşımalıdır */
export const LEGACY_HOSTS = ["akredite-sinav.akredite-sinav.workers.dev"];
