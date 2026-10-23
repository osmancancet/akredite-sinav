// Sunucusuz ekip kanıt alışverişi (Faz 2-A).
//
// 1) Koordinatör her talep için bir ECDH P-256 anahtar çifti üretir. Talep dosyası (.akredite-talep)
//    yalnızca kanıt kalemi başlıklarını ve AÇIK anahtarı taşır; özel anahtar koordinatörün şifreli kasasında kalır.
// 2) Öğretim elemanı teslim paketini (.akredite-teslim) geçici bir ECDH anahtarıyla, HKDF-SHA256 ile türetilen
//    AES-256-GCM anahtarı kullanarak şifreler. Paketi yalnızca talebi oluşturan koordinatör açabilir.
// 3) Ortadaki adam riskine karşı iki tarafta aynı doğrulama kodu (açık anahtar parmak izi) gösterilir.
// Sunucu yoktur; dosyalar e-posta, USB veya kurum içi paylaşım ile taşınır.

import type { RequestItem } from "./types";

export const REQUEST_FORMAT = "akredite-talep";
export const SUBMISSION_FORMAT = "akredite-teslim";
const HKDF_INFO = new TextEncoder().encode("akredite-teslim-v1");
const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(data: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", data));
}

/**
 * Doğrulama kodu: SHA-256(açık anahtar ‖ talep içeriği) ilk 8 bayt → "1A2B-3C4D-5E6F-7A8B".
 * Kod, anahtarla birlikte kalem başlıklarını, mesajı, tarihleri ve gönderen bilgisini de kapsar;
 * iki tarafta aynı kod görünüyorsa talep dosyası yolda değiştirilmemiştir.
 */
export async function fingerprintOf(jwk: JsonWebKey, content = ""): Promise<string> {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || typeof jwk.x !== "string" || typeof jwk.y !== "string") throw new Error("Geçersiz açık anahtar.");
  const h = (await sha256Hex(enc.encode(`${jwk.x}.${jwk.y}|${content}`))).slice(0, 16).toUpperCase();
  return h.match(/.{4}/g)!.join("-");
}

/** Talep içeriğinin kanonik metni (alan sırası sabit) — doğrulama kodunun kapsadığı her şey */
export function requestCanonical(f: Omit<RequestFile, "fingerprint" | "format" | "v">): string {
  return JSON.stringify([
    f.id,
    f.createdAt,
    f.coordinator,
    f.institution,
    f.frameworkCode,
    f.frameworkName ?? "",
    f.scopeLabel,
    f.recipient,
    f.message ?? "",
    f.due ?? "",
    f.items.map((i) => [i.evidenceId, i.title, i.criterionId, i.criterionTitle, i.sub ?? "", i.basis ?? "", i.source ?? ""]),
  ]);
}

// ---------------------------------------------------------------------------
// Doğrulama (dosyalar dışarıdan gelir: her alanın türü denetlenir)
// ---------------------------------------------------------------------------

const RESERVED = new Set(["__proto__", "constructor", "prototype", ...Object.getOwnPropertyNames(Object.prototype)]);
const isStr = (v: unknown, max = 20_000): v is string => typeof v === "string" && v.length <= max;
const optStr = (v: unknown, max = 20_000) => v === undefined || isStr(v, max);
const isId = (v: unknown): v is string => isStr(v, 200) && v.length > 0 && !RESERVED.has(v);
function fail(msg: string): never {
  throw new Error(msg);
}

const publicOnly = (jwk: JsonWebKey): JsonWebKey => ({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y });

// ---------------------------------------------------------------------------
// Talep
// ---------------------------------------------------------------------------

export interface RequestFile {
  format: typeof REQUEST_FORMAT;
  v: 1;
  id: string;
  createdAt: string;
  coordinator: string;
  institution: string;
  frameworkCode: string;
  frameworkName?: string;
  scopeLabel: string;
  recipient: string;
  message?: string;
  due?: string;
  publicJwk: JsonWebKey;
  fingerprint: string;
  items: RequestItem[];
}

export async function createRequestKeys(): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey }> {
  const kp = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  return { publicJwk: publicOnly(await crypto.subtle.exportKey("jwk", kp.publicKey)), privateJwk: await crypto.subtle.exportKey("jwk", kp.privateKey) };
}

/** Talep dosyasını kurar ve doğrulama kodunu içeriğe bağlar */
export async function sealRequestFile(f: Omit<RequestFile, "fingerprint" | "format" | "v">): Promise<RequestFile> {
  const fingerprint = await fingerprintOf(f.publicJwk, requestCanonical(f));
  return { format: REQUEST_FORMAT, v: 1, ...f, publicJwk: publicOnly(f.publicJwk), fingerprint };
}

