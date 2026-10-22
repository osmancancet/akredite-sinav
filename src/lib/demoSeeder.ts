// AkrediteSınav — Akademik Demo Veri Seti
// İlk açılışta kasa bu veriyle doldurulur; tüm modüller ve çıktılar ilk saniyede test edilebilir.

import { DEFAULT_AI_SETTINGS } from "./aiDefaults";
import { simulateGrades } from "./medekMath";
import { createRubricFromTemplate } from "./rubricTemplates";
import { solveSchedule } from "./scheduler";
import { scheduleDates } from "./scheduler";
import { buildSeatingPlan } from "./seating";
import type {
  Course,
  Exam,
  Institution,
  Invigilator,
  ProgramOutcome,
  Question,
  Room,
  ScheduleSettings,
  Student,
  VaultData,
} from "./types";
import { createRng } from "./utils";

export const DEMO_INSTITUTION: Institution = {
  university: "Örnek Teknik Üniversitesi",
  unitType: "Meslek Yüksekokulu",
  unitName: "Teknik Bilimler Meslek Yüksekokulu",
  department: "Bilgisayar Teknolojileri Bölümü",
  program: "Bilgisayar Programcılığı Programı",
  city: "İzmir",
  academicYear: "2026-2027",
  semester: "Güz",
  headOfDepartment: "Doç. Dr. Mehmet ARSLAN",
  headTitle: "Bölüm Başkanı",
  unitDirector: "Prof. Dr. Ayşe DEMİRCİ",
  unitDirectorTitle: "Yüksekokul Müdürü",
  targetThreshold: 60,
  accreditationBody: "MEDEK",
};

const PO_TEXTS = [
  "Bilgisayar programcılığı alanında temel kuramsal ve uygulamalı bilgilere sahiptir.",
  "Alanında karşılaşılan problemleri tanımlar, analiz eder ve uygun algoritmik çözümler üretir.",
  "Güncel programlama dilleri ve geliştirme ortamlarını etkin biçimde kullanır.",
  "Veri tabanı tasarlar, yönetir ve sorgulama dilleriyle veri işlemlerini gerçekleştirir.",
  "Web ve mobil tabanlı uygulamalar geliştirir.",
  "Bilgisayar donanımı, işletim sistemleri ve ağ temellerini bilir; kurulum ve bakım yapar.",
  "Yazılım geliştirme süreçlerinde test, hata ayıklama ve dokümantasyon yapar.",
  "Bireysel ve ekip içinde sorumluluk alarak etkin çalışır.",
  "Mesleki konularda yazılı ve sözlü etkili iletişim kurar; en az bir yabancı dili mesleki düzeyde kullanır.",
  "Mesleki etik, bilişim hukuku, KVKK ve bilgi güvenliği ilkelerine uygun davranır.",
  "Yaşam boyu öğrenme bilinciyle alanındaki yenilikleri takip eder.",
  "İş sağlığı ve güvenliği, çevre ve kalite yönetimi konularında bilinçlidir.",
];

export const DEMO_PROGRAM_OUTCOMES: ProgramOutcome[] = PO_TEXTS.map((text, i) => ({
  id: `po_${i + 1}`,
  code: `PÇ-${i + 1}`,
  text,
}));

const VTYS_ID = "crs_vtys";

function lo(courseKey: string, items: string[]) {
  return items.map((text, i) => ({ id: `${courseKey}_oc${i + 1}`, code: `ÖÇ-${i + 1}`, text }));
}

function matrix(outcomeIds: string[], rows: number[][]): Record<string, number[]> {
  return Object.fromEntries(outcomeIds.map((id, i) => [id, rows[i] ?? new Array(12).fill(0)]));
}

