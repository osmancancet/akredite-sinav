import { describe, expect, it } from "vitest";
import {
  createRequestKeys,
  fingerprintOf,
  sealRequestFile,
  fromBase64,
  openSubmission,
  parseRequestFile,
  parseSubmissionFile,
  sealSubmission,
  sha256Hex,
  toBase64,
  type RequestFile,
  type SubmissionPayload,
} from "@/lib/accreditation/exchange";

async function makeRequest(): Promise<{ file: RequestFile; privateJwk: JsonWebKey }> {
  const k = await createRequestKeys();
  const file: RequestFile = await sealRequestFile({
    id: "talep_1",
    createdAt: "2026-10-23T10:00:00Z",
    coordinator: "Kalite Komisyonu",
    institution: "Örnek Üniversitesi",
    frameworkCode: "MEDEK",
    scopeLabel: "Bilgisayar Programcılığı",
    recipient: "Dr. Öğr. Üyesi Ayşe Yılmaz",
    due: "2026-11-01",
    publicJwk: k.publicJwk,
    items: [{ evidenceId: "olcut-1-1", title: "Tablo 1.1", criterionId: "Ölçüt 1", criterionTitle: "Öğrenciler" }],
  });
  return { file, privateJwk: k.privateJwk };
}

async function payloadWith(bytes: Uint8Array<ArrayBuffer>, requestId = "talep_1"): Promise<SubmissionPayload> {
  return {
    submissionId: "teslim_1",
    requestId,
    respondent: "Ayşe Yılmaz",
    submittedAt: "2026-10-24T10:00:00Z",
    items: [
      {
        evidenceId: "olcut-1-1",
        note: "2024-2025 verisi",
        files: [{ name: "tablo-1-1.pdf", mime: "application/pdf", size: bytes.length, sha256: await sha256Hex(bytes), addedAt: "2026-10-24T09:00:00Z", data: toBase64(bytes) }],
      },
    ],
  };
}

