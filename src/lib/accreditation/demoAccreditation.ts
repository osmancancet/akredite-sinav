import type { VaultData } from "@/lib/types";
import { emptyWorkspace, type EvidenceRecord, type Framework } from "./types";
import { recKey, matKey } from "./progress";
import { toIsoDate } from "@/lib/utils";

/**
 * Demo kasası için örnek MEDEK çalışma alanı: gerçek MEDEK v1.1 ölçütleri üzerinde birkaç kanıtın
 * durumu, sorumlusu ve öz değerlendirme düzeyi örnek olarak işaretlenir (dosya eklenmez).
 * Ölçüt dosyası alınamazsa (ilk açılış çevrimdışı) kasa olduğu gibi döner.
 */
export async function withDemoAccreditation(data: VaultData): Promise<VaultData> {
  let fw: Framework;
  try {
    const res = await fetch("/frameworks/medek.json");
    if (!res.ok) return data;
    fw = await res.json();
  } catch {
    return data;
  }
  const slug = fw.slug;
  const now = new Date();
  const day = (offset: number) => toIsoDate(new Date(now.getTime() + offset * 86400000));
  const stamp = now.toISOString();
  const records: Record<string, EvidenceRecord> = {};
  const set = (criterionIndex: number, evidenceIndex: number, r: Omit<EvidenceRecord, "attachments" | "updatedAt">) => {
    const e = fw.criteria[criterionIndex]?.evidence?.[evidenceIndex];
    if (e) records[recKey(slug, e.id)] = { ...r, attachments: [], updatedAt: stamp };
  };
  set(0, 0, { status: "ready", owner: "Bölüm Başkanı", note: "Son iki yılın YKS yerleştirme verileri ÖDR Tablo 1.1 biçiminde hazırlandı." });
  set(0, 1, { status: "ready", owner: "Bölüm Sekreterliği" });
  set(0, 2, { status: "in-progress", owner: "Bölüm Sekreterliği", due: day(10) });
  set(0, 4, { status: "in-progress", owner: "Program Koordinatörü", due: day(-3) });
  set(2, 0, { status: "ready", owner: "Kalite Temsilcisi", note: "Program çıktıları MEDEK PÇ bileşenleriyle eşleştirildi." });
  set(2, 2, { status: "in-progress", owner: "Program Koordinatörü", due: day(21) });
  set(3, 3, { status: "ready", owner: "Kalite Temsilcisi", note: "ÖÇ–PÇ matrisi uygulamadaki ders kataloğundan üretildi." });
  set(4, 0, { status: "in-progress", owner: "Program Koordinatörü", due: day(14) });

  const maturity: Record<string, number> = {};
  const levels: [string, number][] = [
    ["1.1", 3],
    ["1.2", 3],
    ["1.3", 2],
    ["3.1.1", 4],
    ["3.1.2", 3],
  ];
  levels.forEach(([id, v]) => (maturity[matKey(slug, id)] = v));

  return {
    ...data,
    accreditation: {
      ...emptyWorkspace(),
      active: [{ slug, activatedAt: stamp, scopeLabel: data.institution.program || "Önlisans programı", snapshot: fw }],
      current: slug,
      records,
      custom: {},
      maturity,
    },
  };
}
