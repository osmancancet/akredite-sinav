import type { Rubric, RubricCriterion, RubricType } from "./types";
import { uid } from "./utils";

export const RUBRIC_LEVELS = [
  { key: "yetersiz", label: "Yetersiz", range: [0, 39], color: "#dc2626" },
  { key: "gelistirilmeli", label: "Geliştirilmeli", range: [40, 59], color: "#d97706" },
  { key: "iyi", label: "İyi", range: [60, 84], color: "#2563eb" },
  { key: "mukemmel", label: "Mükemmel", range: [85, 100], color: "#16a34a" },
] as const;

export function levelPointRange(weight: number, levelIdx: number): string {
  const [lo, hi] = RUBRIC_LEVELS[levelIdx].range;
  const a = Math.round((weight * lo) / 100 * 2) / 2;
  const b = Math.round((weight * hi) / 100 * 2) / 2;
  return `${a}–${b}`;
}

export const RUBRIC_TYPES: { value: RubricType; label: string; icon: string }[] = [
  { value: "proje", label: "Proje", icon: "FolderKanban" },
  { value: "odev", label: "Ödev", icon: "NotebookPen" },
  { value: "laboratuvar", label: "Laboratuvar Föyü", icon: "FlaskConical" },
  { value: "sunum", label: "Sunum", icon: "Presentation" },
  { value: "isyeri", label: "3+1 İş Yeri Eğitimi", icon: "Building2" },
];

type CriterionSeed = [string, number, [string, string, string, string]];

