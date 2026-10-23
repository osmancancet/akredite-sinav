import type { Metadata } from "next";
import { AppRoot } from "@/components/shell/AppRoot";

export const metadata: Metadata = {
  title: "Uygulama — AkrediteSınav",
};

export default function AppPage() {
  return <AppRoot />;
}