function course(
  id: string,
  code: string,
  name: string,
  classYear: number,
  instructor: string,
  studentCount: number,
  outcomes: string[],
  m: number[][],
  credit = 3,
  ects = 4,
): Course {
  const ocs = lo(id, outcomes);
  return {
    id,
    code,
    name,
    classYear,
    semesterNo: classYear === 1 ? 1 : 3,
    credit,
    ects,
    instructor,
    studentCount,
    examDurationMin: 60,
    outcomes: ocs,
    ocPcMatrix: matrix(ocs.map((o) => o.id), m),
  };
}

export function demoCourses(): Course[] {
  return [
    course(
      VTYS_ID,
      "BLP201",
      "Veri Tabanı Yönetim Sistemleri",
      2,
      "Öğr. Gör. Dr. Elif KAYA",
      75,
      [
        "Veri tabanı kavramlarını, veri modellerini ve VTYS mimarisini açıklar.",
        "Varlık-İlişki (ER) diyagramı çizerek ilişkisel veri tabanı tasarlar.",
        "Normalizasyon kurallarını (1NF, 2NF, 3NF, BCNF) uygulayarak tabloları düzenler.",
        "SQL DDL ve DML komutlarıyla veri tanımlama, sorgulama ve güncelleme işlemleri yapar.",
        "İndeks, görünüm (view), saklı yordam ve transaction (ACID) kavramlarını kullanarak performans ve veri tutarlılığı sağlar.",
      ],
      [
        [5, 2, 1, 3, 0, 1, 0, 0, 1, 1, 2, 0],
        [3, 5, 2, 5, 2, 0, 3, 2, 1, 0, 1, 0],
        [3, 4, 1, 5, 1, 0, 2, 0, 0, 0, 1, 0],
        [2, 3, 5, 5, 4, 0, 3, 1, 0, 0, 2, 0],
        [2, 3, 3, 4, 3, 1, 3, 0, 0, 4, 2, 0],
      ],
      4,
      5,
    ),
    course("crs_alg", "BLP101", "Algoritma ve Programlamaya Giriş", 1, "Öğr. Gör. Burak ŞAHİN", 82,
      ["Problemleri algoritmik adımlarla ifade eder.", "Akış diyagramı ve sözde kod hazırlar.", "Temel kontrol yapılarıyla program yazar."],
      [[4, 5, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0], [3, 4, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0], [3, 4, 5, 0, 1, 0, 3, 0, 0, 0, 1, 0]]),
    course("crs_don", "BLP103", "Bilgisayar Donanımı", 1, "Öğr. Gör. Can ÖZTÜRK", 64,
      ["Bilgisayar bileşenlerini tanır ve işlevlerini açıklar.", "Donanım montajı ve arıza tespiti yapar.", "İş güvenliği kurallarına uygun çalışır."],
      [[4, 0, 0, 0, 0, 5, 0, 0, 0, 0, 1, 1], [2, 2, 0, 0, 0, 5, 1, 2, 0, 0, 0, 3], [1, 0, 0, 0, 0, 2, 0, 1, 0, 2, 0, 5]]),
    course("crs_ofis", "BLP105", "Ofis Yazılımları", 1, "Öğr. Gör. Zeynep ÇELİK", 70,
      ["Kelime işlemci ile resmi yazışma kurallarına uygun belge hazırlar.", "Elektronik tabloda formül ve grafik kullanır.", "Etkili sunum hazırlar."],
      [[2, 0, 3, 0, 0, 0, 1, 0, 4, 1, 0, 0], [2, 2, 3, 1, 0, 0, 0, 0, 2, 0, 1, 0], [1, 0, 2, 0, 0, 0, 0, 2, 5, 0, 1, 0]]),
    course("crs_mat", "MAT101", "Matematik I", 1, "Öğr. Gör. Dr. Hakan YILDIZ", 78,
      ["Fonksiyon ve limit kavramlarını açıklar.", "Türev kurallarını uygular.", "Matematiksel modelleme yapar."],
      [[4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], [3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [3, 5, 1, 1, 0, 0, 0, 0, 0, 0, 2, 0]]),
    course("crs_web", "BLP203", "Web Tabanlı Programlama", 2, "Öğr. Gör. Burak ŞAHİN", 58,
      ["HTML/CSS ile duyarlı arayüz geliştirir.", "Sunucu tarafı programlama ile dinamik sayfa üretir.", "Web güvenliği temel ilkelerini uygular."],
      [[2, 1, 4, 0, 5, 0, 1, 0, 0, 0, 1, 0], [2, 3, 4, 3, 5, 0, 2, 0, 0, 0, 1, 0], [1, 2, 2, 1, 3, 0, 2, 0, 0, 5, 1, 0]]),
    course("crs_ntp", "BLP205", "Nesne Tabanlı Programlama", 2, "Öğr. Gör. Dr. Elif KAYA", 61,
      ["Sınıf, nesne, kalıtım ve çok biçimlilik kavramlarını açıklar.", "Nesne yönelimli tasarım ilkeleriyle uygulama geliştirir.", "Hata yönetimi ve birim testi uygular."],
      [[4, 2, 3, 0, 1, 0, 1, 0, 0, 0, 1, 0], [2, 4, 5, 1, 2, 0, 3, 2, 0, 0, 1, 0], [1, 3, 3, 0, 1, 0, 5, 0, 0, 0, 1, 0]]),
    course("crs_mob", "BLP207", "Mobil Programlama", 2, "Öğr. Gör. Selin AKTAŞ", 45,
      ["Mobil uygulama mimarilerini açıklar.", "Mobil arayüz ve veri saklama işlemlerini gerçekleştirir.", "Uygulamayı test edip yayına hazırlar."],
      [[3, 1, 2, 0, 4, 0, 0, 0, 0, 0, 2, 0], [2, 3, 4, 3, 5, 0, 2, 1, 0, 1, 1, 0], [1, 2, 3, 0, 4, 0, 5, 1, 1, 1, 1, 0]]),
  ];
}

export function demoRooms(): Room[] {
  return [
    { id: "rm_amfi1", name: "Amfi-1", building: "A Blok", capacity: 60, invigilatorsNeeded: 2 },
    { id: "rm_d101", name: "D-101", building: "D Blok", capacity: 40, invigilatorsNeeded: 1 },
    { id: "rm_d102", name: "D-102", building: "D Blok", capacity: 40, invigilatorsNeeded: 1 },
    { id: "rm_lab1", name: "Lab-1", building: "B Blok", capacity: 30, invigilatorsNeeded: 1 },
  ];
}

export function demoInvigilators(): Invigilator[] {
  return [
    { id: "inv_1", title: "Öğr. Gör.", name: "Burak ŞAHİN", email: "burak.sahin@ornek.edu.tr", unavailable: ["0|s1", "2|s1"], maxDailyDuties: 3 },
    { id: "inv_2", title: "Öğr. Gör.", name: "Zeynep ÇELİK", email: "zeynep.celik@ornek.edu.tr", unavailable: ["1|s3", "1|s4"], maxDailyDuties: 3 },
    { id: "inv_3", title: "Öğr. Gör.", name: "Can ÖZTÜRK", email: "can.ozturk@ornek.edu.tr", unavailable: [], maxDailyDuties: 3 },
    { id: "inv_4", title: "Öğr. Gör.", name: "Selin AKTAŞ", email: "selin.aktas@ornek.edu.tr", unavailable: ["3|s1", "3|s2", "3|s3", "3|s4"], maxDailyDuties: 2 },
    { id: "inv_5", title: "Arş. Gör.", name: "Emre KOÇ", email: "emre.koc@ornek.edu.tr", unavailable: [], maxDailyDuties: 3 },
    { id: "inv_6", title: "Arş. Gör.", name: "Deniz YURT", email: "deniz.yurt@ornek.edu.tr", unavailable: ["4|s4"], maxDailyDuties: 3 },
  ];
}

export function demoScheduleSettings(courseIds: string[]): ScheduleSettings {
  return {
    periodName: "2026-2027 Güz Yarıyılı Ara Sınav Dönemi",
    startDate: "2026-11-16",
    dayCount: 5,
    skipWeekends: true,
    slots: [
      { id: "s1", start: "09:00", end: "10:00" },
      { id: "s2", start: "10:30", end: "11:30" },
      { id: "s3", start: "13:30", end: "14:30" },
      { id: "s4", start: "15:00", end: "16:00" },
    ],
    maxExamsPerClassPerDay: 2,
    courseIds,
  };
}

const FIRST_NAMES = [
  "Ahmet", "Mehmet", "Ayşe", "Fatma", "Mustafa", "Zeynep", "Elif", "Emre", "Burak", "Merve",
  "Yusuf", "Esra", "Hüseyin", "Büşra", "İbrahim", "Selin", "Ömer", "Damla", "Kaan", "Ece",
  "Murat", "Sude", "Berk", "Gizem", "Onur", "İrem", "Serkan", "Cansu", "Tolga", "Nisa",
  "Furkan", "Rabia", "Enes", "Melike", "Oğuz", "Şeyma", "Arda", "Dilara", "Kerem", "Yağmur",
];
const LAST_NAMES = [
  "YILMAZ", "KAYA", "DEMİR", "ŞAHİN", "ÇELİK", "YILDIZ", "YILDIRIM", "ÖZTÜRK", "AYDIN", "ÖZDEMİR",
  "ARSLAN", "DOĞAN", "KILIÇ", "ASLAN", "ÇETİN", "KARA", "KOÇ", "KURT", "ÖZKAN", "ŞİMŞEK",
  "POLAT", "ÖZCAN", "KORKMAZ", "ÇAKIR", "ERDOĞAN", "YAVUZ", "CAN", "ACAR", "AKTAŞ", "GÜLER",
  "TÜRK", "AKSOY", "BULUT", "GÜNEŞ", "TEKİN", "ERDEM", "UYSAL", "KESKİN", "SARI", "ÜNAL",
];

export function demoStudents(count = 75, seed = 2025): Student[] {
  const rng = createRng(seed);
  const used = new Set<string>();
  const out: Student[] = [];
  for (let i = 1; i <= count; i++) {
    let first = "";
    let last = "";
    do {
      first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
      last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    } while (used.has(first + last));
    used.add(first + last);
    const no = `251010${String(i).padStart(3, "0")}`;
    out.push({ id: `st_${no}`, no, firstName: first, lastName: last });
  }
  return out;
}

function q(partial: Partial<Question> & Pick<Question, "id" | "type" | "text" | "points" | "outcomeIds" | "bloom">): Question {
  return {
    options: [],
    answerKey: "",
    rubric: [],
    answerLines: 6,
    ...partial,
  };
}

export function demoQuestions(): Question[] {
  const oc = (n: number) => `${VTYS_ID}_oc${n}`;
  return [
    q({
      id: "q_1",
      type: "mcq",
      points: 10,
      outcomeIds: [oc(1)],
      bloom: "hatirlama",
      text: "Aşağıdakilerden hangisi bir Veri Tabanı Yönetim Sisteminin (VTYS) temel işlevlerinden biri **değildir**?",
      options: [
        { id: "q1a", text: "Veri bütünlüğünün ve tutarlılığının sağlanması" },
        { id: "q1b", text: "Eşzamanlı (concurrent) erişim denetimi" },
        { id: "q1c", text: "Yedekleme ve kurtarma (backup & recovery)" },
        { id: "q1d", text: "Kaynak kodun makine diline derlenmesi" },
        { id: "q1e", text: "Kullanıcı yetkilendirme ve güvenlik yönetimi" },
      ],
      correctOptionId: "q1d",
      answerKey: "Kaynak kodun makine diline derlenmesi bir derleyicinin (compiler) görevidir; VTYS işlevi değildir.",
      rubric: [{ id: "r11", description: "Doğru şık (D) işaretlenmesi", points: 10 }],
    }),
    q({
      id: "q_2",
      type: "truefalse",
      points: 10,
      outcomeIds: [oc(5)],
      bloom: "anlama",
      text: "ACID özelliklerinden \"Isolation (Yalıtım)\", eşzamanlı çalışan transaction'ların birbirlerinin tamamlanmamış ara sonuçlarını görmemesini garanti eder.",
      correctBool: true,
      answerKey: "Doğru. Yalıtım, eşzamanlı transaction'ların sanki sıralı çalışıyormuş gibi sonuç üretmesini sağlar.",
      rubric: [{ id: "r21", description: "Doğru yanıt (D)", points: 10 }],
    }),
    q({
      id: "q_3",
      type: "fill",
      points: 15,
      outcomeIds: [oc(4)],
      bloom: "uygulama",
      text: "Bir tablodan yalnızca tekrarsız değerleri listelemek için SELECT ________ ifadesi; GROUP BY ile gruplanmış sonuçlara koşul uygulamak için ________ ifadesi; iki tabloyu yalnızca eşleşen kayıtlarla birleştirmek için ________ JOIN kullanılır.",
      answerKey: "1) DISTINCT   2) HAVING   3) INNER",
      rubric: [
        { id: "r31", description: "DISTINCT", points: 5 },
        { id: "r32", description: "HAVING", points: 5 },
        { id: "r33", description: "INNER", points: 5 },
      ],
      answerLines: 0,
    }),
    q({
      id: "q_4",
      type: "open",
      points: 20,
      outcomeIds: [oc(2), oc(3)],
      bloom: "analiz",
      text: "Bir üniversite kütüphanesi için; Üye (üye no, ad, bölüm), Kitap (ISBN, ad, yayınevi, yazarlar) ve Ödünç (üye, kitap, alış tarihi, iade tarihi) bilgilerini tutan bir veri tabanı tasarlanacaktır. Varlıkları, ilişkileri ve kardinaliteleri gösteren ER diyagramını çiziniz; ardından tasarımınızın 3NF'e uygunluğunu gerekçeleriyle analiz ediniz.",
      answerKey:
        "Varlıklar: UYE(uye_no PK, ad, bolum), KITAP(isbn PK, ad, yayinevi_id FK), YAZAR(yazar_id PK, ad), KITAP_YAZAR(isbn FK, yazar_id FK) [M:N çözümü], ODUNC(odunc_id PK, uye_no FK, isbn FK, alis_tarihi, iade_tarihi). UYE–ODUNC 1:N, KITAP–ODUNC 1:N, KITAP–YAZAR M:N. Çok değerli 'yazarlar' niteliği ayrı tabloya alındığı için 1NF; bileşik anahtara kısmi bağımlılık olmadığı için 2NF; yayınevi bilgisi ayrı tabloda tutulduğu için geçişli bağımlılık bulunmaz → 3NF.",
      rubric: [
        { id: "r41", description: "Varlık ve nitelikleri doğru belirleme", points: 5 },
        { id: "r42", description: "İlişki ve kardinaliteler (M:N çözümü dahil)", points: 7 },
        { id: "r43", description: "1NF-2NF-3NF gerekçeli analizi", points: 8 },
      ],
      answerLines: 12,
    }),
    q({
      id: "q_5",
      type: "code",
      points: 25,
      outcomeIds: [oc(4)],
      bloom: "uygulama",
      text: "Aşağıda şeması verilen tablolara göre; 2026-2027 Güz döneminde en az 3 derse kayıtlı olan ve not ortalaması 70'in üzerindeki öğrencilerin numara, ad-soyad ve ortalamasını ortalamaya göre azalan sırada listeleyen SQL sorgusunu yazınız.",
      code: "CREATE TABLE ogrenci (\n  ogr_no    INT PRIMARY KEY,\n  ad_soyad  VARCHAR(80),\n  bolum_id  INT\n);\n\nCREATE TABLE kayit (\n  ogr_no    INT REFERENCES ogrenci(ogr_no),\n  ders_kodu VARCHAR(10),\n  donem     VARCHAR(15),\n  notu      NUMERIC(5,2)\n);",
      codeLanguage: "sql",
      answerKey:
        "SELECT o.ogr_no, o.ad_soyad, AVG(k.notu) AS ortalama\nFROM ogrenci o\nINNER JOIN kayit k ON k.ogr_no = o.ogr_no\nWHERE k.donem = '2026-2027 Güz'\nGROUP BY o.ogr_no, o.ad_soyad\nHAVING COUNT(*) >= 3 AND AVG(k.notu) > 70\nORDER BY ortalama DESC;",
      rubric: [
        { id: "r51", description: "Doğru JOIN ve WHERE koşulu", points: 7 },
        { id: "r52", description: "GROUP BY + aggregate (AVG, COUNT) kullanımı", points: 8 },
        { id: "r53", description: "HAVING koşulları", points: 6 },
        { id: "r54", description: "ORDER BY ve sözdizimi doğruluğu", points: 4 },
      ],
      answerLines: 10,
    }),
    q({
      id: "q_6",
      type: "latex",
      points: 20,
      outcomeIds: [oc(3), oc(5)],
      bloom: "degerlendirme",
      text: "Aşağıdaki R ilişkisi ve fonksiyonel bağımlılık kümesi F veriliyor. (a) (AC)⁺ kapanışını bulunuz. (b) R'nin aday anahtarını belirleyiniz. (c) R'nin en yüksek hangi normal formda olduğunu değerlendirip gerekirse BCNF'e ayrıştırınız; ayrıştırmanın kayıpsız olduğunu gerekçelendiriniz.",
      latex: "R(A,B,C,D,E), \\quad F = \\{\\, A \\rightarrow B,\\; BC \\rightarrow D,\\; D \\rightarrow E \\,\\}",
      answerKey:
        "(a) (AC)+ = {A, C, B, D, E}. (b) Aday anahtar: AC. (c) A→B kısmi bağımlılık olduğundan R 1NF'tedir (2NF değil). BCNF ayrıştırma: R1(A,B), R2(B,C,D), R3(D,E), R4(A,C). Ortak nitelikler her adımda bir tarafın anahtarı olduğundan ayrıştırma kayıpsızdır.",
      rubric: [
        { id: "r61", description: "Kapanış hesabı", points: 6 },
        { id: "r62", description: "Aday anahtar tespiti", points: 4 },
        { id: "r63", description: "Normal form değerlendirmesi ve BCNF ayrıştırma", points: 7 },
        { id: "r64", description: "Kayıpsız birleşim gerekçesi", points: 3 },
      ],
      answerLines: 12,
    }),
  ];
}

export function createDemoVault(): VaultData {
  const courses = demoCourses();
  const rooms = demoRooms();
  const invigilators = demoInvigilators();
  const settings = demoScheduleSettings(courses.map((c) => c.id));
  const schedule = solveSchedule({ courses, rooms, invigilators, settings, seed: 20261116 });
  const dates = scheduleDates(settings);
  const vtysEntry = schedule.entries.find((e) => e.courseId === VTYS_ID);
  const slot = settings.slots.find((s) => s.id === vtysEntry?.slotId) ?? settings.slots[0];
  const now = new Date().toISOString();

  const exam: Exam = {
    id: "exam_vtys_ara",
    courseId: VTYS_ID,
    title: "Veri Tabanı Yönetim Sistemleri Ara Sınavı",
    examType: "Ara Sınav",
    date: vtysEntry ? dates[vtysEntry.dayIndex] : settings.startDate,
    startTime: slot.start,
    durationMin: 60,
    instructions:
      "Sınav süresi 60 dakikadır. İlk 20 dakika sınav salonundan çıkılmaz.\nCep telefonları kapalı olarak çanta içinde tutulmalıdır.\nCevaplarınızı yalnızca kâğıt üzerindeki ayrılmış alanlara yazınız.\nKopya çekmeye teşebbüs edenler hakkında Yükseköğretim Kurumları Öğrenci Disiplin Yönetmeliği hükümleri uygulanır.\nBaşarılar dilerim.",
    questions: demoQuestions(),
    shuffleSeed: 4242,
    shuffleOptions: true,
    createdAt: now,
    updatedAt: now,
  };

  const students = demoStudents(75);
  const seatingRooms = vtysEntry
    ? vtysEntry.rooms.map((r) => rooms.find((x) => x.id === r.roomId)!).filter(Boolean)
    : rooms.slice(0, 2);
  const seating = buildSeatingPlan(exam.id, students, seatingRooms, "butterfly", 1453, true);

  const rows = simulateGrades(
    exam,
    students.map((s) => ({ no: s.no, fullName: `${s.firstName} ${s.lastName}` })),
    40,
    2026,
  );

  const vtysOutcomes = courses[0].outcomes.map((o) => o.id);
  const projectRubric = createRubricFromTemplate("proje", VTYS_ID, [vtysOutcomes[1], vtysOutcomes[2], vtysOutcomes[3], vtysOutcomes[0], vtysOutcomes[4]]);
  projectRubric.title = "VTYS Dönem Projesi: Kütüphane Otomasyonu Veri Tabanı — Analitik Rubrik";
  const labRubric = createRubricFromTemplate("laboratuvar", VTYS_ID, [vtysOutcomes[0], vtysOutcomes[3], vtysOutcomes[3], vtysOutcomes[4], vtysOutcomes[3]]);
  labRubric.title = "SQL Laboratuvar Föyü (Hafta 6: JOIN ve Alt Sorgular) Değerlendirme Rubriği";

  return {
    institution: { ...DEMO_INSTITUTION },
    programOutcomes: DEMO_PROGRAM_OUTCOMES.map((p) => ({ ...p })),
    courses,
    exams: [exam],
    rooms,
    invigilators,
    schedule,
    students: { [VTYS_ID]: students },
    seating: { [exam.id]: seating },
    rubrics: [projectRubric, labRubric],
    grades: {
      [exam.id]: {
        examId: exam.id,
        rows,
        puko: {},
        generalEvaluation:
          "Sınava katılım oranı yüksek olup sınıf ortalaması kabul edilebilir düzeydedir. Üst düzey bilişsel beceri gerektiren normalizasyon ve transaction sorularında başarının düştüğü gözlenmiştir.",
        updatedAt: now,
      },
    },
    ai: { ...DEFAULT_AI_SETTINGS, keys: { ...DEFAULT_AI_SETTINGS.keys }, models: { ...DEFAULT_AI_SETTINGS.models } },
    ui: { activeExamId: exam.id, activeRubricId: projectRubric.id, activeCourseId: VTYS_ID },
  };
}

/** Boş (sıfırdan) kasa — "Örnek Veriyi Temizle" için. */
export function createEmptyVault(): VaultData {
  const settings = demoScheduleSettings([]);
  return {
    institution: { ...DEMO_INSTITUTION, university: "", unitName: "", department: "", program: "", headOfDepartment: "", unitDirector: "" },
    programOutcomes: DEMO_PROGRAM_OUTCOMES.map((p) => ({ ...p })),
    courses: [],
    exams: [],
    rooms: [],
    invigilators: [],
    schedule: { settings, entries: [], unplaced: [], log: [] },
    students: {},
    seating: {},
    rubrics: [],
    grades: {},
    ai: { ...DEFAULT_AI_SETTINGS, keys: { ...DEFAULT_AI_SETTINGS.keys }, models: { ...DEFAULT_AI_SETTINGS.models } },
    ui: { activeExamId: null, activeRubricId: null, activeCourseId: null },
  };
}