/** Talep dosyasını doğrular: biçim, her alanın türü, kimliklerin benzersizliği ve doğrulama kodunun içerikle tutarlılığı */
export async function parseRequestFile(text: string): Promise<RequestFile> {
  let o: RequestFile;
  try {
    o = JSON.parse(text);
  } catch {
    throw new Error("Dosya okunamadı: geçerli bir kanıt talebi değil.");
  }
  if (!o || typeof o !== "object" || o.format !== REQUEST_FORMAT) fail(o && (o as { format?: string }).format === SUBMISSION_FORMAT ? "Bu bir teslim paketi; koordinatör tarafında “Teslim al” ile açılır." : "Bu dosya bir kanıt talebi değil.");
  if (o.v !== 1) fail("Talep dosyasının sürümü desteklenmiyor.");
  const bad = "Talep dosyası eksik veya bozuk.";
  if (!isId(o.id) || !isStr(o.createdAt, 40) || !isStr(o.coordinator, 300) || !isStr(o.institution, 300) || !isStr(o.frameworkCode, 100) || !isStr(o.scopeLabel, 300) || !isStr(o.recipient, 300)) fail(bad);
  if (!optStr(o.frameworkName, 500) || !optStr(o.message, 5000) || !(o.due === undefined || (isStr(o.due, 10) && /^\d{4}-\d{2}-\d{2}$/.test(o.due)))) fail(bad);
  if (!o.publicJwk || typeof o.publicJwk !== "object" || !isStr(o.fingerprint, 19)) fail(bad);
  if (!Array.isArray(o.items) || !o.items.length || o.items.length > 2000) fail(bad);
  const seen = new Set<string>();
  for (const it of o.items) {
    if (!it || typeof it !== "object" || !isId(it.evidenceId) || seen.has(it.evidenceId) || !isStr(it.title, 2000) || !isStr(it.criterionId, 300) || !isStr(it.criterionTitle, 1000)) fail("Talep dosyasındaki kanıt kalemleri bozuk.");
    if (!optStr(it.sub, 200) || !optStr(it.basis, 5000) || !optStr(it.source, 2000)) fail("Talep dosyasındaki kanıt kalemleri bozuk.");
    seen.add(it.evidenceId);
  }
  const clean: Omit<RequestFile, "fingerprint" | "format" | "v"> = {
    id: o.id,
    createdAt: o.createdAt,
    coordinator: o.coordinator,
    institution: o.institution,
    frameworkCode: o.frameworkCode,
    ...(o.frameworkName ? { frameworkName: o.frameworkName } : {}),
    scopeLabel: o.scopeLabel,
    recipient: o.recipient,
    ...(o.message ? { message: o.message } : {}),
    ...(o.due ? { due: o.due } : {}),
    publicJwk: publicOnly(o.publicJwk),
    items: o.items.map((i) => ({
      evidenceId: i.evidenceId,
      title: i.title,
      criterionId: i.criterionId,
      criterionTitle: i.criterionTitle,
      ...(i.sub ? { sub: i.sub } : {}),
      ...(i.basis ? { basis: i.basis } : {}),
      ...(i.source ? { source: i.source } : {}),
    })),
  };
  if ((await fingerprintOf(clean.publicJwk, requestCanonical(clean))) !== o.fingerprint) fail("Talep dosyası bozuk veya yolda değiştirilmiş: doğrulama kodu içerikle uyuşmuyor.");
  return { format: REQUEST_FORMAT, v: 1, ...clean, fingerprint: o.fingerprint };
}

// ---------------------------------------------------------------------------
// Teslim
// ---------------------------------------------------------------------------

export interface SubmissionFileEntry {
  name: string;
  mime: string;
  size: number;
  sha256: string;
  addedAt: string;
  period?: string;
  data: string; // base64 (yalnızca şifreli yükün içinde)
}

export interface SubmissionPayload {
  submissionId: string;
  requestId: string;
  respondent: string;
  submittedAt: string;
  items: { evidenceId: string; note?: string; files: SubmissionFileEntry[] }[];
}

export interface SubmissionFile {
  format: typeof SUBMISSION_FORMAT;
  v: 1;
  requestId: string;
  fingerprint: string;
  epk: JsonWebKey;
  salt: string;
  iv: string;
  ciphertext: string;
}

async function deriveAesKey(privateKey: CryptoKey, publicKey: CryptoKey, salt: Uint8Array<ArrayBuffer>, usage: KeyUsage): Promise<CryptoKey> {
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const hkdfKey = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt, info: HKDF_INFO }, hkdfKey, { name: "AES-GCM", length: 256 }, false, [usage]);
}

