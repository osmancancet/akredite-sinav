// Saldırgan rolü: talep dosyasını ele geçirmiş biri geçerli anahtarla kötü niyetli paketler üretir.
import { chromium } from "playwright-core";
import fs from "node:fs";
const ex = await import(new URL("../../src/lib/accreditation/exchange.ts", import.meta.url).href);

const BASE = "http://127.0.0.1:4173/app";
const DL = "/tmp/akr-e2e-dl/adv";
fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", headless: true });
const results = [];
const check = (l, ok, x = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${l}${x ? " — " + x : ""}`); };
const errors = [];
async function profile(name) {
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE);
  await page.getByText("Demo veriyle keşfet").click();
  await page.getByText("dönem iş akışı").first().waitFor();
  const blobCount = () => page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("AkrediteSinavVault"); r.onsuccess = () => res(r.result); });
    return await new Promise((res) => { const t = db.transaction("blobs").objectStore("blobs").count(); t.onsuccess = () => res(t.result); });
  });
  const toast = async (re) => { await page.getByText(re).first().waitFor({ timeout: 20000 }); return true; };
  return { ctx, page, blobCount, toast };
}
const go = async (page, h) => { await page.evaluate((x) => (location.hash = x), h); await page.waitForTimeout(500); };
const write = (n, o) => { const p = `${DL}/${n}`; fs.writeFileSync(p, typeof o === "string" ? o : JSON.stringify(o)); return p; };
const sha = async (u8) => ex.sha256Hex(u8);

// ---- A: gerçek talep ----
const A = await profile("A");
await go(A.page, "/akreditasyon");
await A.page.getByRole("tab", { name: /^Ekip/ }).click();
await A.page.getByRole("button", { name: "Yeni talep", exact: true }).click();
await A.page.getByPlaceholder("ör. Öğr. Gör. Burak ŞAHİN").fill("Hedef Kişi");
const boxes = A.page.getByRole("dialog").locator("input[type=checkbox]");
await boxes.nth(0).check();
await boxes.nth(1).check();
const [d] = await Promise.all([A.page.waitForEvent("download"), A.page.getByRole("button", { name: /kalemle talep dosyası indir/ }).click()]);
const reqPath = `${DL}/req.akredite-talep`;
await d.saveAs(reqPath);
await A.page.getByRole("button", { name: "Tamam", exact: true }).click();
const req = JSON.parse(fs.readFileSync(reqPath, "utf8"));

// ---- B: kötü niyetli talep dosyaları (geçerli doğrulama koduyla) ----
const B = await profile("B");
await go(B.page, "/akreditasyon");
await B.page.getByRole("tab", { name: /Bana gelen talepler/ }).click();
const keys = await ex.createRequestKeys();
const baseReq = { id: "kotu_1", createdAt: "2026-10-23T00:00:00Z", coordinator: "X", institution: "Y", frameworkCode: "MEDEK", scopeLabel: "Z", recipient: "B", publicJwk: keys.publicJwk };
const evil = [
  ["proto", await ex.sealRequestFile({ ...baseReq, items: [{ evidenceId: "__proto__", title: "t", criterionId: "c", criterionTitle: "c" }] })],
  ["toString", await ex.sealRequestFile({ ...baseReq, items: [{ evidenceId: "toString", title: "t", criterionId: "c", criterionTitle: "c" }] })],
  ["badtype", await ex.sealRequestFile({ ...baseReq, items: [{ evidenceId: "e", title: "t", criterionId: "c", criterionTitle: "c", source: 5 }] })],
  ["objcoord", { ...(await ex.sealRequestFile(baseReq.items ? baseReq : { ...baseReq, items: [{ evidenceId: "e", title: "t", criterionId: "c", criterionTitle: "c" }] })), coordinator: { a: 1 } }],
  ["dup", await ex.sealRequestFile({ ...baseReq, items: [{ evidenceId: "e", title: "t", criterionId: "c", criterionTitle: "c" }, { evidenceId: "e", title: "t2", criterionId: "c", criterionTitle: "c" }] })],
];
for (const [n, f] of evil) {
  await B.page.locator('input[type=file][accept^=".akredite-talep"]').setInputFiles(write(`${n}.akredite-talep`, f));
  check(`malicious request rejected: ${n}`, await B.toast(/Talep dosyası açılamadı/));
}
check("inbox still empty and page alive", (await B.page.getByText("Henüz açılmış talep yok.").count()) > 0);
const weird = await ex.sealRequestFile({ ...baseReq, id: "garip_1", items: [{ evidenceId: "e1", title: "Garip kaynak", criterionId: "c", criterionTitle: "c", source: "https://[x" }] });
await B.page.locator('input[type=file][accept^=".akredite-talep"]').setInputFiles(write("weird.akredite-talep", weird));
await B.toast(/talebi açıldı/);
const guard = await B.page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
check("unsaved change guards page exit", guard === true);
await B.page.waitForTimeout(900);
const guard2 = await B.page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
check("no exit prompt once saved", guard2 === false);
check("invalid URL source renders without crash", (await B.page.getByText("Garip kaynak").count()) > 0 && (await B.page.getByText("Kaynak: https://[x").count()) > 0);
await B.page.reload();
await B.page.getByText("dönem iş akışı").first().waitFor().catch(() => {});
await go(B.page, "/akreditasyon");
await B.page.getByRole("tab", { name: /Bana gelen talepler/ }).click();
check("survives reload", (await B.page.getByText("Garip kaynak").count()) > 0);
await B.page.getByRole("button", { name: /Talebi sil/ }).click();
await B.page.getByRole("button", { name: "Sil", exact: true }).click();
await B.page.waitForTimeout(400);
check("weird request removable", (await B.page.getByText("Garip kaynak").count()) === 0);

// ---- A: kötü niyetli teslimler (talep dosyasındaki geçerli anahtarla şifreli) ----
await go(A.page, "/akreditasyon");
await A.page.getByRole("tab", { name: /^Ekip/ }).click();
const small = new Uint8Array(1000).map((_, i) => i & 255);
const big = new Uint8Array(51 * 1024 * 1024);
const fileOf = async (name, bytes) => ({ name, mime: "application/pdf", size: bytes.length, sha256: await sha(bytes), addedAt: "2026-10-24T09:00:00Z", data: ex.toBase64(bytes) });
const [e1, e2] = req.items.map((i) => i.evidenceId);
const upload = async (name, payload) => {
  const sealed = await ex.sealSubmission(req, payload);
  await A.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(write(name, sealed));
};
const before = await A.blobCount();
await upload("rollback.akredite-teslim", { submissionId: "s_big", requestId: req.id, respondent: "Saldırgan", submittedAt: "2026-10-24T10:00:00Z", items: [{ evidenceId: e1, files: [await fileOf("kucuk.pdf", small)] }, { evidenceId: e2, files: [await fileOf("dev.pdf", big)] }] });
await A.page.getByText(/Saldırgan — teslim paketi/).waitFor({ timeout: 60000 });
check("preview marks submitter as declared", (await A.page.getByText(/\(beyan\)/).count()) > 0);
await A.page.getByRole("button", { name: "Kanıtlara ekle", exact: true }).click();
check("oversized import fails cleanly", await A.toast(/Hiçbir kanıt değiştirilmedi/));
await A.page.getByRole("button", { name: "Vazgeç", exact: true }).click();
await A.page.waitForTimeout(500);
check("rollback leaves no orphan blobs", (await A.blobCount()) === before, `before=${before} after=${await A.blobCount()}`);
check("request still waiting after failed import", (await A.page.getByText("Bekleniyor").count()) > 0);

await upload("badnote.akredite-teslim", { submissionId: "s_note", requestId: req.id, respondent: "S", submittedAt: "2026-10-24T10:00:00Z", items: [{ evidenceId: e1, note: 5, files: [] }] });
check("malformed payload rejected (no crash)", await A.toast(/içeriği bozuk/));

await upload("inject.akredite-teslim", { submissionId: "s_ok", requestId: req.id, respondent: "Saldırgan", submittedAt: "2026-10-24T10:00:00Z", items: [{ evidenceId: e1, files: [await fileOf("kucuk.pdf", small)] }, { evidenceId: "olcut-2-1", files: [await fileOf("sokulan.pdf", small)] }] });
await A.page.getByText(/Saldırgan — teslim paketi/).waitFor();
check("injected item flagged in preview", (await A.page.getByText(/1 kalem alınmayacak/).count()) > 0);
await A.page.getByRole("button", { name: "Kanıtlara ekle", exact: true }).click();
check("only requested item imported", await A.toast(/Saldırgan: 1 dosya 1 kanıta eklendi/));
check("one blob added", (await A.blobCount()) === before + 1, `after=${await A.blobCount()}`);

check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(`\n${results.filter(Boolean).length}/${results.length} PASS`);
await b.close();
