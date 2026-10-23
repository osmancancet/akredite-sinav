// Kanıthane — Çekirdek veri modeli
// Bu dosyadaki tüm yapılar tarayıcıda AES-256-GCM ile şifrelenerek IndexedDB'de saklanır.

export type UnitType = "Meslek Yüksekokulu" | "Fakülte" | "Yüksekokul" | "Enstitü";
export type Semester = "Güz" | "Bahar" | "Yaz";

export interface Institution {
  university: string;
  unitType: UnitType;
  unitName: string;
  department: string;
  program: string;
  city: string;
  academicYear: string;
  semester: Semester;
  headOfDepartment: string;
  headTitle: string;
  unitDirector: string;
  unitDirectorTitle: string;
  logoDataUrl?: string;
  targetThreshold: number; // PUKÖ hedef eşik (%), varsayılan 60
  accreditationBody: "MEDEK" | "MÜDEK" | "FEDEK" | "YÖKAK";
}

export interface ProgramOutcome {
  id: string;
  code: string; // PÇ-1
  text: string;
}

export interface LearningOutcome {
  id: string;
  code: string; // ÖÇ-1
  text: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  classYear: number; // 1. sınıf, 2. sınıf ...
  semesterNo: number;
  credit: number;
  ects: number;
  instructor: string; // Unvan + Ad Soyad
  studentCount: number;
  examDurationMin: number;
  outcomes: LearningOutcome[];
  /** ÖÇ id -> PÇ ağırlıkları (programOutcomes sırasıyla, 0-5) */
  ocPcMatrix: Record<string, number[]>;
}

export type BloomLevel =
  | "hatirlama"
  | "anlama"
  | "uygulama"
  | "analiz"
  | "degerlendirme"
  | "yaratma";

export type QuestionType = "mcq" | "open" | "code" | "truefalse" | "fill" | "latex";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface RubricLine {
  id: string;
  description: string;
  points: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  outcomeIds: string[];
  bloom: BloomLevel;
  options: QuestionOption[];
  correctOptionId?: string;
  correctBool?: boolean;
  code?: string;
  codeLanguage?: string;
  latex?: string;
  answerKey: string;
  rubric: RubricLine[];
  answerLines: number; // klasik sorular için cevap boşluğu (satır)
}

export type ExamType = "Ara Sınav" | "Final" | "Bütünleme" | "Mazeret" | "Kısa Sınav";

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  examType: ExamType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMin: number;
  instructions: string;
  questions: Question[];
  shuffleSeed: number;
  shuffleOptions: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Modül 3: Sınav Programı ----------

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number; // sınav düzeni kapasitesi
  invigilatorsNeeded: number;
}

export interface Invigilator {
  id: string;
  title: string;
  name: string;
  email: string;
  /** "gün|slotId" formatında müsait olmadığı dilimler */
  unavailable: string[];
  maxDailyDuties: number;
}

export interface TimeSlot {
  id: string;
  start: string; // HH:mm
  end: string;
}

export interface ScheduleSettings {
  periodName: string; // "2025-2026 Güz Ara Sınav Dönemi"
  startDate: string; // YYYY-MM-DD
  dayCount: number;
  skipWeekends: boolean;
  slots: TimeSlot[];
  maxExamsPerClassPerDay: number;
  courseIds: string[]; // programa dahil dersler
}

export interface ScheduleRoomAllocation {
  roomId: string;
  studentCount: number;
  invigilatorIds: string[];
}

export interface ScheduleEntry {
  id: string;
  courseId: string;
  dayIndex: number;
  slotId: string;
  rooms: ScheduleRoomAllocation[];
  locked: boolean;
}

export interface Schedule {
  settings: ScheduleSettings;
  entries: ScheduleEntry[];
  unplaced: string[]; // yerleştirilemeyen ders id'leri
  generatedAt?: string;
  log: string[];
}

// ---------- Modül 4: Oturma Düzeni ----------

export interface Student {
  id: string;
  no: string;
  firstName: string;
  lastName: string;
}

export type SeatingMode = "butterfly" | "sorted";

export interface SeatAssignment {
  seatNo: number;
  studentId: string;
  booklet: "A" | "B";
}

export interface RoomSeating {
  roomId: string;
  seats: SeatAssignment[];
}

export interface SeatingPlan {
  examId: string;
  mode: SeatingMode;
  seed: number;
  roomIds: string[];
  rooms: RoomSeating[];
  generatedAt: string;
}

// ---------- Modül 5: Rubrik ----------

export type RubricType = "proje" | "odev" | "laboratuvar" | "sunum" | "isyeri";

export interface RubricCriterion {
  id: string;
  name: string;
  outcomeIds: string[];
  weight: number; // puan
  levels: [string, string, string, string]; // Yetersiz, Geliştirilmeli, İyi, Mükemmel
}

export interface Rubric {
  id: string;
  type: RubricType;
  title: string;
  courseId: string;
  description: string;
  criteria: RubricCriterion[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Modül 6: Not & PUKÖ ----------

export interface GradeRow {
  id: string;
  studentNo: string;
  fullName: string;
  /** soru id -> alınan puan (boş = null) */
  scores: Record<string, number | null>;
}

export interface PukoEntry {
  outcomeId: string;
  rootCause: string;
  plan: string; // Planla
  doAction: string; // Uygula
  check: string; // Kontrol Et
  act: string; // Önlem Al
}

export interface GradeSheet {
  examId: string;
  rows: GradeRow[];
  puko: Record<string, PukoEntry>;
  generalEvaluation: string;
  updatedAt: string;
}

// ---------- Modül 7: AI ----------

export type AiProvider = "gemini" | "openai" | "anthropic" | "ollama";

export interface AiSettings {
  provider: AiProvider;
  keys: Record<Exclude<AiProvider, "ollama">, string>;
  models: Record<AiProvider, string>;
  ollamaUrl: string;
  temperature: number;
  consentAccepted: boolean;
}

// ---------- Soru Bankası ----------

export interface BankQuestion {
  id: string;
  courseId: string;
  question: Question;
  savedAt: string;
  usedCount: number;
  lastUsedAt?: string;
  sourceExamTitle?: string;
}

// ---------- Kasa ----------

export interface UiState {
  activeExamId: string | null;
  activeRubricId: string | null;
  activeCourseId: string | null;
  /** İlk kurulum sihirbazı tamamlandı mı */
  onboarded: boolean;
  /** Kasanın ilk kullanım zamanı (yedek hatırlatıcısı için) */
  firstUseAt?: string;
  lastBackupAt?: string;
  backupReminderSnoozedUntil?: string;
}

export interface VaultData {
  institution: Institution;
  programOutcomes: ProgramOutcome[];
  courses: Course[];
  exams: Exam[];
  rooms: Room[];
  invigilators: Invigilator[];
  schedule: Schedule;
  students: Record<string, Student[]>; // courseId -> öğrenci listesi
  seating: Record<string, SeatingPlan>; // examId -> plan
  rubrics: Rubric[];
  grades: Record<string, GradeSheet>; // examId -> not çizelgesi
  questionBank: BankQuestion[];
  accreditation: import("./accreditation/types").AccreditationWorkspace;
  ai: AiSettings;
  ui: UiState;
}

export type CollectionKey = keyof VaultData;

export const COLLECTION_KEYS: CollectionKey[] = [
  "institution",
  "programOutcomes",
  "courses",
  "exams",
  "rooms",
  "invigilators",
  "schedule",
  "students",
  "seating",
  "rubrics",
  "grades",
  "questionBank",
  "accreditation",
  "ai",
  "ui",
];