const aadOf = (requestId: string, fingerprint: string) => enc.encode(`${SUBMISSION_FORMAT}|1|${requestId}|${fingerprint}`);

/** Teslim paketini yalnızca talebin açık anahtarı sahibinin açabileceği biçimde şifreler */
export async function sealSubmission(request: Pick<RequestFile, "id" | "publicJwk" | "fingerprint">, payload: SubmissionPayload): Promise<SubmissionFile> {
  const recipient = await crypto.subtle.importKey("jwk", publicOnly(request.publicJwk), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const eph = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(eph.privateKey, recipient, salt, "encrypt");
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aadOf(request.id, request.fingerprint) }, key, enc.encode(JSON.stringify(payload)));
  return {
    format: SUBMISSION_FORMAT,
    v: 1,
    requestId: request.id,
    fingerprint: request.fingerprint,
    epk: publicOnly(await crypto.subtle.exportKey("jwk", eph.publicKey)),
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ct)),
  };
}

export function parseSubmissionFile(text: string): SubmissionFile {
  let o: SubmissionFile;
  try {
    o = JSON.parse(text);
  } catch {
    throw new Error("Dosya okunamadı: geçerli bir teslim paketi değil.");
  }
  if (!o || typeof o !== "object" || o.format !== SUBMISSION_FORMAT) fail(o && (o as { format?: string }).format === REQUEST_FORMAT ? "Bu bir talep dosyası; öğretim elemanı tarafında “Talebi aç” ile açılır." : "Bu dosya bir teslim paketi değil.");
  if (o.v !== 1 || !isId(o.requestId) || !isStr(o.fingerprint, 19) || !o.epk || typeof o.epk !== "object" || !isStr(o.iv, 100) || !isStr(o.salt, 100) || typeof o.ciphertext !== "string") fail("Teslim paketi eksik veya bozuk.");
  return o;
}

/** Çözülen yükün biçimi: dışarıdan gelir, her alan denetlenir */
function validatePayload(p: unknown): SubmissionPayload {
  const bad = () => fail("Teslim paketinin içeriği bozuk.");
  const o = p as SubmissionPayload;
  if (!o || typeof o !== "object" || !isStr(o.submissionId, 200) || !o.submissionId || !isStr(o.requestId, 200) || !isStr(o.respondent, 300) || !isStr(o.submittedAt, 40) || !Array.isArray(o.items) || o.items.length > 2000) bad();
  for (const it of o.items) {
    if (!it || typeof it !== "object" || !isId(it.evidenceId) || !optStr(it.note, 10_000) || !Array.isArray(it.files) || it.files.length > 500) bad();
    for (const f of it.files) {
      if (!f || typeof f !== "object" || !isStr(f.name, 500) || !f.name || !isStr(f.mime, 200) || typeof f.size !== "number" || !isStr(f.sha256, 64) || !/^[0-9a-f]{64}$/.test(f.sha256) || !isStr(f.addedAt, 40) || !optStr(f.period, 20) || typeof f.data !== "string") bad();
    }
  }
  return o;
}

/**
 * Teslim paketini koordinatörün özel anahtarıyla açar ve her dosyanın SHA-256 özetini doğrular.
 * Paket başka bir talebe aitse, değiştirilmişse veya başka bir anahtarla şifrelenmişse hata verir.
 */
export async function openSubmission(
  file: SubmissionFile,
  request: { id: string; fingerprint: string; privateJwk: JsonWebKey },
): Promise<SubmissionPayload> {
  if (file.requestId !== request.id) throw new Error("Bu teslim paketi başka bir talebe ait.");
  if (file.fingerprint !== request.fingerprint) throw new Error("Doğrulama kodu bu taleple uyuşmuyor.");
  const priv = await crypto.subtle.importKey("jwk", request.privateJwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const epk = await crypto.subtle.importKey("jwk", publicOnly(file.epk), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const key = await deriveAesKey(priv, epk, fromBase64(file.salt), "decrypt");
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(file.iv), additionalData: aadOf(file.requestId, file.fingerprint) }, key, fromBase64(file.ciphertext));
  } catch {
    throw new Error("Teslim paketi açılamadı: dosya değiştirilmiş veya bu talep için şifrelenmemiş.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(dec.decode(plain));
  } catch {
    fail("Teslim paketinin içeriği bozuk.");
  }
  const payload = validatePayload(parsed);
  if (payload.requestId !== request.id) throw new Error("Paket içeriği başka bir talebe ait.");
  for (const it of payload.items) {
    for (const f of it.files) {
      if ((await sha256Hex(fromBase64(f.data))) !== f.sha256) throw new Error(`“${f.name}” dosyasının bütünlük özeti tutmuyor.`);
    }
  }
  return payload;
}
