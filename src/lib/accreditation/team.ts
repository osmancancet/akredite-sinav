// Ekip kanıt alışverişinin veri dönüşümleri (saf fonksiyonlar; şifreleme exchange.ts'te).

import type { AccreditationWorkspace, ActiveFramework, EvidenceRequest, IncomingRequest, RequestItem } from "./types";
import { criterionEvidence, recKey } from "./progress";
import { sealRequestFile, type RequestFile, type SubmissionPayload } from "./exchange";

/** Talepte gönderilecek kalemler: yalnızca kamuya açık ölçüt metni (başlık, ölçüt, dayanak, kaynak) */
export function requestItemsFor(ws: AccreditationWorkspace, fw: ActiveFramework, evidenceIds: string[]): RequestItem[] {
  const out: RequestItem[] = [];
  for (const c of fw.snapshot.criteria) {
    for (const e of criterionEvidence(ws, fw, c)) {
      if (!evidenceIds.includes(e.id)) continue;
      out.push({
        evidenceId: e.id,
        title: e.title,
        criterionId: c.id,
        criterionTitle: c.title,
        ...(e.sub ? { sub: e.sub } : {}),
        ...(e.basis ? { basis: e.basis } : {}),
        ...(e.source ? { source: e.source } : {}),
      });
    }
  }
  return out;
}

/** Bir kişiye atanmış, tamamlanmamış kanıtlar (talep önerisi) */
export function openItemsOf(ws: AccreditationWorkspace, fw: ActiveFramework, owner: string): string[] {
  return fw.snapshot.criteria.flatMap((c) =>
    criterionEvidence(ws, fw, c)
      .filter((e) => {
        const r = ws.records[recKey(fw.slug, e.id)];
        return r?.owner === owner && r.status !== "ready" && r.status !== "na";
      })
      .map((e) => e.id),
  );
}

/** Talep dosyasını kurar; doğrulama kodu içeriğin tamamını kapsar */
export function buildRequestFile(
  req: Pick<EvidenceRequest, "id" | "createdAt" | "recipient" | "message" | "due" | "items" | "publicJwk">,
  fw: ActiveFramework,
  ws: AccreditationWorkspace,
  meta: { coordinator: string; institution: string },
): Promise<RequestFile> {
  return sealRequestFile({
    id: req.id,
    createdAt: req.createdAt,
    coordinator: meta.coordinator,
    institution: meta.institution,
    frameworkCode: fw.snapshot.code,
    ...(fw.snapshot.name ? { frameworkName: fw.snapshot.name } : {}),
    scopeLabel: fw.scopeLabel,
    recipient: req.recipient,
    ...(req.message ? { message: req.message } : {}),
    ...(req.due ? { due: req.due } : {}),
    publicJwk: req.publicJwk,
    items: requestItemsFor(ws, fw, req.items),
  });
}

export function incomingFromFile(f: RequestFile, receivedAt: string): IncomingRequest {
  return {
    id: f.id,
    receivedAt,
    coordinator: f.coordinator,
    institution: f.institution,
    frameworkCode: f.frameworkCode,
    ...(f.frameworkName ? { frameworkName: f.frameworkName } : {}),
    scopeLabel: f.scopeLabel,
    recipient: f.recipient,
    ...(f.message ? { message: f.message } : {}),
    ...(f.due ? { due: f.due } : {}),
    publicJwk: f.publicJwk,
    fingerprint: f.fingerprint,
    items: f.items,
    answers: {},
    submissions: [],
  };
}

/**
 * Teslimden içe aktarılacak kalemler: yalnızca talepte istenen kanıtlar kabul edilir
 * (teslim eden, talep dışındaki bir kanıta dosya ekleyemez).
 */
export function acceptedItems(req: Pick<EvidenceRequest, "items">, payload: SubmissionPayload, existing?: Set<string>): SubmissionPayload["items"] {
  const seen = new Set<string>();
  return payload.items.filter((it) => {
    if (!req.items.includes(it.evidenceId) || (existing && !existing.has(it.evidenceId)) || seen.has(it.evidenceId)) return false;
    seen.add(it.evidenceId);
    return it.files.length > 0 || (typeof it.note === "string" && !!it.note.trim());
  });
}

/** Bir talebin cevabını (miras alınmış nesne özelliklerine düşmeden) okur */
export function answerOf(req: IncomingRequest, evidenceId: string): IncomingRequest["answers"][string] | undefined {
  return Object.prototype.hasOwnProperty.call(req.answers, evidenceId) ? req.answers[evidenceId] : undefined;
}

/** Çerçevede hâlâ var olan kanıt kimlikleri (silinmiş özel kanıtlara içe aktarma yapılmaz) */
export function existingEvidenceIds(ws: AccreditationWorkspace, fw: ActiveFramework): Set<string> {
  return new Set(fw.snapshot.criteria.flatMap((c) => criterionEvidence(ws, fw, c).map((e) => e.id)));
}

export const fileSafe = (s: string) =>
  s
    .replace(/[ğĞüÜşŞıİöÖçÇ]/g, (ch) => ({ ğ: "g", Ğ: "G", ü: "u", Ü: "U", ş: "s", Ş: "S", ı: "i", İ: "I", ö: "o", Ö: "O", ç: "c", Ç: "C" })[ch] ?? ch)
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