describe("kanıt alışverişi", () => {
  it("base64 gidiş-dönüş büyük veride de doğru", () => {
    const b = new Uint8Array(200_000).map((_, i) => (i * 31 + 7) & 255);
    expect(fromBase64(toBase64(b))).toEqual(b);
  });

  it("doğrulama kodu biçimi, kararlılığı ve içeriğe bağlılığı", async () => {
    const k = await createRequestKeys();
    const fp = await fingerprintOf(k.publicJwk, "a");
    expect(fp).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
    expect(await fingerprintOf(k.publicJwk, "a")).toBe(fp);
    expect(await fingerprintOf(k.publicJwk, "b")).not.toBe(fp);
    expect(k.publicJwk).not.toHaveProperty("d");
  });

  it("talep içeriği (başlık, mesaj, gönderen) değiştirilirse reddedilir", async () => {
    const { file } = await makeRequest();
    for (const mod of [
      { ...file, message: "Lütfen kimlik belgenizi de ekleyin" },
      { ...file, coordinator: "Sahte Komisyon" },
      { ...file, items: [{ ...file.items[0], title: "Banka bilgileriniz" }] },
      { ...file, due: "2027-01-01" },
    ]) {
      await expect(parseRequestFile(JSON.stringify(mod))).rejects.toThrow(/doğrulama kodu içerikle uyuşmuyor/);
    }
  });

  it("bozuk alan türleri, ayrılmış ve yinelenen kimlikler reddedilir", async () => {
    const { file } = await makeRequest();
    for (const mod of [
      { ...file, items: [{ ...file.items[0], evidenceId: "__proto__" }] },
      { ...file, items: [{ ...file.items[0], evidenceId: "toString" }] },
      { ...file, items: [file.items[0], file.items[0]] },
      { ...file, items: [{ ...file.items[0], source: 5 }] },
      { ...file, coordinator: { x: 1 } },
      { ...file, due: "yarın" },
      { ...file, items: "x" },
      null,
    ]) {
      await expect(parseRequestFile(JSON.stringify(mod))).rejects.toThrow();
    }
  });

  it("talep dosyası doğrulanır; anahtarı değiştirilmiş talep reddedilir", async () => {
    const { file } = await makeRequest();
    await expect(parseRequestFile(JSON.stringify(file))).resolves.toMatchObject({ id: "talep_1" });
    const other = await createRequestKeys();
    await expect(parseRequestFile(JSON.stringify({ ...file, publicJwk: other.publicJwk }))).rejects.toThrow(/içerikle uyuşmuyor/);
    await expect(parseRequestFile("{bozuk")).rejects.toThrow(/okunamadı/);
    await expect(parseRequestFile(JSON.stringify({ ...file, items: [] }))).rejects.toThrow(/eksik/);
  });

  it("teslim paketi yalnızca koordinatörün anahtarıyla açılır ve içerik birebir döner", async () => {
    const { file, privateJwk } = await makeRequest();
    const bytes = crypto.getRandomValues(new Uint8Array(50_000));
    const sealed = await sealSubmission(file, await payloadWith(bytes));
    const text = JSON.stringify(sealed);
    expect(text).not.toContain("tablo-1-1.pdf");
    expect(text).not.toContain("Ayşe");
    const opened = await openSubmission(parseSubmissionFile(text), { id: file.id, fingerprint: file.fingerprint, privateJwk });
    expect(opened.respondent).toBe("Ayşe Yılmaz");
    expect(fromBase64(opened.items[0].files[0].data)).toEqual(bytes);
  });

  it("başka koordinatörün anahtarıyla açılamaz", async () => {
    const { file } = await makeRequest();
    const sealed = await sealSubmission(file, await payloadWith(new Uint8Array([1, 2, 3])));
    const intruder = await createRequestKeys();
    await expect(openSubmission(sealed, { id: file.id, fingerprint: file.fingerprint, privateJwk: intruder.privateJwk })).rejects.toThrow(/açılamadı/);
  });

  it("bozulmuş şifreli metin, değiştirilmiş talep kimliği ve parmak izi reddedilir", async () => {
    const { file, privateJwk } = await makeRequest();
    const sealed = await sealSubmission(file, await payloadWith(new Uint8Array([9, 9, 9])));
    const ct = fromBase64(sealed.ciphertext);
    ct[10] ^= 0xff;
    const req = { id: file.id, fingerprint: file.fingerprint, privateJwk };
    await expect(openSubmission({ ...sealed, ciphertext: toBase64(ct) }, req)).rejects.toThrow(/açılamadı/);
    await expect(openSubmission({ ...sealed, requestId: "talep_2" }, req)).rejects.toThrow(/başka bir talebe/);
    await expect(openSubmission({ ...sealed, requestId: "talep_2" }, { ...req, id: "talep_2" })).rejects.toThrow(/açılamadı/);
    await expect(openSubmission({ ...sealed, fingerprint: "0000-0000-0000-0000" }, req)).rejects.toThrow(/Doğrulama kodu/);
  });

  it("şifreleme öncesi bozulmuş dosya özeti yakalanır", async () => {
    const { file, privateJwk } = await makeRequest();
    const p = await payloadWith(new Uint8Array([1, 2, 3]));
    p.items[0].files[0].sha256 = "0".repeat(64);
    const sealed = await sealSubmission(file, p);
    await expect(openSubmission(sealed, { id: file.id, fingerprint: file.fingerprint, privateJwk })).rejects.toThrow(/bütünlük/);
  });

  it("yanlış dosya türleri anlaşılır hata verir", async () => {
    const { file } = await makeRequest();
    expect(() => parseSubmissionFile(JSON.stringify(file))).toThrow(/talep dosyası/);
    const sealed = await sealSubmission(file, await payloadWith(new Uint8Array([1])));
    await expect(parseRequestFile(JSON.stringify(sealed))).rejects.toThrow(/teslim paketi/);
  });

  it("aynı içerik iki kez şifrelendiğinde farklı paket üretir (yeni IV ve geçici anahtar)", async () => {
    const { file } = await makeRequest();
    const p = await payloadWith(new Uint8Array([4, 5, 6]));
    const a = await sealSubmission(file, p);
    const b = await sealSubmission(file, p);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.epk.x).not.toBe(b.epk.x);
  });
});

describe("çözülen yük denetimi", () => {
  it("biçimi bozuk yük (geçerli anahtarla şifrelenmiş olsa bile) reddedilir", async () => {
    const { file, privateJwk } = await makeRequest();
    const req = { id: file.id, fingerprint: file.fingerprint, privateJwk };
    const good = await payloadWith(new Uint8Array([1, 2]));
    for (const bad of [
      { ...good, items: [{ ...good.items[0], note: 5 }] },
      { ...good, respondent: { a: 1 } },
      { ...good, items: [{ ...good.items[0], evidenceId: "__proto__" }] },
      { ...good, items: [{ ...good.items[0], files: [{ ...good.items[0].files[0], name: 7 }] }] },
      { ...good, items: "x" },
    ]) {
      const sealed = await sealSubmission(file, bad as unknown as SubmissionPayload);
      await expect(openSubmission(sealed, req)).rejects.toThrow(/içeriği bozuk/);
    }
  });
});
