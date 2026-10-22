import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { CSP } from "@/lib/csp";

export const metadata: Metadata = {
  title: "AkrediteSınav — Zero-Knowledge Akademik Sınav & MEDEK Stüdyosu",
  description:
    "Tarayıcı içi şifreli (AES-256-GCM) sınav kağıdı hazırlama, sınav programı, kapı listesi, rubrik ve MEDEK/YÖKAK PUKÖ akreditasyon platformu.",
  applicationName: "AkrediteSınav",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#312e81",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
