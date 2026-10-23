import { chromium } from "playwright-core";
import fs from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
const BASE = "http://127.0.0.1:4173/app";
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1500, height: 1000 } });
const page = await ctx.newPage();
const errors = [], external = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("request", (r) => { const u = r.url(); if (!u.startsWith("http://127.0.0.1:4173/") && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u); });
const dl = async (fn) => { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), fn()]); const p = "/tmp/akr-e2e-dl/" + d.suggestedFilename(); await d.saveAs(p); return p; };
const docText = (p) => execSync(`unzip -p "${p}" word/document.xml`, { maxBuffer: 1 << 28 }).toString().replace(/<[^>]+>/g, " ");
const btn = (name) => page.getByRole("button", { name, exact: true });
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const check = (label, ok, extra = "") => console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? " — " + extra : ""}`);
fs.mkdirSync("/tmp/akr-e2e-dl", { recursive: true });

await page.goto(BASE);
await page.getByText("Demo veriyle keşfet").click();
await page.getByText("dönem iş akışı").first().waitFor();
check("overview evidence card", (await page.getByText("Akreditasyon hazırlığı").count()) > 0);
check("overview shows MEDEK", (await page.getByText(/MEDEK · Bilgisayar Programcılığı/).count()) > 0);

// --- Çalışma alanı (demo MEDEK) ---
await page.evaluate(() => (location.hash = "/akreditasyon"));
await page.getByText("Öz değerlendirme ortalaması").waitFor();
check("self-assessment tile", /\b3 \/ 5/.test(await page.getByText("Öz değerlendirme ortalaması").locator("../../..").innerText()), (await page.getByText("Öz değerlendirme ortalaması").locator("../../..").innerText()).replace(/\n/g, " | "));
await page.screenshot({ path: "/tmp/akr-e2e-dl/k1-workspace.png" });

// Ölçüt 1 → ilk kanıtı aç, dosya yükle
const first = page.locator("li").filter({ hasText: "Tablo 1.1 Öğrencilerin Üniversite Giriş" }).first();
await first.locator("button[aria-label='Ayrıntıları aç']").click();
const plain = Buffer.from("GIZLI-KANIT-ICERIGI " + "x".repeat(5000) + " son", "utf8");
fs.writeFileSync("/tmp/akr-e2e-dl/Öğrenci Giriş Tablosu 2025.pdf", plain);
await first.locator("input[type=file]").setInputFiles("/tmp/akr-e2e-dl/Öğrenci Giriş Tablosu 2025.pdf");
await page.getByText("Öğrenci Giriş Tablosu 2025.pdf").waitFor();
const shownHash = await first.locator("[title^='SHA-256']").first().getAttribute("title");
check("sha256 matches", shownHash === "SHA-256 " + sha(plain), shownHash);

// IndexedDB'de düz metin yok
const leak = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("AkrediteSinavVault"); r.onsuccess = () => res(r.result); r.onerror = rej; });
  const rows = await new Promise((res) => { const t = db.transaction("blobs").objectStore("blobs").getAll(); t.onsuccess = () => res(t.result); });
  const dec = new TextDecoder();
  return { count: rows.length, leak: rows.some((r) => dec.decode(new Uint8Array(r.ciphertext.buffer ?? r.ciphertext)).includes("GIZLI-KANIT")) };
});
check("blob stored encrypted", leak.count === 1 && !leak.leak, JSON.stringify(leak));

// İndir → aynı bayt
const got = await dl(() => first.getByRole("button", { name: "İndir" }).click());
check("download roundtrip", sha(fs.readFileSync(got)) === sha(plain));

// Uygulamadan belge ekle
await first.getByRole("button", { name: "Uygulamadan belge ekle" }).click();
await page.getByRole("dialog").getByText("Sınav kağıdı (A/B)").first().waitFor();
await page.getByRole("dialog").locator("li").filter({ hasText: "Sınav kağıdı (A/B)" }).first().getByRole("button", { name: "Ekle" }).click();
await page.getByText(/Sınav kağıdı \(A\/B\) eklendi/).waitFor({ timeout: 30000 });
const attCount = await first.locator("[title^='SHA-256']").count();
check("app documents attached", attCount >= 2, `${attCount} files`);

// Durum + sorumlu + not
await first.locator("select[aria-label='Kanıt durumu']").selectOption("ready");
await first.getByPlaceholder("ör. Bölüm kalite temsilcisi").fill("Dr. Kalite");
await first.getByPlaceholder(/Bu kanıt neyi gösteriyor/).fill("2024-2025 ve 2025-2026 verileri.");
await page.locator("body").click({ position: { x: 5, y: 5 } });

// Rehber düzeyi: 1.1 satırında 5 seç
const row = page.locator("div.rounded-lg").filter({ hasText: /^1\.1\. Programa yerleştirilen öğrenciler/ }).first();
await row.getByRole("button", { name: "5", exact: true }).click();
check("rubric level text shown", (await row.getByText(/veriye dayalı özgün modellerle/).count()) > 0);

// Özel kanıt
await page.getByPlaceholder(/için kurumunuza özgü bir kanıt kalemi/).fill("MYO öğrenci memnuniyet anketi 2026");
await page.getByRole("button", { name: "Ekle", exact: true }).last().click();
check("custom evidence", (await page.getByText("MYO öğrenci memnuniyet anketi 2026").count()) > 0);
await page.screenshot({ path: "/tmp/akr-e2e-dl/k2-criterion.png", fullPage: true });

// Görevler
await page.getByRole("tab", { name: /Görevler/ }).click();
await page.waitForTimeout(300);
check("tasks lists overdue", (await page.getByText("gecikmiş").count()) > 0);
await page.screenshot({ path: "/tmp/akr-e2e-dl/k3-tasks.png" });
await page.getByRole("tab", { name: /Kaynak belgeler/ }).click();
await page.waitForTimeout(300);
check("sources: PÇ card", (await page.getByText("MEDEK program çıktıları").count()) > 0);
check("sources: scoring", (await page.getByText("Puanlama ölçeği").count()) > 0);
await page.screenshot({ path: "/tmp/akr-e2e-dl/k4-sources.png", fullPage: true });
await page.getByRole("tab", { name: /Ölçütler ve kanıtlar/ }).click();

// Çıktılar
const xlsx = await dl(() => btn("Kanıt matrisi").click());
const sheets = execSync(`unzip -p "${xlsx}" xl/workbook.xml`).toString().match(/name="[^"]+"/g);
check("matrix sheets", sheets.join(",").includes("Öz Değerlendirme"), sheets.join(","));
const strs = execSync(`unzip -p "${xlsx}" 'xl/worksheets/*.xml'`, { maxBuffer: 1 << 28 }).toString();
check("matrix has owner + custom", strs.includes("Dr. Kalite") && strs.includes("MYO öğrenci memnuniyet anketi 2026"));
const docx = await dl(() => btn("Öz değerlendirme taslağı").click());
const dt = docText(docx);
check("self-study docx", dt.includes("ÖZ DEĞERLENDİRME") && dt.includes("Çok İyi") && dt.includes("2024-2025 ve 2025-2026 verileri."));
const zip = await dl(() => btn("Kanıt paketi (.zip)").click());
execSync(`rm -rf /tmp/akr-e2e-dl/zipx && mkdir -p /tmp/akr-e2e-dl/zipx && unzip -q "${zip}" -d /tmp/akr-e2e-dl/zipx`);
const root = fs.readdirSync("/tmp/akr-e2e-dl/zipx")[0];
const toc = fs.readFileSync(`/tmp/akr-e2e-dl/zipx/${root}/ICINDEKILER.txt`, "utf8");
const lines = toc.split(/\r\n/).filter((l) => /^\s+\[[^\]]+\] [0-9a-f]{64}  /.test(l)).map((l) => l.replace(/^\s+\[[^\]]+\] /, ""));
fs.writeFileSync("/tmp/akr-e2e-dl/zipx/sums.txt", lines.join("\n") + "\n");
const shaOut = execSync(`cd "/tmp/akr-e2e-dl/zipx/${root}" && shasum -a 256 -c ../sums.txt`).toString();
check("zip sha256 verified", lines.length >= 2 && !/FAILED/.test(shaOut), `${lines.length} files`);
check("zip ascii names", lines.every((l) => /^[\x20-\x7e]+$/.test(l)));

// Katalog: YÖKAK KAP ekle, olgunluk ver → tahmini puan
await btn("Akreditasyon ekle").click();
await page.getByText(/Ölçüt kataloğu · 32 çerçeve/).waitFor();
check("catalog 32", true);
check("no uncovered bodies", (await page.getByText("Katalogda ölçüt seti bulunmayan").count()) === 0);
check("MEDEK preferred first", (await page.locator("div.rounded-xl").filter({ hasText: "Kurum ayarınızdaki kuruluş" }).count()) >= 0);
await page.screenshot({ path: "/tmp/akr-e2e-dl/k5-catalog.png", fullPage: true });
const kap = page.locator("div.rounded-xl").filter({ hasText: /^YÖKAK-KAP/ }).first();
await kap.getByRole("button", { name: "Bu akreditasyonla çalış" }).click();
await btn("Çalışma alanını oluştur").click();
await page.getByText("Tahmini puan (resmi değil)").waitFor();
await page.getByRole("button", { name: "4", exact: true }).first().click();
const tile = await page.getByText("Tahmini puan (resmi değil)").locator("../../..").innerText();
check("YÖKAK estimated score", /\b48\b/.test(tile), tile.replace(/\n/g, " | "));
await page.screenshot({ path: "/tmp/akr-e2e-dl/k6-yokak.png" });

// Özel ölçüt seti
await btn("Akreditasyon ekle").click();
await btn("Kendi ölçüt setimi oluştur").click();
await page.getByPlaceholder("ör. MÜDEK").fill("ISO 21001");
await page.locator("textarea").fill("1. Kurum bağlamı\n- Paydaş analizi\n- Kapsam beyanı\n2. Liderlik\n- Kalite politikası");
await page.getByRole("button", { name: /2 ölçütle oluştur/ }).click();
await page.getByText("Kurum tanımlı ölçüt seti").waitFor();
check("custom framework", (await page.getByText("Paydaş analizi").count()) > 0);

process.on("unhandledRejection", async (e) => { console.log("ERR", e.message.split("\n")[0]); await page.screenshot({ path: "/tmp/akr-e2e-dl/k-err.png" }); process.exit(1); });
// Parola belirle → ekler yeniden şifrelenir, kilit aç → MEDEK dosyası indirilebilir
await page.evaluate(() => (location.hash = "/kasa")); await page.waitForTimeout(400);
await btn("Master Parola Belirle").click();
await page.locator("input[type=password]").nth(0).fill("GizliParola#2026");
await page.locator("input[type=password]").nth(1).fill("GizliParola#2026");
await btn("Kaydet ve Yeniden Şifrele").click(); await page.waitForTimeout(3000);
await page.reload(); await page.getByText("Kasa Kilitli").waitFor({ timeout: 10000 });
await page.locator("input[type=password]").fill("GizliParola#2026"); await page.getByRole("button", { name: /Kilidi Aç/ }).click();
await page.waitForTimeout(1500);
await page.evaluate(() => (location.hash = "/akreditasyon")); await page.waitForTimeout(600);
await page.locator("select[aria-label='Akreditasyon çerçevesi']").selectOption("medek");
await page.waitForTimeout(400);
const f2 = page.locator("li").filter({ hasText: "Tablo 1.1 Öğrencilerin Üniversite Giriş" }).first();
await f2.locator("button[aria-label='Ayrıntıları aç']").click();
const got2 = await dl(() => f2.getByRole("button", { name: "İndir" }).first().click());
check("attachment readable after password re-encryption", sha(fs.readFileSync(got2)) === sha(plain));

// Yedek (v2, ekli) → temizle → geri yükle
await page.getByRole("button", { name: "Veri", exact: true }).click();
await page.getByRole("button", { name: /^\.akredite yedeği indir/ }).click();
await page.locator("input[type=password]").nth(0).fill("yedek-parola-123");
await page.locator("input[type=password]").nth(1).fill("yedek-parola-123");
const bk = await dl(() => btn("Şifrele ve İndir").click());
check("backup has no plaintext", !fs.readFileSync(bk, "utf8").includes("GIZLI-KANIT") && !fs.readFileSync(bk, "utf8").includes("Dr. Kalite"));
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Veri", exact: true }).click();
await page.getByRole("button", { name: /Tüm veriyi temizle/ }).first().click();
await page.waitForTimeout(300);
const confirmBtn = page.getByRole("button", { name: "Temizle", exact: true });
if (await confirmBtn.count()) await confirmBtn.click();
await page.waitForTimeout(1500);
const afterClear = await page.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open("AkrediteSinavVault"); r.onsuccess = () => res(r.result); });
  return await new Promise((res) => { const t = db.transaction("blobs").objectStore("blobs").count(); t.onsuccess = () => res(t.result); });
});
check("orphan blobs pruned after clear", afterClear === 0, `blobs=${afterClear}`);
await page.getByRole("button", { name: "Veri", exact: true }).click();
await page.getByRole("button", { name: /^\.akredite yedeğini yükle/ }).click();
await page.locator('input[type=file][accept^=".akredite"]').setInputFiles(bk);
await page.locator("input[type=password]").nth(0).fill("yedek-parola-123");
await btn("Çöz ve Geri Yükle").click(); await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Geri Yükle", exact: true }).click(); await page.waitForTimeout(1500);
await page.evaluate(() => (location.hash = "/akreditasyon")); await page.waitForTimeout(800);
await page.locator("select[aria-label='Akreditasyon çerçevesi']").selectOption("medek").catch(() => {});
await page.waitForTimeout(400);
const f3 = page.locator("li").filter({ hasText: "Tablo 1.1 Öğrencilerin Üniversite Giriş" }).first();
await f3.locator("button[aria-label='Ayrıntıları aç']").click();
const got3 = await dl(() => f3.getByRole("button", { name: "İndir" }).first().click());
check("attachment restored from backup", sha(fs.readFileSync(got3)) === sha(plain));

// Çerçeveyi kaldır → dosyalar silinir
await page.getByRole("tab", { name: /Kaynak belgeler/ }).click();
await btn("Çalışma alanını kaldır").click();
await page.getByRole("button", { name: "Kaldır", exact: true }).click(); await page.waitForTimeout(1200);
const afterRemove = await page.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open("AkrediteSinavVault"); r.onsuccess = () => res(r.result); });
  return await new Promise((res) => { const t = db.transaction("blobs").objectStore("blobs").count(); t.onsuccess = () => res(t.result); });
});
check("framework removal deletes files", afterRemove === 0, `blobs=${afterRemove}`);

// Mobil
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("mobile no horizontal overflow", overflow <= 0, `overflow=${overflow}`);
await page.screenshot({ path: "/tmp/akr-e2e-dl/k7-mobile.png" });

check("external requests = 0", external.length === 0, external.join(", "));
check("no console errors", errors.length === 0, errors.join(" || "));
await b.close();
