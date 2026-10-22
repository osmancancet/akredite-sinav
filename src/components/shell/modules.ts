import {
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutGrid,
  LineChart,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type ModuleId = "kasa" | "sinav" | "program" | "oturma" | "rubrik" | "medek" | "ai";

export const MODULES: { id: ModuleId; no: number; label: string; short: string; icon: LucideIcon; emoji: string }[] = [
  { id: "kasa", no: 1, label: "Kasa, Antet & Güvenlik", short: "Kurum anteti, şifreli kasa, yedek", icon: ShieldCheck, emoji: "🔒" },
  { id: "sinav", no: 2, label: "Sınav Kağıdı & Belirtke", short: "ÖÇ/Bloom etiketli soru stüdyosu", icon: FileText, emoji: "📝" },
  { id: "program", no: 3, label: "Sınav Programı & Gözetmen", short: "Çakışmasız takvim, adil dağıtım", icon: CalendarClock, emoji: "📅" },
  { id: "oturma", no: 4, label: "Kapı Listesi & Yoklama", short: "Kelebek düzeni, tutanak, kapaklar", icon: LayoutGrid, emoji: "🪑" },
  { id: "rubrik", no: 5, label: "Analitik Rubrik Stüdyosu", short: "Proje, lab, sunum, 3+1 İşyeri", icon: ClipboardList, emoji: "📋" },
  { id: "medek", no: 6, label: "ÖÇ/PÇ Analizi & PUKÖ", short: "Başarı hesaplama, iyileştirme raporu", icon: LineChart, emoji: "📊" },
  { id: "ai", no: 7, label: "BYOK AI Kalite Asistanı", short: "Gemini, OpenAI, Claude, Ollama", icon: Sparkles, emoji: "✨" },
];
