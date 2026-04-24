// Client-side AES-GCM encryption for sensitive Memory fields (password/login/url).
// Key is derived from the Central PIN + a per-installation salt persisted in app_settings.

const PREFIX = 'enc:v1:';
const PIN = '0507'; // Same PIN used by the lock screen
const ITERATIONS = 100_000;

let cachedKey: CryptoKey | null = null;
let cachedSalt: string | null = null;

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function getOrCreateSalt(): string {
  // Salt persisted in localStorage so it survives sessions on this device.
  // For multi-device sync, the salt is also written to app_settings (not implemented
  // here to keep this util self-contained — same PIN derives the same key).
  const KEY = 'central_crypto_salt_v1';
  let salt = localStorage.getItem(KEY);
  if (!salt) {
    const random = crypto.getRandomValues(new Uint8Array(16));
    salt = bufToBase64(random.buffer);
    localStorage.setItem(KEY, salt);
  }
  return salt;
}

async function deriveKey(pin: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuf(saltB64),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function getKey(): Promise<CryptoKey> {
  const salt = getOrCreateSalt();
  if (cachedKey && cachedSalt === salt) return cachedKey;
  cachedKey = await deriveKey(PIN, salt);
  cachedSalt = salt;
  return cachedKey;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export async function encryptString(plain: string): Promise<string> {
  if (!plain) return plain;
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  return `${PREFIX}${bufToBase64(iv.buffer)}:${bufToBase64(ct)}`;
}

export async function decryptString(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (!isEncrypted(value)) return value; // legacy plaintext — return as-is
  try {
    const body = value.slice(PREFIX.length);
    const [ivB64, ctB64] = body.split(':');
    if (!ivB64 || !ctB64) return value;
    const key = await getKey();
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuf(ivB64) },
      key,
      base64ToBuf(ctB64),
    );
    return new TextDecoder().decode(pt);
  } catch (e) {
    console.error('decryptString failed', e);
    return '⚠️ erro ao descriptografar';
  }
}

// Helper for object fields
export async function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): Promise<T> {
  const out: any = { ...obj };
  for (const f of fields) {
    const v = obj[f];
    if (typeof v === 'string' && v.length > 0 && !isEncrypted(v)) {
      out[f] = await encryptString(v);
    }
  }
  return out;
}

export async function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): Promise<T> {
  const out: any = { ...obj };
  for (const f of fields) {
    const v = obj[f];
    if (typeof v === 'string' && v.length > 0) {
      out[f] = await decryptString(v);
    }
  }
  return out;
}