const TEMPLATES: Record<RubricType, { title: string; description: string; criteria: CriterionSeed[] }> = {
  proje: {
    title: "Dönem Projesi Analitik Değerlendirme Rubriği",
    description:
      "Öğrencinin dönem boyunca geliştirdiği projenin problem tanımı, tasarım, uygulama, dokümantasyon ve sunum boyutlarıyla değerlendirilmesi.",
    criteria: [
      ["Problem Tanımı ve Gereksinim Analizi", 15, [
        "Problem tanımlanmamış; gereksinimler belirsiz veya eksik.",
        "Problem yüzeysel tanımlanmış; gereksinimlerin bir kısmı listelenmiş.",
        "Problem açık tanımlanmış; işlevsel gereksinimler büyük ölçüde belirlenmiş.",
        "Problem kapsamı, kısıtları ve tüm işlevsel/işlevsel olmayan gereksinimler eksiksiz analiz edilmiş.",
      ]],
      ["Tasarım ve Modelleme", 25, [
        "Tasarım yapılmamış veya problemle ilişkisiz.",
        "Tasarım taslak düzeyde; önemli bileşenler eksik.",
        "Tasarım tutarlı; diyagramlar küçük eksiklerle doğru.",
        "Tasarım özgün, ölçeklenebilir ve standart notasyonlarla eksiksiz modellenmiş.",
      ]],
      ["Uygulama ve Teknik Yeterlilik", 30, [
        "Uygulama çalışmıyor veya büyük bölümü eksik.",
        "Temel işlevler kısmen çalışıyor; ciddi hatalar mevcut.",
        "İşlevlerin çoğu doğru çalışıyor; küçük hatalar var.",
        "Tüm işlevler hatasız, verimli ve iyi kodlama standartlarıyla gerçekleştirilmiş.",
      ]],
      ["Dokümantasyon ve Raporlama", 15, [
        "Rapor yok veya yazım kurallarına uymuyor.",
        "Rapor eksik bölümler içeriyor; kaynakça yetersiz.",
        "Rapor düzenli; bölümler tam, küçük biçim hataları var.",
        "Rapor akademik yazım kurallarına tam uygun, kaynakçalı ve profesyonel.",
      ]],
      ["Sunum ve Savunma", 15, [
        "Sunum yapılmamış veya sorulara yanıt verilemiyor.",
        "Sunum dağınık; sorulara kısmen yanıt veriliyor.",
        "Sunum akıcı; sorulara büyük ölçüde doğru yanıt veriliyor.",
        "Sunum etkileyici ve zamanında; tüm sorular gerekçeli ve doğru yanıtlanıyor.",
      ]],
    ],
  },
  odev: {
    title: "Ödev Değerlendirme Rubriği",
    description: "Bireysel ödevlerin içerik doğruluğu, yöntem, özgünlük, biçim ve zamanında teslim ölçütleriyle değerlendirilmesi.",
    criteria: [
      ["İçerik Doğruluğu", 35, [
        "Yanıtların çoğu hatalı veya konu dışı.",
        "Yanıtların bir kısmı doğru; kavram yanılgıları var.",
        "Yanıtlar büyük ölçüde doğru ve konuyla ilgili.",
        "Tüm yanıtlar doğru, eksiksiz ve kavramsal olarak derin.",
      ]],
      ["Yöntem ve Çözüm Adımları", 25, [
        "Çözüm adımları gösterilmemiş.",
        "Adımlar eksik veya mantık sırası bozuk.",
        "Adımlar mantıklı; küçük atlamalar var.",
        "Tüm adımlar sistematik, gerekçeli ve izlenebilir.",
      ]],
      ["Özgünlük ve Akademik Dürüstlük", 20, [
        "Ödev büyük ölçüde kopya / alıntı.",
        "Özgün katkı sınırlı; kaynak gösterimi eksik.",
        "Ödev özgün; kaynaklar çoğunlukla gösterilmiş.",
        "Tamamen özgün; tüm kaynaklar uygun biçimde atıflanmış.",
      ]],
      ["Biçim ve Düzen", 10, [
        "Okunaksız / düzensiz.",
        "Düzen kısmen sağlanmış.",
        "Düzenli ve okunaklı.",
        "Profesyonel biçimde, şablona tam uygun.",
      ]],
      ["Zamanında Teslim", 10, [
        "Teslim edilmedi veya 3 günden fazla gecikme.",
        "1-3 gün gecikmeli teslim.",
        "Son gün teslim, eksik ek dosya var.",
        "Zamanında ve eksiksiz teslim.",
      ]],
    ],
  },
  laboratuvar: {
    title: "Laboratuvar Uygulama Föyü Değerlendirme Rubriği",
    description: "Laboratuvar uygulamalarında hazırlık, iş güvenliği, deney/uygulama yürütme, veri analizi ve föy raporu ölçütleri.",
    criteria: [
      ["Ön Hazırlık ve Teorik Bilgi", 15, [
        "Uygulamaya hazırlıksız geldi; temel kavramları bilmiyor.",
        "Kısmi hazırlık; kavramların bir kısmını açıklayabiliyor.",
        "Hazırlıklı; kavramları doğru açıklıyor.",
        "Tam hazırlıklı; teoriyi uygulamayla ilişkilendirerek açıklıyor.",
      ]],
      ["İş Sağlığı, Güvenliği ve Ekipman Kullanımı", 15, [
        "Güvenlik kurallarını ihlal ediyor; ekipmanı hatalı kullanıyor.",
        "Kuralları hatırlatmayla uyguluyor.",
        "Kurallara uyuyor; ekipmanı doğru kullanıyor.",
        "Kurallara tam uyuyor; ekipmanı bağımsız ve verimli kullanıyor.",
      ]],
      ["Uygulamanın Yürütülmesi", 30, [
        "Uygulama tamamlanamadı.",
        "Uygulama yardımla ve hatalarla tamamlandı.",
        "Uygulama küçük hatalarla bağımsız tamamlandı.",
        "Uygulama süresinde, hatasız ve bağımsız tamamlandı.",
      ]],
      ["Veri / Çıktı Analizi ve Yorum", 25, [
        "Sonuçlar kaydedilmemiş veya yorumlanmamış.",
        "Sonuçlar kaydedilmiş; yorum yüzeysel.",
        "Sonuçlar doğru analiz edilmiş; yorum yeterli.",
        "Sonuçlar eleştirel biçimde analiz edilmiş; hata kaynakları tartışılmış.",
      ]],
      ["Föy Raporu", 15, [
        "Föy teslim edilmedi.",
        "Föy eksik bölümlerle teslim edildi.",
        "Föy tam; küçük biçim hataları var.",
        "Föy eksiksiz, düzenli ve teknik dile uygun.",
      ]],
    ],
  },
  sunum: {
    title: "Sözlü Sunum Değerlendirme Rubriği",
    description: "Sunumun içerik, yapı, görsel materyal, iletişim becerisi ve zaman yönetimi ölçütleriyle değerlendirilmesi.",
    criteria: [
      ["İçerik ve Konu Hâkimiyeti", 30, [
        "İçerik yetersiz; konuya hâkim değil.",
        "İçerik kısmen yeterli; bazı hatalar var.",
        "İçerik doğru ve yeterli; konuya hâkim.",
        "İçerik derin, güncel kaynaklarla desteklenmiş; tam hâkimiyet.",
      ]],
      ["Sunumun Yapısı ve Akışı", 20, [
        "Giriş-gelişme-sonuç yok.",
        "Yapı var ancak geçişler kopuk.",
        "Yapı düzenli; geçişler akıcı.",
        "Yapı etkileyici; mantıksal bütünlük kusursuz.",
      ]],
      ["Görsel Materyal", 15, [
        "Görsel materyal yok veya okunaksız.",
        "Slaytlar metin yoğun; görseller sınırlı.",
        "Slaytlar düzenli ve destekleyici.",
        "Görseller profesyonel, sade ve mesajı güçlendiriyor.",
      ]],
      ["İletişim ve Beden Dili", 20, [
        "Notlardan okuyor; göz teması yok.",
        "Göz teması sınırlı; ses tonu monoton.",
        "Göz teması ve ses tonu uygun.",
        "Dinleyiciyle etkileşimli, kendinden emin ve etkili.",
      ]],
      ["Zaman Yönetimi ve Soru-Cevap", 15, [
        "Süre ciddi biçimde aşıldı; sorular yanıtlanamadı.",
        "Süre aşıldı; sorulara kısmen yanıt verildi.",
        "Süreye uyuldu; sorular yanıtlandı.",
        "Süre tam kullanıldı; sorular gerekçeli ve doğru yanıtlandı.",
      ]],
    ],
  },
  isyeri: {
    title: "3+1 İş Yeri Eğitimi (İşletmede Mesleki Eğitim) Değerlendirme Rubriği",
    description:
      "İşletmede mesleki eğitim gören öğrencinin mesleki yeterlilik, iş disiplini, takım çalışması, iletişim ve iş yeri eğitim dosyası ölçütleriyle değerlendirilmesi (İşletme Eğitim Sorumlusu ve Akademik Danışman ortak formu).",
    criteria: [
      ["Mesleki Bilgi ve Uygulama Becerisi", 30, [
        "Verilen görevleri yerine getiremiyor.",
        "Görevleri yakın gözetimle ve hatalarla yapıyor.",
        "Görevleri az gözetimle doğru yapıyor.",
        "Görevleri bağımsız, hatasız ve yaratıcı çözümlerle yapıyor.",
      ]],
      ["İş Disiplini, Devam ve Sorumluluk", 20, [
        "Sık devamsızlık / geç kalma; sorumluluk almıyor.",
        "Ara sıra devamsızlık; sorumlulukları hatırlatmayla yerine getiriyor.",
        "Devamı düzenli; sorumluluklarını yerine getiriyor.",
        "Devam tam; inisiyatif alıyor ve iş planına katkı sunuyor.",
      ]],
      ["İş Sağlığı ve Güvenliği / Etik", 15, [
        "İSG ve etik kurallarını ihlal ediyor.",
        "Kurallara uyarılarla uyuyor.",
        "Kurallara uyuyor.",
        "Kurallara tam uyuyor ve çevresini bilinçlendiriyor.",
      ]],
      ["Takım Çalışması ve İletişim", 15, [
        "Ekiple uyumsuz; iletişim kurmuyor.",
        "Ekiple sınırlı uyum.",
        "Ekiple uyumlu çalışıyor; iletişimi yeterli.",
        "Ekibe liderlik edebiliyor; iletişimi profesyonel.",
      ]],
      ["İş Yeri Eğitim Dosyası ve Raporlama", 20, [
        "Dosya teslim edilmedi.",
        "Dosya eksik; günlük kayıtlar düzensiz.",
        "Dosya tam; kayıtlar düzenli.",
        "Dosya eksiksiz, teknik açıdan zengin ve öz değerlendirme içeriyor.",
      ]],
    ],
  },
};

export function createRubricFromTemplate(type: RubricType, courseId: string, outcomeIds: string[] = []): Rubric {
  const t = TEMPLATES[type];
  const now = new Date().toISOString();
  return {
    id: uid("rb"),
    type,
    title: t.title,
    courseId,
    description: t.description,
    criteria: t.criteria.map(([name, weight, levels], i): RubricCriterion => ({
      id: uid("cr"),
      name,
      weight,
      levels: [...levels],
      outcomeIds: outcomeIds.length ? [outcomeIds[i % outcomeIds.length]] : [],
    })),
    createdAt: now,
    updatedAt: now,
  };
}
