import type { Metadata } from "next";
import { AppRoot } from "@/components/shell/AppRoot";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Uygulama — ${BRAND.name}`,
};

export default function AppPage() {
  return <AppRoot />;
}
