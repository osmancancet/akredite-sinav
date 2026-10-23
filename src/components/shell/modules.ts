import {
  CalendarClock,
  Compass,
  ClipboardList,
  FileText,
  FolderCheck,
  LayoutGrid,
  LineChart,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type ModuleId = "genel" | "kasa" | "sinav" | "program" | "oturma" | "rubrik" | "medek" | "akreditasyon" | "ai";

export type ModuleGroup = "Akreditasyon" | "Kanıt üreticileri" | "Sistem";

export const MODULE_GROUPS: ModuleGroup[] = ["Akreditasyon", "Kanıt üreticileri", "Sistem"];

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
    description: "Akreditasyon hazırlığınız, ekip talepleri, dönem iş akışı ve yaklaşan sınavlar tek ekranda.",
    group: "Akreditasyon",
    icon: Compass,
  },
  {
    id: "akreditasyon",
    no: 8,
    label: "Akreditasyon Kanıt Merkezi",
    short: "Kanıt merkezi",
    description: "Seçtiğiniz akreditasyonun ölçütleri ve kuruluşun örnek kanıtları; şifreli dosyalar, ekipten kanıt toplama, iyileştirme eylemleri ve tek tıkla kanıt paketi.",
    group: "Akreditasyon",
    icon: FolderCheck,
  },  {
    id: "sinav",
    no: 2,
    label: "Sınav Kağıdı & Belirtke",
    short: "Sınav kağıdı & belirtke",
    description: "Öğrenme çıktısı ve Bloom düzeyiyle etiketlenmiş sorular, A/B kitapçık, belirtke tablosu ve resmi çıktılar.",
    group: "Kanıt üreticileri",
    icon: FileText,
  },
  {
    id: "rubrik",
    no: 5,
    label: "Analitik Rubrik Stüdyosu",
    short: "Rubrikler",
    description: "Proje, laboratuvar, sunum ve 3+1 iş yeri eğitimi için ÖÇ eşleşmeli dört düzeyli dereceli puanlama anahtarları.",
    group: "Kanıt üreticileri",
    icon: ClipboardList,
  },
  {
    id: "program",
    no: 3,
    label: "Sınav Programı & Gözetmen",
    short: "Sınav programı",
    description: "Çakışmasız takvim, kalabalık derslerin otomatik bölünmesi ve standart sapması en düşük gözetmen dağılımı.",
    group: "Kanıt üreticileri",
    icon: CalendarClock,
  },
  {
    id: "oturma",
    no: 4,
    label: "Kapı Listesi & Yoklama",
    short: "Kapı listesi & yoklama",
    description: "OBS listesi, kelebek oturma düzeni, KVKK maskeli kapı listesi, imzalı yoklama tutanağı ve kanıt klasörü kapakları.",
    group: "Kanıt üreticileri",
    icon: LayoutGrid,
  },
  {
    id: "medek",
    no: 6,
    label: "ÖÇ/PÇ Analizi & PUKÖ",
    short: "ÖÇ/PÇ & PUKÖ",
    description: "Soru bazlı notlardan öğrenme ve program çıktısı başarı yüzdeleri, eşik altı çıktılar için sürekli iyileştirme raporu.",
    group: "Kanıt üreticileri",
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
