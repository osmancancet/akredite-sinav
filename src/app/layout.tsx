import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Fraunces } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { CSP } from "@/lib/csp";
import { THEME_BOOT_SCRIPT } from "@/lib/themeScript";
import { BRAND } from "@/lib/brand";

// Fraunces derleme sırasında indirilip _next/static altına gömülür; çalışma anında harici istek yoktur.
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "YÖKAK tescilli 29 kuruluşun ölçütleri ve örnek kanıtları hazır; ekipten şifreli kanıt toplama, sınav ve ölçme belgeleri, öz değerlendirme ve kanıt paketi. Veriler tarayıcıda AES-256-GCM ile şifreli kalır.",
  applicationName: BRAND.name,
  alternates: { canonical: "/" },
  openGraph: { title: `${BRAND.name} — ${BRAND.tagline}`, url: BRAND.url, siteName: BRAND.name, locale: "tr_TR", type: "website" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`h-full ${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable}`}>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <meta name="referrer" content="no-referrer" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
