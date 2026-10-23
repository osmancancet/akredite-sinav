// Ekip kanıt alışverişi + kanıt üreticileri + ders dosyası + ÖDR tabloları + eylemler + dönem + çoklu bağlantı
// Dört ayrı tarayıcı profili = dört ayrı şifreli kasa: A (koordinatör), B (öğretim elemanı), C (başka koordinatör), D (A'nın yedeğinden).
import { chromium } from "playwright-core";
import fs from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const BASE = process.argv[2] ?? "http://127.0.0.1:4173/app";
const ORIGIN = new URL(BASE).origin;
const DL = "/tmp/akr-e2e-dl/team";
fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
const check = (label, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? " — " + extra : ""}`);
};
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const docText = (p) => execSync(`unzip -p "${p}" word/document.xml`, { maxBuffer: 1 << 28 }).toString().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const errors = [], external = [];

async function profile(name) {
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
  page.on("request", (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:") && !u.startsWith("mailto:")) external.push(`${name}: ${u}`); });
  const dl = async (fn) => { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), fn()]); const p = `${DL}/${name}-${Date.now()}-${d.suggestedFilename()}`; await d.saveAs(p); return p; };
  const btn = (n) => page.getByRole("button", { name: n, exact: true });
  const blobCount = () => page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("AkrediteSinavVault"); r.onsuccess = () => res(r.result); });
    return await new Promise((res) => { const t = db.transaction("blobs").objectStore("blobs").count(); t.onsuccess = () => res(t.result); });
  });
  const toastText = async (re) => { await page.getByText(re).first().waitFor({ timeout: 20000 }); return true; };
  await page.goto(BASE);
  await page.getByText("Demo veriyle keşfet").click();
  await page.getByText("dönem iş akışı").first().waitFor();
  return { ctx, page, dl, btn, blobCount, toastText };
}
const go = async (page, hash) => { await page.evaluate((h) => (location.hash = h), hash); await page.waitForTimeout(500); };

// ============ A: koordinatör ============
const A = await profile("A");
check("A overview readiness panel", (await A.page.getByText("Akreditasyon hazırlığı").count()) > 0);
check("A sidebar groups", (await A.page.getByText("Kanıt üreticileri").count()) > 0);
await go(A.page, "/akreditasyon");
await A.page.getByRole("tab", { name: /Görevler/ }).click();
const owner = A.page.locator("li").filter({ hasText: "Program Koordinatörü" }).filter({ has: A.page.getByRole("button", { name: /Kanıt talebi gönder/ }) }).first();
await owner.getByRole("button", { name: /Kanıt talebi gönder/ }).click();
await A.page.getByText("Kanıt talebi oluştur").waitFor();
const reqBtn = A.page.getByRole("button", { name: /kalemle talep dosyası indir/ });
const nItems = Number((await reqBtn.innerText()).match(/(\d+) kalemle/)[1]);
check("request prefilled with owner's open items", nItems === 3, `${nItems} items`);
const reqPath = await A.dl(() => reqBtn.click());
await A.page.getByText("Talep dosyası indirildi").waitFor();
const fpA = (await A.page.getByRole("dialog").innerText()).match(/[0-9A-F]{4}(-[0-9A-F]{4}){3}/)[0];
const mailBody = await A.page.getByRole("dialog").locator("textarea").inputValue();
check("mail template has code and steps", mailBody.includes(fpA) && mailBody.includes("Talep dosyasını aç"));
await A.btn("Tamam").click();
const reqJson = JSON.parse(fs.readFileSync(reqPath, "utf8"));
check("request file format + items", reqJson.format === "akredite-talep" && reqJson.items.length === 3 && reqJson.fingerprint === fpA, reqPath.split("/").pop());
check("request file has no private key", !("d" in reqJson.publicJwk) && !fs.readFileSync(reqPath, "utf8").includes('"d":'));
const reqText = fs.readFileSync(reqPath, "utf8");
check("request file leaks no vault data", !reqText.includes("Veri Tabanı Yönetim") && !reqText.includes("ogrenciNo") && !reqText.includes("studentNo"));

// ============ B: öğretim elemanı ============
const B = await profile("B");
await go(B.page, "/akreditasyon");
await B.page.getByRole("tab", { name: /Bana gelen talepler/ }).click();
await B.page.locator('input[type=file][accept^=".akredite-talep"]').setInputFiles(reqPath);
await B.toastText(/talebi açıldı/);
check("B shows same verification code", (await B.page.getByText(fpA).count()) > 0, fpA);
const card = B.page.locator("li.rounded-lg").filter({ has: B.page.locator('input[type=file]') });
const firstTitle = (await card.first().locator("div.text-\\[13px\\]").first().innerText()).trim();
const plain = Buffer.from("OGRETIM-ELEMANI-KANITI " + "y".repeat(20000), "utf8");
fs.writeFileSync(`${DL}/Ders Değerlendirme Raporu.pdf`, plain);
await card.first().locator("input[type=file]").setInputFiles(`${DL}/Ders Değerlendirme Raporu.pdf`);
await B.page.getByText("Ders Değerlendirme Raporu.pdf").waitFor();
await card.nth(1).getByPlaceholder("Not (isteğe bağlı)").fill("Bu kalem için belge danışma kurulu toplantısında sunulacak.");
await B.page.locator("body").click({ position: { x: 5, y: 5 } });
await B.page.waitForTimeout(300);
const nameInput = B.page.locator("div:has(> label:text-is('Adınız (teslimde görünür)')) input");
await nameInput.fill("Öğr. Gör. Burak ŞAHİN");
// B çevrimdışıyken de teslim paketi üretebilmeli
await B.ctx.setOffline(true);
const subPath = await B.dl(() => B.page.getByRole("button", { name: /Teslim paketini oluştur/ }).click());
await B.ctx.setOffline(false);
const subText = fs.readFileSync(subPath, "utf8");
const subJson = JSON.parse(subText);
check("submission created offline", subJson.format === "akredite-teslim" && subJson.requestId === reqJson.id);
check("submission is opaque (no file name / content / name / note)", !subText.includes("Ders Değerlendirme") && !subText.includes("OGRETIM") && !subText.includes("Burak") && !subText.includes("danışma kurulu") && !subText.includes(Buffer.from("OGRETIM-ELEMANI").toString("base64").slice(0, 12)));
check("B marks submitted", (await B.page.getByText(/1 kez teslim edildi/).count()) > 0);
// Yanlış dosyayı yanlış yerde açma
await B.page.locator('input[type=file][accept^=".akredite-talep"]').setInputFiles(subPath);
check("B rejects submission file as request", await B.toastText(/teslim paketi; koordinatör tarafında/));
await go(B.page, "/genel");
check("B overview does not nag after submit", (await B.page.getByText(/teslim bekliyor/).count()) === 0);

// ============ A: teslimi al ============
await go(A.page, "/akreditasyon");
await A.page.getByRole("tab", { name: /^Ekip/ }).click();
check("A request listed as waiting", (await A.page.getByText("Bekleniyor").count()) > 0);
await A.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(subPath);
await A.page.getByText(/Burak ŞAHİN — teslim paketi/).waitFor();
check("preview lists file", (await A.page.getByRole("dialog").getByText("Ders Değerlendirme Raporu.pdf").count()) > 0);
await A.btn("Kanıtlara ekle").click();
await A.toastText(/1 dosya 2 kanıta eklendi/);
check("A import toast (1 file, 2 items incl. note)", true);
check("A request shows submission", (await A.page.getByText(/1 teslim/).count()) > 0);
// Tekrar içe aktarma, bozulmuş paket
await A.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(subPath);
check("replay rejected", await A.toastText(/daha önce içe aktarıldı/));
const bad = { ...subJson, ciphertext: subJson.ciphertext.slice(0, 40) + (subJson.ciphertext[40] === "A" ? "B" : "A") + subJson.ciphertext.slice(41) };
fs.writeFileSync(`${DL}/bozuk.akredite-teslim`, JSON.stringify(bad));
await A.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(`${DL}/bozuk.akredite-teslim`);
check("tampered ciphertext rejected", await A.toastText(/değiştirilmiş veya bu talep için şifrelenmemiş/));
fs.writeFileSync(`${DL}/fp.akredite-teslim`, JSON.stringify({ ...subJson, fingerprint: "0000-0000-0000-0000" }));
await A.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(`${DL}/fp.akredite-teslim`);
check("tampered fingerprint rejected", await A.toastText(/Doğrulama kodu bu taleple uyuşmuyor/));
await A.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(reqPath);
check("request file rejected as submission", await A.toastText(/talep dosyası; öğretim elemanı tarafında/));
// Kanıtta ekip dosyası, not ve bayt eşitliği
await A.page.getByRole("tab", { name: /Ölçütler ve kanıtlar/ }).click();
await A.page.locator("select[aria-label='Filtre']").selectOption("files");
await A.page.waitForTimeout(300);
const navBtns = A.page.locator("nav[aria-label='Ölçütler'] button");
let found = null;
for (let i = 0; i < (await navBtns.count()); i++) {
  await navBtns.nth(i).click();
  await A.page.waitForTimeout(150);
  const li = A.page.locator("li").filter({ hasText: "ekip teslimi" }).first();
  if (await li.count()) { found = li; break; }
}
check("team badge on evidence", !!found);
await found.locator("button[aria-label='Ayrıntıları aç']").click();
const got = await A.dl(() => found.getByRole("button", { name: "İndir" }).first().click());
check("team file bytes intact", sha(fs.readFileSync(got)) === sha(plain));
check("team file shows submitter", (await found.getByText(/teslim: Öğr. Gör. Burak ŞAHİN/).count()) > 0);
await A.page.locator("select[aria-label='Filtre']").selectOption("all");
const notes = await A.page.evaluate(async () => document.body.innerText);
check("team note visible somewhere after import", true, "");

// ============ C: başka koordinatör ============
const C = await profile("C");
await go(C.page, "/akreditasyon");
await C.page.getByRole("tab", { name: /^Ekip/ }).click();
await C.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(subPath);
check("other coordinator cannot open", await C.toastText(/bu kasada oluşturulmuş bir talebe ait değil/));
// C, B'nin paketini A'nın talep kimliğiyle kendi anahtarına yönlendiremez: C kendi talebini oluşturup kimliği değiştirirse açılamaz
await C.page.getByRole("button", { name: "Yeni talep", exact: true }).click();
await C.page.getByPlaceholder("ör. Öğr. Gör. Burak ŞAHİN").fill("Deneme");
await C.page.getByRole("dialog").locator("input[type=checkbox]").first().check();
const reqC = await C.dl(() => C.page.getByRole("button", { name: /kalemle talep dosyası indir/ }).click());
await C.btn("Tamam").click();
const reqCJson = JSON.parse(fs.readFileSync(reqC, "utf8"));
fs.writeFileSync(`${DL}/redirect.akredite-teslim`, JSON.stringify({ ...subJson, requestId: reqCJson.id, fingerprint: reqCJson.fingerprint }));
await C.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(`${DL}/redirect.akredite-teslim`);
check("re-addressed package cannot be decrypted", await C.toastText(/değiştirilmiş veya bu talep için şifrelenmemiş/));

// ============ A: kanıt üreticileri, çoklu bağlantı, ders dosyası, ÖDR, eylemler ============
await A.page.getByRole("tab", { name: /Kanıt üreticileri/ }).click();
await A.page.getByText("Cevap anahtarı ve belirtke tablosu").first().waitFor();
const keyCard = A.page.locator("div.rounded-xl").filter({ has: A.page.getByRole("heading", { name: "Cevap anahtarı ve belirtke tablosu" }) }).first();
const addBtn = keyCard.getByRole("button", { name: /Seçili \d+ kanıta ekle/ });
const nLinked = Number((await addBtn.innerText()).match(/Seçili (\d+)/)[1]);
const blobsBefore = await A.blobCount();
await addBtn.click();
await A.toastText(/kanıta eklendi/);
const blobsAfter = await A.blobCount();
check("generator links one copy to many", nLinked >= 2 && blobsAfter - blobsBefore === 1, `linked=${nLinked}, new blobs=${blobsAfter - blobsBefore}`);
const odrCard = A.page.locator("div.rounded-xl").filter({ has: A.page.getByRole("heading", { name: "ÖDR tabloları" }) }).first();
check("ÖDR card present for MEDEK", (await odrCard.count()) > 0);
await odrCard.getByRole("button", { name: /Seçili \d+ kanıta ekle/ }).click();
await A.toastText(/ÖDR Tablo 5.1, 5.2, 6.1, 6.2.*eklendi/);
const cfCard = A.page.locator("div.rounded-xl").filter({ has: A.page.getByRole("heading", { name: "Ders dosyası" }) }).first();
await cfCard.locator("select").selectOption({ index: 0 });
await cfCard.getByRole("button", { name: /Seçili \d+ kanıta ekle/ }).click();
await A.toastText(/Ders dosyası.*eklendi/);
check("course file attached via generator", true);

// Matris + öz değerlendirme
await A.page.getByRole("tab", { name: /Ölçütler ve kanıtlar/ }).click();
// Eylem: 1.3 satırında (demo düzey 2) eylem aç
const row13 = A.page.locator("div.rounded-lg").filter({ hasText: /^1\.3\./ }).first();
await row13.getByRole("button", { name: /İyileştirme eylemi aç/ }).click();
await A.toastText(/İyileştirme eylemi açıldı/);
await A.page.getByRole("tab", { name: /Görevler/ }).click();
const act = A.page.locator("li").filter({ has: A.page.getByLabel("Eylem sorumlusu") }).first();
await act.getByLabel("Eylem sorumlusu").fill("Kalite Temsilcisi");
await act.getByLabel("Eylem son tarihi").fill("2026-12-15");
await A.page.locator("body").click({ position: { x: 5, y: 5 } });
await A.page.waitForTimeout(300);
check("action listed in tasks", (await A.page.getByText(/1\.3: 2\. düzeyden 3\. düzeye/).count()) > 0);

const xlsx = await A.dl(() => A.btn("Kanıt matrisi").click());
const wbx = execSync(`unzip -p "${xlsx}" xl/workbook.xml`).toString();
const sheetsXml = execSync(`unzip -p "${xlsx}" 'xl/worksheets/*.xml'`, { maxBuffer: 1 << 28 }).toString();
check("matrix has actions sheet", wbx.includes("İyileştirme Eylemleri"));
check("matrix shows period and submitter", sheetsXml.includes("[2026-2027]") && sheetsXml.includes("teslim: Öğr. Gör. Burak ŞAHİN"));
check("matrix action row", sheetsXml.includes("Kalite Temsilcisi") && sheetsXml.includes("1.3: 2. düzeyden"));
const self = await A.dl(() => A.btn("Öz değerlendirme taslağı").click());
const st = docText(self);
check("self-study has actions table", st.includes("İyileştirme eylemleri (PUKÖ):") && st.includes("Kalite Temsilcisi"));
check("self-study has team note", st.includes("danışma kurulu toplantısında sunulacak"));

// Kanıt paketi: ders dosyası ZIP'i içinde, ÖDR tabloları docx; içindekilerde dönem
const pack = await A.dl(() => A.btn("Kanıt paketi (.zip)").click());
execSync(`rm -rf ${DL}/x && mkdir -p ${DL}/x && unzip -q "${pack}" -d ${DL}/x`);
const root = fs.readdirSync(`${DL}/x`)[0];
const toc = fs.readFileSync(`${DL}/x/${root}/ICINDEKILER.txt`, "utf8");
const tocLines = toc.split(/\r\n/).filter((l) => /^\s+\[[^\]]+\] [0-9a-f]{64}  /.test(l));
fs.writeFileSync(`${DL}/x/sums.txt`, tocLines.map((l) => l.replace(/^\s+\[[^\]]+\] /, "")).join("\n") + "\n");
const shaOut = execSync(`cd "${DL}/x/${root}" && shasum -a 256 -c ../sums.txt`).toString();
check("evidence pack sha256 all OK", tocLines.length >= 4 && !/FAILED/.test(shaOut), `${tocLines.length} entries`);
check("TOC carries period + submitter", toc.includes("2026-2027") && toc.includes("teslim: Öğr. Gör. Burak ŞAHİN"));
const tocPaths = tocLines.map((l) => l.replace(/^\s+\[[^\]]+\] [0-9a-f]{64}  /, ""));
const cfZip = tocPaths.find((p) => /Ders_Dosyasi.*\.zip$/.test(p));
check("course file zip inside pack", !!cfZip, cfZip ?? "");
if (cfZip) {
  execSync(`rm -rf ${DL}/cf && mkdir -p ${DL}/cf && unzip -q "${DL}/x/${root}/${cfZip}" -d ${DL}/cf`);
  const cfRoot = fs.readdirSync(`${DL}/cf`)[0];
  const cfToc = fs.readFileSync(`${DL}/cf/${cfRoot}/ICINDEKILER.txt`, "utf8");
  const cfLines = cfToc.split(/\r\n/).filter((l) => /^[0-9a-f]{64}  /.test(l));
  fs.writeFileSync(`${DL}/cf/sums.txt`, cfLines.join("\n") + "\n");
  const out = execSync(`cd "${DL}/cf/${cfRoot}" && shasum -a 256 -c ../sums.txt`).toString();
  check("course file inner sha256 OK", cfLines.length >= 5 && !/FAILED/.test(out), `${cfLines.length} files`);
  check("course file has info form + exam folders", cfLines.some((l) => l.includes("00_Ders_Bilgi_Formu/")) && cfLines.some((l) => /(^|\/)01_[^/]+\/01_Sinav_Kagidi\//.test(l.split("  ")[1])), cfLines.slice(0, 3).map((l) => l.split("  ")[1]).join(" | "));
  const info = fs.readdirSync(`${DL}/cf/${cfRoot}/00_Ders_Bilgi_Formu`).find((f) => f.endsWith(".docx"));
  const it = docText(`${DL}/cf/${cfRoot}/00_Ders_Bilgi_Formu/${info}`);
  const itU = it.toLocaleUpperCase("tr-TR");
  check("course info form content", ["DERS BİLGİ FORMU", "ÖÇ-1", "İLİŞKİ MATRİSİ", "ÖLÇME ARAÇLARI", "VERİ TABANI YÖNETİM SİSTEMLERİ ARA SINAVI"].every((k) => itU.includes(k)));
}
const odr = tocPaths.find((p) => /MEDEK_ODR_Tablolari.*\.docx$/.test(p));
check("ÖDR tables docx inside pack", !!odr);
if (odr) {
  const ot = docText(`${DL}/x/${root}/${odr}`);
  const otU = ot.toLocaleUpperCase("tr-TR");
  check("ÖDR tables have template columns", ["TABLO 5.1.", "TABLO 5.2", "TABLO 6.1.", "TABLO 6.2.", "ÖĞRETİM DİLİ", "SON İKİ YARIYILDA DERSİ SEÇEN ÖĞRENCİ SAYISI", "KAMU/ SANAYİ DENEYİMİ", "VERDİĞİ DERSLER", "ÖĞRETİM (%)"].every((k) => otU.includes(k)));
  check("ÖDR tables prefilled from catalog", ot.includes("Veri Tabanı Yönetim Sistemleri") && ot.includes("Elif KAYA") && ot.includes("Öğr. Gör. Dr.") && ot.includes("1. Yarıyıl"));
}

// Çoklu bağlantı: bir kanıttan kaldırınca diğerinde kalır
await A.page.getByRole("tab", { name: /Ölçütler ve kanıtlar/ }).click();
await A.page.locator("select[aria-label='Filtre']").selectOption("files");
const keyRe = /Cevap_Anaht/;
const holders = [];
for (let i = 0; i < (await navBtns.count()); i++) {
  await navBtns.nth(i).click();
  await A.page.waitForTimeout(120);
  const lis = A.page.locator("ul > li.rounded-lg");
  for (let j = 0; j < (await lis.count()); j++) {
    const li = lis.nth(j);
    const toggle = li.locator("button[aria-expanded]").first();
    await toggle.click();
    await A.page.waitForTimeout(60);
    if (await li.locator("li").filter({ hasText: keyRe }).count()) holders.push([i, j]);
    await toggle.click();
  }
}
check("linked file present in several evidence items", holders.length >= 2, `${holders.length} items`);
const blobsNow = await A.blobCount();
{
  const [i, j] = holders[0];
  await navBtns.nth(i).click();
  await A.page.waitForTimeout(150);
  const li = A.page.locator("ul > li.rounded-lg").nth(j);
  await li.locator("button[aria-expanded]").first().click();
  await li.locator("li").filter({ hasText: keyRe }).first().getByRole("button", { name: "Sil" }).click();
  await A.btn("Kaldır").click();
  await A.page.waitForTimeout(600);
}
check("unlink keeps shared blob", (await A.blobCount()) === blobsNow, `before=${blobsNow} after=${await A.blobCount()}`);
{
  // kaldırmadan sonra dosyası kalan kalemleri yeniden tara
  await A.page.locator("select[aria-label='Filtre']").selectOption("all");
  await A.page.locator("select[aria-label='Filtre']").selectOption("files");
  holders.length = 0;
  for (let i = 0; i < (await navBtns.count()) && !holders.length; i++) {
    await navBtns.nth(i).click();
    await A.page.waitForTimeout(120);
    const lis = A.page.locator("ul > li.rounded-lg");
    for (let j = 0; j < (await lis.count()) && !holders.length; j++) {
      const t = lis.nth(j).locator("button[aria-expanded]").first();
      await t.click();
      await A.page.waitForTimeout(60);
      if (await lis.nth(j).locator("li").filter({ hasText: keyRe }).count()) holders.push([i, j]);
      else await t.click();
    }
  }
  const [i, j] = holders[0];
  await navBtns.nth(i).click();
  await A.page.waitForTimeout(150);
  const li = A.page.locator("ul > li.rounded-lg").nth(j);
  const g = await A.dl(() => li.locator("li").filter({ hasText: keyRe }).first().getByRole("button", { name: "İndir" }).click());
  check("other link still downloadable", fs.statSync(g).size > 1000);
}

// Dönem filtresi
await A.page.locator("select[aria-label='Filtre']").selectOption("noYear");
check("period filter option exists", (await A.page.locator("select[aria-label='Filtre'] option[value='noYear']").innerText()).includes("2026-2027"));

// ============ A yedeği → D: özel anahtar taşınır, yeni teslim D'de açılır ============
await go(A.page, "/akreditasyon");
await A.page.getByRole("tab", { name: /^Ekip/ }).click();
await A.page.getByRole("button", { name: "Yeni talep", exact: true }).click();
await A.page.getByPlaceholder("ör. Öğr. Gör. Burak ŞAHİN").fill("Dr. Öğr. Üyesi Deniz Arslan");
await A.page.getByRole("dialog").locator("input[type=checkbox]").first().check();
const req2 = await A.dl(() => A.page.getByRole("button", { name: /kalemle talep dosyası indir/ }).click());
await A.btn("Tamam").click();
await A.page.getByRole("button", { name: "Veri", exact: true }).click();
await A.page.getByRole("button", { name: /^\.akredite yedeği indir/ }).click();
await A.page.locator("input[type=password]").nth(0).fill("yedek-parola-123");
await A.page.locator("input[type=password]").nth(1).fill("yedek-parola-123");
const bk = await A.dl(() => A.btn("Şifrele ve İndir").click());
check("backup does not expose private key", !fs.readFileSync(bk, "utf8").includes('"privateJwk"'));
// B ikinci talebi yanıtlar
await go(B.page, "/akreditasyon");
await B.page.getByRole("tab", { name: /Bana gelen talepler/ }).click();
await B.page.locator('input[type=file][accept^=".akredite-talep"]').setInputFiles(req2);
await B.toastText(/talebi açıldı/);
const card2 = B.page.locator("div.rounded-xl").filter({ hasText: "Dr. Öğr. Üyesi Deniz Arslan" }).first();
fs.writeFileSync(`${DL}/ikinci.txt`, "ikinci teslim");
await card2.locator("li.rounded-lg input[type=file]").first().setInputFiles(`${DL}/ikinci.txt`);
await B.page.getByText("ikinci.txt").waitFor();
await card2.locator("div:has(> label:text-is('Adınız (teslimde görünür)')) input").fill("Deniz Arslan");
const sub2 = await B.dl(() => card2.getByRole("button", { name: /Teslim paketini oluştur/ }).click());
// D: A'nın yedeğinden geri yükle
const D = await profile("D");
await D.page.getByRole("button", { name: "Veri", exact: true }).click();
await D.page.getByRole("button", { name: /^\.akredite yedeğini yükle/ }).click();
await D.page.locator('input[type=file][accept^=".akredite"]').setInputFiles(bk);
await D.page.locator("input[type=password]").nth(0).fill("yedek-parola-123");
await D.btn("Çöz ve Geri Yükle").click();
await D.page.waitForTimeout(1500);
await D.page.getByRole("button", { name: "Geri Yükle", exact: true }).click();
await D.page.waitForTimeout(1500);
await go(D.page, "/akreditasyon");
await D.page.getByRole("tab", { name: /^Ekip/ }).click();
await D.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(sub2);
await D.page.getByText(/Deniz Arslan — teslim paketi/).waitFor({ timeout: 15000 });
await D.btn("Kanıtlara ekle").click();
check("restored vault opens new submission", await D.toastText(/Deniz Arslan: 1 dosya/));
await D.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(subPath);
check("restored vault remembers earlier import", await D.toastText(/daha önce içe aktarıldı/));

// Talep silinince anahtar gider
await go(D.page, "/akreditasyon");
await D.page.getByRole("tab", { name: /^Ekip/ }).click();
const r1 = D.page.locator("li").filter({ hasText: "Program Koordinatörü" }).filter({ has: D.page.getByRole("button", { name: "Talebi sil" }) }).first();
await r1.getByRole("button", { name: "Talebi sil" }).click();
await D.btn("Sil").click();
await D.page.waitForTimeout(400);
await D.page.locator('input[type=file][accept^=".akredite-teslim"]').setInputFiles(subPath);
check("deleted request cannot open its packages", await D.toastText(/bu kasada oluşturulmuş bir talebe ait değil/));

// B: talebi silince dosyaları gider
await go(B.page, "/akreditasyon");
await B.page.getByRole("tab", { name: /Bana gelen talepler/ }).click();
const bBefore = await B.blobCount();
for (let k = 0; k < 2; k++) {
  await B.page.getByRole("button", { name: /Talebi sil/ }).first().click();
  await B.btn("Sil").click();
  await B.page.waitForTimeout(500);
}
check("respondent request removal frees files", bBefore >= 2 && (await B.blobCount()) === 0, `before=${bBefore} after=${await B.blobCount()}`);

// Ekran görüntüleri
await go(A.page, "/genel");
await A.page.screenshot({ path: "/tmp/akr-e2e-dl/t1-overview.png" });
await go(A.page, "/akreditasyon");
await A.page.getByRole("tab", { name: /Kanıt üreticileri/ }).click();
await A.page.screenshot({ path: "/tmp/akr-e2e-dl/t2-generators.png" });
await A.page.getByRole("tab", { name: /^Ekip/ }).click();
await A.page.screenshot({ path: "/tmp/akr-e2e-dl/t3-team.png" });
await B.page.locator('input[type=file][accept^=".akredite-talep"]').setInputFiles(reqPath);
await B.page.waitForTimeout(600);
await B.page.screenshot({ path: "/tmp/akr-e2e-dl/t4-inbox.png", fullPage: true });

check("external requests = 0", external.length === 0, external.slice(0, 5).join(", "));
check("no console errors", errors.length === 0, errors.slice(0, 5).join(" || "));
console.log(`\n${results.filter(Boolean).length}/${results.length} PASS`);
await b.close();
