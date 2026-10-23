"use client";

// Kanıthane — Zero-Knowledge Kriptografik Kasa
// ----------------------------------------------------------------------------
// * Anahtar türetme : PBKDF2 / SHA-256 / 100.000 iterasyon / 16 byte rastgele salt
// * Şifreleme       : AES-256-GCM, her yazımda yeni 12 byte IV, koleksiyon adı AAD
// * Depolama        : IndexedDB (Dexie) — yalnızca şifreli bayt dizileri yazılır
// * Otomatik mod    : Dışa aktarılamaz (non-extractable) cihaz anahtarı IndexedDB'de
//                     CryptoKey nesnesi olarak saklanır; ham anahtar baytları JS'e
//                     hiçbir zaman açılmaz.
// * Parola modu     : Anahtar yalnızca bellekte yaşar; diske sadece salt + doğrulama
//                     bloğu yazılır.
// ----------------------------------------------------------------------------

import Dexie, { type Table } from "dexie";
import type { CollectionKey, VaultData } from "./types";

export const KDF_ITERATIONS = 100_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const AKREDITE_FORMAT = "akredite-vault";
export const AKREDITE_VERSION = 1;
const CHECK_PLAINTEXT = "AKREDITE-SINAV::VAULT-CHECK::v1";

export interface EncryptedRecord {
  key: CollectionKey;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
  updatedAt: string;
  byteLength: number;
}

export type KeyMode = "device" | "password";

export interface KeyringMeta {
  id: "keyring";
  mode: KeyMode;
  deviceKey?: CryptoKey;
  salt?: string; // base64
  iterations: number;
  checkIv?: Uint8Array;
  checkCipher?: ArrayBuffer;
  createdAt: string;
  updatedAt: string;
}

/** Kanıt dosyası eki: içerik AES-256-GCM ile şifreli, AAD = "blob:<id>" */
export interface EncryptedBlob {
  id: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
  byteLength: number;
  createdAt: string;
}

class VaultDatabase extends Dexie {
  records!: Table<EncryptedRecord, CollectionKey>;
  meta!: Table<KeyringMeta, string>;
  blobs!: Table<EncryptedBlob, string>;

  constructor() {
    super("AkrediteSinavVault");
    this.version(1).stores({
      records: "key, updatedAt",
      meta: "id",
    });
    this.version(2).stores({
      records: "key, updatedAt",
      meta: "id",
      blobs: "id, createdAt",
    });
  }
}

let dbInstance: VaultDatabase | null = null;
export function getDb(): VaultDatabase {
  if (!dbInstance) dbInstance = new VaultDatabase();
  return dbInstance;
}

