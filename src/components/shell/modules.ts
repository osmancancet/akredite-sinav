import {
  CalendarClock,
  Compass,
  ClipboardList,
  FileText,
  LayoutGrid,
  LineChart,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type ModuleId = "genel" | "kasa" | "sinav" | "program" | "oturma" | "rubrik" | "medek" | "ai";

export type ModuleGroup = "Genel" | "Hazırlık" | "Operasyon" | "Kalite" | "Sistem";

export const MODULE_GROUPS: ModuleGroup[] = ["Genel", "Hazırlık", "Operasyon", "Kalite", "Sistem"];

export const MODULES: {
  id: ModuleId;
  no: number;
  label: string;
  short: string;
  description: string;
  group: ModuleGroup;
  icon: LucideIcon;
}[] = [
  {
    id: "genel",
    no: 0,
    label: "Genel Bakış",
    short: "Genel bakış",
    description: "Dönem iş akışınız, yaklaşan sınavlar, akreditasyon durumu ve tek tık eylemler.",
    group: "Genel",
    icon: Compass,
  },
  {
    id: "sinav",
    no: 2,
    label: "Sınav Kağıdı & Belirtke",
    short: "Sınav kağıdı & belirtke",
    description: "Öğrenme çıktısı ve Bloom düzeyiyle etiketlenmiş sorular, A/B kitapçık, belirtke tablosu ve resmi çıktılar.",
    group: "Hazırlık",
    icon: FileText,
  },
  {
    id: "rubrik",
    no: 5,
    label: "Analitik Rubrik Stüdyosu",
    short: "Rubrikler",
    description: "Proje, laboratuvar, sunum ve 3+1 iş yeri eğitimi için ÖÇ eşleşmeli dört düzeyli dereceli puanlama anahtarları.",
    group: "Hazırlık",
    icon: ClipboardList,
  },
  {
    id: "program",
    no: 3,
    label: "Sınav Programı & Gözetmen",
    short: "Sınav programı",
    description: "Çakışmasız takvim, kalabalık derslerin otomatik bölünmesi ve standart sapması en düşük gözetmen dağılımı.",
    group: "Operasyon",
    icon: CalendarClock,
  },
  {
    id: "oturma",
    no: 4,
    label: "Kapı Listesi & Yoklama",
    short: "Kapı listesi & yoklama",
    description: "OBS listesi, kelebek oturma düzeni, KVKK maskeli kapı listesi, imzalı yoklama tutanağı ve kanıt klasörü kapakları.",
    group: "Operasyon",
    icon: LayoutGrid,
  },
  {
    id: "medek",
    no: 6,
    label: "ÖÇ/PÇ Analizi & PUKÖ",
    short: "ÖÇ/PÇ & PUKÖ",
    description: "Soru bazlı notlardan öğrenme ve program çıktısı başarı yüzdeleri, eşik altı çıktılar için sürekli iyileştirme raporu.",
    group: "Kalite",
    icon: LineChart,
  },
  {
    id: "kasa",
    no: 1,
    label: "Kasa, Antet & Güvenlik",
    short: "Kasa, antet & güvenlik",
    description: "Kurum anteti, AES-256 anahtar yönetimi, şifreli yedekler ve ders kataloğu.",
    group: "Sistem",
    icon: ShieldCheck,
  },
  {
    id: "ai",
    no: 7,
    label: "AI Kalite Asistanı",
    short: "AI asistanı",
    description: "Kendi anahtarınızla Gemini, OpenAI, Claude veya tamamen yerel Ollama; istekler tarayıcıdan doğrudan sağlayıcıya gider.",
    group: "Sistem",
    icon: Sparkles,
  },
];
