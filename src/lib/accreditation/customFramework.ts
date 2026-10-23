import type { Framework, FwCriterion } from "./types";
import { safeFileName, todayIso, uid } from "@/lib/utils";

/**
 * Kurumun kendi tanımladığı ölçüt seti (katalogda olmayan kuruluşlar, iç denetim, ISO vb.).
 * Biçim: her ölçüt bir satır ("1. Öğrenciler" ya da "Öğrenciler"); altındaki "-", "•" veya "*"
 * ile başlayan satırlar o ölçütün kanıt kalemleridir.
 */
export function parseCustomCriteria(text: string): FwCriterion[] {
  const criteria: FwCriterion[] = [];
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const bullet = line.match(/^[-•*–]\s*(.+)$/);
    if (bullet) {
      const c = criteria[criteria.length - 1];
      if (!c) return;
      c.evidence = c.evidence ?? [];
      c.evidence.push({ id: `${c.id}-${c.evidence.length + 1}`, title: bullet[1].trim(), kind: "derived", basis: "Kurum tarafından tanımlandı", source: "" });
      return;
    }
    const numbered = line.match(/^(\d+(?:\.\d+)*)[.)]?\s+(.+)$/);
    const id = numbered ? numbered[1] : String(criteria.length + 1);
    criteria.push({ id, title: (numbered ? numbered[2] : line).trim(), evidence: [] });
  });
  return criteria;
}

export function buildCustomFramework(code: string, name: string, text: string): Framework {
  const cleanCode = code.trim() || "ÖZEL";
  return {
    code: cleanCode,
    slug: `ozel-${safeFileName(cleanCode).toLowerCase()}-${uid("").slice(-6)}`,
    name: name.trim() || cleanCode,
    kind: "program",
    status: "custom",
    accessed: todayIso(),
    notes: "Bu ölçüt seti kurum tarafından tanımlanmıştır; bir akreditasyon kuruluşunun resmi belgesinden alınmamıştır.",
    criteria: parseCustomCriteria(text),
  };
}
