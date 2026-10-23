import type { AccreditationWorkspace, ActiveFramework, EvidenceRecord, FwCriterion, FwEvidence } from "./types";

export const recKey = (slug: string, evidenceId: string) => `${slug}::${evidenceId}`;
export const matKey = (slug: string, subId: string) => `${slug}::${subId}`;

export function criterionEvidence(ws: AccreditationWorkspace, fw: ActiveFramework, c: FwCriterion): FwEvidence[] {
  const custom = (ws.custom[fw.slug] ?? [])
    .filter((x) => x.criterionId === c.id)
    .map((x): FwEvidence => ({ id: x.id, title: x.title, kind: "derived", source: "", basis: "Kurum tarafından eklenen özel kanıt" }));
  return [...(c.evidence ?? []), ...custom];
}

export interface Progress {
  total: number;
  ready: number;
  inProgress: number;
  missing: number;
  na: number;
  attachments: number;
  pct: number; // hazır / (toplam − uygulanamaz)
}

export function progressOf(ws: AccreditationWorkspace, fw: ActiveFramework, criteria?: FwCriterion[]): Progress {
  const list = (criteria ?? fw.snapshot.criteria).flatMap((c) => criterionEvidence(ws, fw, c));
  const p: Progress = { total: list.length, ready: 0, inProgress: 0, missing: 0, na: 0, attachments: 0, pct: 0 };
  list.forEach((e) => {
    const r: EvidenceRecord | undefined = ws.records[recKey(fw.slug, e.id)];
    const st = r?.status ?? "missing";
    if (st === "ready") p.ready++;
    else if (st === "in-progress") p.inProgress++;
    else if (st === "na") p.na++;
    else p.missing++;
    p.attachments += r?.attachments.length ?? 0;
  });
  const denom = p.total - p.na;
  p.pct = denom > 0 ? (p.ready / denom) * 100 : 0;
  return p;
}

/**
 * Tahmini puan (yalnızca puanlı çerçevelerde, ör. YÖKAK KAP): ölçüt puanı × (ortalama olgunluk / 5).
 * YÖKAK alt ölçüt düzeyinde puan dağılımı yayımlamadığından bu RESMİ bir hesap değildir; öz değerlendirme
 * amacıyla gösterilir. Olgunluk girilmemiş alt ölçütler hesaba katılmaz.
 */
export function estimatedScore(ws: AccreditationWorkspace, fw: ActiveFramework): { score: number; max: number; rated: number; totalSubs: number } | null {
  const scored = fw.snapshot.criteria.filter((c) => typeof c.points === "number" && (c.sub?.length ?? 0) > 0);
  if (!scored.length) return null;
  let score = 0;
  let max = 0;
  let rated = 0;
  let totalSubs = 0;
  scored.forEach((c) => {
    const levels = (c.sub ?? []).map((s) => ws.maturity[matKey(fw.slug, s.id)]).filter((v): v is number => typeof v === "number");
    totalSubs += c.sub?.length ?? 0;
    rated += levels.length;
    max += c.points ?? 0;
    if (levels.length) score += (c.points ?? 0) * (levels.reduce((a, b) => a + b, 0) / levels.length / 5);
  });
  return { score, max, rated, totalSubs };
}

/** Değerlendirilebilir birimler: rehber satırları (MEDEK), olgunluk tanımlı alt ölçütler (YÖKAK) */
export function assessmentUnits(fw: ActiveFramework): { id: string; criterionId: string }[] {
  return fw.snapshot.criteria.flatMap((c) =>
    (c.sub ?? []).flatMap((s) => (s.rubric?.length ? s.rubric.map((r) => ({ id: r.id, criterionId: c.id })) : s.maturity ? [{ id: s.id, criterionId: c.id }] : [])),
  );
}

/** Öz değerlendirme ortalaması (1–5); yalnızca kurumun işaretlediği düzeyler */
export function selfAssessment(ws: AccreditationWorkspace, fw: ActiveFramework): { mean: number; rated: number; total: number; low: number } {
  const units = assessmentUnits(fw);
  const levels = units.map((u) => ws.maturity[matKey(fw.slug, u.id)]).filter((v): v is number => typeof v === "number");
  return { mean: levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0, rated: levels.length, total: units.length, low: levels.filter((v) => v <= 2).length };
}

/** Kanıt kayıtlarının başvurduğu şifreli ek kimlikleri. */
export function referencedBlobIds(data: { accreditation: AccreditationWorkspace }): Set<string> {
  const ids = new Set<string>();
  Object.values(data.accreditation?.records ?? {}).forEach((r) => r.attachments.forEach((a) => ids.add(a.id)));
  (data.accreditation?.inbox ?? []).forEach((req) => Object.values(req.answers).forEach((ans) => ans.attachments.forEach((a) => ids.add(a.id))));
  return ids;
}

/** Bir dosya kimliğinin çalışma alanında (hariç tutulan anahtarlar dışında) hâlâ kullanılıp kullanılmadığı */
export function blobStillReferenced(ws: AccreditationWorkspace, blobId: string, exceptRecordKeys: Set<string> = new Set()): boolean {
  for (const [k, r] of Object.entries(ws.records)) {
    if (exceptRecordKeys.has(k)) continue;
    if (r.attachments.some((a) => a.id === blobId)) return true;
  }
  return ws.inbox.some((req) => Object.values(req.answers).some((ans) => ans.attachments.some((a) => a.id === blobId)));
}