// ---------------------------------------------------------------------------
// Bayt yardımcıları
// ---------------------------------------------------------------------------

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function bytesToBase64(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode(...arr.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function bytesToHex(bytes: Uint8Array | ArrayBuffer, max = Infinity): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const len = Math.min(arr.length, max);
  let out = "";
  for (let i = 0; i < len; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

function copyBytes(src: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(src.length);
  out.set(src);
  return out;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ---------------------------------------------------------------------------
// Temel kriptografi
// ---------------------------------------------------------------------------

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = KDF_ITERATIONS,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptBytes(
  key: CryptoKey,
  plaintext: Uint8Array<ArrayBuffer>,
  aad?: string,
): Promise<{ iv: Uint8Array<ArrayBuffer>; ciphertext: ArrayBuffer }> {
  const iv = randomBytes(IV_BYTES);
  const params: AesGcmParams = { name: "AES-GCM", iv, tagLength: 128 };
  if (aad) params.additionalData = encoder.encode(aad);
  const ciphertext = await crypto.subtle.encrypt(params, key, plaintext);
  return { iv, ciphertext };
}

export async function decryptBytes(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: ArrayBuffer,
  aad?: string,
): Promise<ArrayBuffer> {
  const params: AesGcmParams = { name: "AES-GCM", iv: copyBytes(iv), tagLength: 128 };
  if (aad) params.additionalData = encoder.encode(aad);
  return crypto.subtle.decrypt(params, key, ciphertext);
}

export async function encryptJson(key: CryptoKey, value: unknown, aad?: string) {
  return encryptBytes(key, encoder.encode(JSON.stringify(value)), aad);
}

export async function decryptJson<T>(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: ArrayBuffer,
  aad?: string,
): Promise<T> {
  const plain = await decryptBytes(key, iv, ciphertext, aad);
  return JSON.parse(decoder.decode(plain)) as T;
}

// ---------------------------------------------------------------------------
// Kasa yaşam döngüsü
// ---------------------------------------------------------------------------

export type VaultOpenResult =
  | { status: "ready"; key: CryptoKey; mode: KeyMode; isNew: boolean }
  | { status: "locked" };

/** Kasayı açar. Hiç kasa yoksa otomatik cihaz anahtarı ile yeni kasa oluşturur. */
export async function openVault(): Promise<VaultOpenResult> {
  const db = getDb();
  const meta = await db.meta.get("keyring");
  if (!meta) {
    const deviceKey = await generateDeviceKey();
    const now = new Date().toISOString();
    await db.meta.put({
      id: "keyring",
      mode: "device",
      deviceKey,
      iterations: KDF_ITERATIONS,
      createdAt: now,
      updatedAt: now,
    });
    return { status: "ready", key: deviceKey, mode: "device", isNew: true };
  }
  if (meta.mode === "device" && meta.deviceKey) {
    const count = await db.records.count();
    return { status: "ready", key: meta.deviceKey, mode: "device", isNew: count === 0 };
  }
  return { status: "locked" };
}

export async function getKeyringMeta(): Promise<KeyringMeta | undefined> {
  return getDb().meta.get("keyring");
}

export async function unlockWithPassword(password: string): Promise<CryptoKey> {
  const meta = await getDb().meta.get("keyring");
  if (!meta || meta.mode !== "password" || !meta.salt || !meta.checkIv || !meta.checkCipher) {
    throw new Error("Parola korumalı kasa bulunamadı.");
  }
  const key = await deriveKeyFromPassword(password, base64ToBytes(meta.salt), meta.iterations);
  try {
    const plain = await decryptBytes(key, meta.checkIv, meta.checkCipher, "keyring");
    if (decoder.decode(plain) !== CHECK_PLAINTEXT) throw new Error("check");
  } catch {
    throw new Error("Master parola hatalı. Kasa çözülemedi.");
  }
  return key;
}

export async function writeCollection<K extends CollectionKey>(
  key: CryptoKey,
  collection: K,
  value: VaultData[K],
): Promise<void> {
  const { iv, ciphertext } = await encryptJson(key, value, collection);
  await getDb().records.put({
    key: collection,
    iv,
    ciphertext,
    updatedAt: new Date().toISOString(),
    byteLength: ciphertext.byteLength,
  });
}

export async function readAllCollections(key: CryptoKey): Promise<Partial<VaultData>> {
  const records = await getDb().records.toArray();
  const out: Partial<Record<CollectionKey, unknown>> = {};
  for (const rec of records) {
    out[rec.key] = await decryptJson(key, rec.iv, rec.ciphertext, rec.key);
  }
  return out as Partial<VaultData>;
}

export async function writeAllCollections(key: CryptoKey, data: VaultData): Promise<void> {
  const keys = Object.keys(data) as CollectionKey[];
  for (const k of keys) {
    await writeCollection(key, k, data[k]);
  }
}

// ---------------------------------------------------------------------------
// Şifreli dosya ekleri (kanıt dosyaları)
// ---------------------------------------------------------------------------

export async function writeBlob(key: CryptoKey, id: string, data: ArrayBuffer): Promise<void> {
  const { iv, ciphertext } = await encryptBytes(key, new Uint8Array(data), `blob:${id}`);
  await getDb().blobs.put({ id, iv, ciphertext, byteLength: data.byteLength, createdAt: new Date().toISOString() });
}

export async function readBlob(key: CryptoKey, id: string): Promise<ArrayBuffer | null> {
  const rec = await getDb().blobs.get(id);
  if (!rec) return null;
  return decryptBytes(key, rec.iv, rec.ciphertext, `blob:${id}`);
}

export async function deleteBlob(id: string): Promise<void> {
  await getDb().blobs.delete(id);
}

export async function listBlobIds(): Promise<string[]> {
  return (await getDb().blobs.toCollection().primaryKeys()) as string[];
}

export async function blobUsage(): Promise<{ count: number; bytes: number }> {
  const all = await getDb().blobs.toArray();
  return { count: all.length, bytes: all.reduce((s, b) => s + b.byteLength, 0) };
}

/** Kasadaki hiçbir kayda bağlı olmayan şifreli ekleri siler (sıfırlama / geri yükleme sonrası). */
export async function pruneBlobs(keep: Set<string>): Promise<number> {
  const orphans = (await listBlobIds()).filter((id) => !keep.has(id));
  if (orphans.length) await getDb().blobs.bulkDelete(orphans);
  return orphans.length;
}

/** Anahtar değişiminde tüm ekleri yeni anahtarla yeniden şifreler. */
async function reencryptBlobs(oldKey: CryptoKey, newKey: CryptoKey): Promise<void> {
  const db = getDb();
  const ids = await listBlobIds();
  for (const id of ids) {
    const plain = await readBlob(oldKey, id);
    if (plain) await writeBlob(newKey, id, plain);
  }
  void db;
}

/** Tüm kasayı yeni master parola ile yeniden şifreler. */
export async function setMasterPassword(password: string, data: VaultData, oldKey?: CryptoKey): Promise<CryptoKey> {
  if (password.length < 8) throw new Error("Master parola en az 8 karakter olmalıdır.");
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKeyFromPassword(password, salt, KDF_ITERATIONS);
  const check = await encryptBytes(key, encoder.encode(CHECK_PLAINTEXT), "keyring");
  const db = getDb();
  const now = new Date().toISOString();
  await db.transaction("rw", db.records, db.meta, async () => {
    await db.records.clear();
  });
  await writeAllCollections(key, data);
  if (oldKey) await reencryptBlobs(oldKey, key);
  const prev = await db.meta.get("keyring");
  await db.meta.put({
    id: "keyring",
    mode: "password",
    salt: bytesToBase64(salt),
    iterations: KDF_ITERATIONS,
    checkIv: check.iv,
    checkCipher: check.ciphertext,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  });
  return key;
}

/** Master parolayı kaldırır; kasa yeni bir cihaz anahtarı ile yeniden şifrelenir. */
export async function removeMasterPassword(data: VaultData, oldKey?: CryptoKey): Promise<CryptoKey> {
  const deviceKey = await generateDeviceKey();
  const db = getDb();
  await db.records.clear();
  await writeAllCollections(deviceKey, data);
  if (oldKey) await reencryptBlobs(oldKey, deviceKey);
  const prev = await db.meta.get("keyring");
  const now = new Date().toISOString();
  await db.meta.put({
    id: "keyring",
    mode: "device",
    deviceKey,
    iterations: KDF_ITERATIONS,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  });
  return deviceKey;
}

/** Kasayı ve anahtarları kalıcı olarak siler. */
export async function wipeVault(): Promise<void> {
  const db = getDb();
  await db.records.clear();
  await db.meta.clear();
  await db.blobs.clear();
}

export async function listEncryptedRecords(): Promise<EncryptedRecord[]> {
  return getDb().records.toArray();
}

// ---------------------------------------------------------------------------
// .akredite şifreli yedek paketi
// ---------------------------------------------------------------------------

export interface AkreditePackage {
  format: typeof AKREDITE_FORMAT;
  version: number;
  createdAt: string;
  app: "AkrediteSınav";
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: { name: "AES-GCM"; keyLength: 256; iv: string; tagLength: 128 };
  payload: string; // base64 ciphertext
}

export interface BackupBlob {
  id: string;
  base64: string;
}

/** Sürüm 2 paketi: kasa verisi + şifreli kanıt dosyaları (ekler) tek pakette. */
export async function exportAkredite(data: VaultData, password: string, blobs: BackupBlob[] = []): Promise<Blob> {
  if (password.length < 6) throw new Error("Yedek parolası en az 6 karakter olmalıdır.");
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKeyFromPassword(password, salt, KDF_ITERATIONS);
  const { iv, ciphertext } = await encryptJson(key, { v: 2, data, blobs }, AKREDITE_FORMAT);
  const pkg: AkreditePackage = {
    format: AKREDITE_FORMAT,
    version: 2,
    createdAt: new Date().toISOString(),
    app: "AkrediteSınav",
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: KDF_ITERATIONS, salt: bytesToBase64(salt) },
    cipher: { name: "AES-GCM", keyLength: 256, iv: bytesToBase64(iv), tagLength: 128 },
    payload: bytesToBase64(ciphertext),
  };
  return new Blob([JSON.stringify(pkg, null, 2)], { type: "application/octet-stream" });
}

export async function importAkredite(file: File, password: string): Promise<{ data: VaultData; blobs: BackupBlob[] }> {
  let pkg: AkreditePackage;
  try {
    pkg = JSON.parse(await file.text()) as AkreditePackage;
  } catch {
    throw new Error("Dosya geçerli bir .akredite paketi değil.");
  }
  if (pkg.format !== AKREDITE_FORMAT || !pkg.kdf?.salt || !pkg.cipher?.iv || !pkg.payload) {
    throw new Error("Dosya geçerli bir .akredite paketi değil.");
  }
  const key = await deriveKeyFromPassword(password, base64ToBytes(pkg.kdf.salt), pkg.kdf.iterations);
  try {
    const plain = await decryptJson<VaultData | { v: 2; data: VaultData; blobs: BackupBlob[] }>(
      key,
      base64ToBytes(pkg.cipher.iv),
      base64ToBytes(pkg.payload).buffer,
      AKREDITE_FORMAT,
    );
    // Sürüm 1 paketler yalnızca kasa verisini içerir
    if (plain && typeof plain === "object" && "v" in plain && plain.v === 2) return { data: plain.data, blobs: plain.blobs ?? [] };
    return { data: plain as VaultData, blobs: [] };
  } catch {
    throw new Error("Yedek parolası hatalı veya dosya bozulmuş (GCM doğrulama etiketi tutmadı).");
  }
}
