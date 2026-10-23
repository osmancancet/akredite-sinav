// Akreditasyon çerçevesi (normalize edilmiş araştırma verisi) ve kanıt çalışma alanı tipleri.
// Çerçeve dosyaları public/frameworks/*.json altında; her ölçüt ve kanıt kalemi birincil kaynağa bağlıdır.

export type FrameworkStatus = "verified" | "partial" | "not_found" | "custom";
export type EvidenceKind = "explicit" | "derived";

export interface FrameworkDocument {
  title?: string;
  version?: string;
  date?: string;
  url: string;
  role?: string;
}

/** Kuruluş rehberindeki düzey tanımları (ör. MEDEK Rehberi v1.1: her satır 1–5 düzey tanımı) */
export interface FwRubricRow {
  id: string;
  statement: string;
  levels: Record<string, string>;
  source: string;
}

export interface FwSub {
  id: string;
  title?: string;
  text: string;
  maturity?: Record<string, string>;
  rubric?: FwRubricRow[];
  critical?: boolean;
  source: string;
  note?: string;
}

export interface FwEvidence {
  id: string;
  title: string;
  kind: EvidenceKind;
  basis?: string;
  source: string;
  sub?: string;
  versions?: string[];
  note?: string;
}

export interface FwCriterion {
  id: string;
  title: string;
  heading?: string;
  points?: number;
  headingPoints?: number;
  description?: string;
  disciplineSpecific?: boolean;
  critical?: boolean;
  appliesTo?: string;
  source?: string;
  sub?: FwSub[];
  evidence?: FwEvidence[];
}

export interface Framework {
  code: string;
  slug: string;
  name?: string;
  kind: "institutional" | "program";
  scope?: string;
  website?: string;
  status: FrameworkStatus;
  documents?: FrameworkDocument[];
  cycle?: string;
  report?: { title?: string; url?: string; sections?: string[]; requiredAppendices?: string[]; writingRules?: string[] };
  notes?: string;
  scoring?: string;
  /** Belgede adlandırılmış öz değerlendirme ölçeği, ör. { "1": "Eksik", ..., "5": "Çok İyi" } */
  scale?: Record<string, string>;
  programOutcomes?: { id: string; group?: string; text: string; source: string }[];
  accessed: string;
  criteria: FwCriterion[];
}

export interface FrameworkIndexEntry {
  code: string;
  registryCode?: string;
  slug: string;
  name?: string;
  kind: "institutional" | "program";
  scope?: string;
  status: FrameworkStatus;
  criteria: number;
  subcriteria: number;
  evidence: number;
  explicit: number;
  document?: FrameworkDocument | null;
  website?: string;
}

// ---------------------------------------------------------------------------
// Kanıt çalışma alanı (şifreli kasada)
// ---------------------------------------------------------------------------

export type EvidenceStatus = "missing" | "in-progress" | "ready" | "na";

export interface EvidenceAttachment {
  id: string; // şifreli blob kimliği (aynı dosya birden çok kanıta bağlanabilir)
  name: string;
  size: number;
  mime: string;
  sha256: string;
  addedAt: string;
  origin: "upload" | "app" | "team";
  /** Akademik yıl, ör. "2025-2026" */
  period?: string;
  /** Ekip teslimiyle geldiyse teslim eden */
  submittedBy?: string;
}

export interface EvidenceRecord {
  status: EvidenceStatus;
  owner?: string;
  due?: string;
  note?: string;
  attachments: EvidenceAttachment[];
  updatedAt: string;
}

export interface CustomEvidence {
  id: string;
  criterionId: string;
  title: string;
}

export interface ActiveFramework {
  slug: string;
  activatedAt: string;
  scopeLabel: string; // ör. "Bilgisayar Programcılığı Programı" veya "Kurum geneli"
  snapshot: Framework; // etkinleştirme anındaki ölçüt sürümü (çevrimdışı + denetim izi)
}

/** Düşük öz değerlendirme düzeyinden veya ölçütten açılan iyileştirme eylemi (PUKÖ) */
export interface ImprovementAction {
  id: string;
  criterionId: string;
  unitId?: string; // rehber satırı / alt ölçüt
  title: string;
  owner?: string;
  due?: string;
  status: "open" | "done";
  note?: string;
  createdAt: string;
  doneAt?: string;
}

/** Talep dosyasında öğretim elemanına gösterilen kanıt kalemi (yalnızca kamuya açık ölçüt metni) */
export interface RequestItem {
  evidenceId: string;
  title: string;
  criterionId: string;
  criterionTitle: string;
  sub?: string;
  basis?: string;
  source?: string;
}

export interface RequestSubmissionLog {
  id: string;
  receivedAt: string;
  submittedAt: string;
  respondent: string;
  files: number;
  items: number;
}

/** Koordinatörün gönderdiği kanıt talebi; özel anahtar yalnızca bu kasada (şifreli) durur */
export interface EvidenceRequest {
  id: string;
  slug: string;
  createdAt: string;
  recipient: string;
  message?: string;
  due?: string;
  items: string[];
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  fingerprint: string;
  /** Gönderilen talep dosyasının birebir kopyası (yeniden indirme aynı doğrulama kodunu verir) */
  file: import("./exchange").RequestFile;
  submissions: RequestSubmissionLog[];
}

/** Öğretim elemanının aldığı talep ve hazırladığı cevaplar */
export interface IncomingRequest {
  id: string;
  receivedAt: string;
  coordinator: string;
  institution: string;
  frameworkCode: string;
  frameworkName?: string;
  scopeLabel: string;
  recipient: string;
  message?: string;
  due?: string;
  publicJwk: JsonWebKey;
  fingerprint: string;
  items: RequestItem[];
  answers: Record<string, { note?: string; attachments: EvidenceAttachment[] }>;
  submissions: string[];
}

export interface AccreditationWorkspace {
  active: ActiveFramework[];
  current: string | null;
  records: Record<string, EvidenceRecord>; // `${slug}::${evidenceId}`
  custom: Record<string, CustomEvidence[]>; // slug -> özel kanıtlar
  maturity: Record<string, number>; // `${slug}::${subId}` -> 1..5
  actions: Record<string, ImprovementAction[]>; // slug -> eylemler
  requests: EvidenceRequest[];
  inbox: IncomingRequest[];
  profileName?: string;
}

export const emptyWorkspace = (): AccreditationWorkspace => ({ active: [], current: null, records: {}, custom: {}, maturity: {}, actions: {}, requests: [], inbox: [] });

export const STATUS_LABEL: Record<EvidenceStatus, string> = {
  missing: "Eksik",
  "in-progress": "Hazırlanıyor",
  ready: "Hazır",
  na: "Uygulanamaz",
};
