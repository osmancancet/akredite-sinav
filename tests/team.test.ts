import { describe, expect, it } from "vitest";
import { emptyWorkspace, type ActiveFramework, type EvidenceRequest } from "@/lib/accreditation/types";
import { acceptedItems, answerOf, buildRequestFile, existingEvidenceIds, incomingFromFile, openItemsOf, requestItemsFor } from "@/lib/accreditation/team";
import { createRequestKeys, parseRequestFile } from "@/lib/accreditation/exchange";

const fw: ActiveFramework = {
  slug: "medek",
  activatedAt: "2026-10-23T00:00:00Z",
  scopeLabel: "Bilgisayar Programcılığı",
  snapshot: {
    code: "MEDEK",
    slug: "medek",
    kind: "program",
    status: "verified",
    accessed: "2026-10-23",
    criteria: [
      {
        id: "Ölçüt 1",
        title: "Öğrenciler",
        sub: [{ id: "1.1", text: "…", source: "https://x" }],
        evidence: [
          { id: "e1", title: "Tablo 1.1", kind: "explicit", sub: "1.1", basis: "ÖDR 1.1.2", source: "https://x (s. 4)" },
          { id: "e2", title: "Tablo 1.2", kind: "explicit", source: "https://x" },
        ],
      },
    ],
  },
};

describe("ekip talepleri", () => {
  it("kişiye atanmış açık kalemler önerilir; hazır olanlar hariç", () => {
    const ws = { ...emptyWorkspace(), records: { "medek::e1": { status: "missing" as const, owner: "Ayşe", attachments: [], updatedAt: "" }, "medek::e2": { status: "ready" as const, owner: "Ayşe", attachments: [], updatedAt: "" } } };
    expect(openItemsOf(ws, fw, "Ayşe")).toEqual(["e1"]);
  });

  it("talep dosyası yalnızca kamuya açık ölçüt bilgisini taşır ve doğrulanabilir", async () => {
    const ws = { ...emptyWorkspace(), custom: { medek: [{ id: "ozel_1", criterionId: "Ölçüt 1", title: "Anket" }] } };
    expect(requestItemsFor(ws, fw, ["e1", "ozel_1"]).map((i) => i.evidenceId)).toEqual(["e1", "ozel_1"]);
    const k = await createRequestKeys();
    const base: Pick<EvidenceRequest, "id" | "createdAt" | "recipient" | "items" | "publicJwk"> = { id: "t1", createdAt: "2026-10-23T00:00:00Z", recipient: "Ayşe", items: ["e1"], publicJwk: k.publicJwk };
    const file = await buildRequestFile(base, fw, ws, { coordinator: "Kalite Komisyonu", institution: "Örnek Üniversitesi" });
    const text = JSON.stringify(file);
    expect(text).not.toContain('"d"');
    expect(text).not.toContain(k.privateJwk.d!);
    const parsed = await parseRequestFile(text);
    const inc = incomingFromFile(parsed, "2026-10-24T00:00:00Z");
    expect(inc.items[0]).toMatchObject({ evidenceId: "e1", criterionTitle: "Öğrenciler", sub: "1.1", basis: "ÖDR 1.1.2" });
    expect(inc.answers).toEqual({});
  });

  it("teslimde talep dışı kalemler ve boş kalemler kabul edilmez", () => {
    const items = acceptedItems(
      { items: ["e1"] },
      {
        submissionId: "s",
        requestId: "t1",
        respondent: "Ayşe",
        submittedAt: "",
        items: [
          { evidenceId: "e1", files: [{ name: "a", mime: "", size: 1, sha256: "", addedAt: "", data: "" }] },
          { evidenceId: "e2", files: [{ name: "b", mime: "", size: 1, sha256: "", addedAt: "", data: "" }] },
          { evidenceId: "e1", note: "  ", files: [] },
        ],
      },
    );
    expect(items.map((i) => i.evidenceId)).toEqual(["e1"]);
  });

  it("silinmiş kanıta ve aynı kaleme iki kez içe aktarma yapılmaz", () => {
    const ws = emptyWorkspace();
    const existing = existingEvidenceIds(ws, fw);
    expect(existing.has("e1") && !existing.has("ozel_silindi")).toBe(true);
    const f = { name: "a", mime: "", size: 1, sha256: "", addedAt: "", data: "" };
    const items = acceptedItems({ items: ["e1", "ozel_silindi"] }, { submissionId: "s", requestId: "t1", respondent: "", submittedAt: "", items: [{ evidenceId: "ozel_silindi", files: [f] }, { evidenceId: "e1", files: [f] }, { evidenceId: "e1", files: [f] }] }, existing);
    expect(items.map((i) => i.evidenceId)).toEqual(["e1"]);
  });

  it("cevap okuma miras alınmış nesne özelliklerine düşmez", () => {
    const inc = { answers: {} } as Parameters<typeof answerOf>[0];
    expect(answerOf(inc, "toString")).toBeUndefined();
    expect(answerOf(inc, "constructor")).toBeUndefined();
  });
});
