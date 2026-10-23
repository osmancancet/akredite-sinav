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
  id: string; // şifreli blob kimliği
  name: string;
  size: number;
  mime: string;
  sha256: string;
  addedAt: string;
  origin: "upload" | "app";
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

export interface AccreditationWorkspace {
  active: ActiveFramework[];
  current: string | null;
  records: Record<string, EvidenceRecord>; // `${slug}::${evidenceId}`
  custom: Record<string, CustomEvidence[]>; // slug -> özel kanıtlar
  maturity: Record<string, number>; // `${slug}::${subId}` -> 1..5
}

export const emptyWorkspace = (): AccreditationWorkspace => ({ active: [], current: null, records: {}, custom: {}, maturity: {} });

export const STATUS_LABEL: Record<EvidenceStatus, string> = {
  missing: "Eksik",
  "in-progress": "Hazırlanıyor",
  ready: "Hazır",
  na: "Uygulanamaz",
};
