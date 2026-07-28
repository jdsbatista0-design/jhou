// Client-side AES-GCM encryption for sensitive Memory fields (password/login/url).
// The encryption key is derived from a user-supplied passphrase entered at runtime.
// The passphrase is NEVER persisted to disk — it lives only in the tab's in-memory
// cache (sessionStorage) so it is cleared when the tab closes and is not present in
// the shipped JavaScript bundle.

const PREFIX = 'enc:v1:';
const ITERATIONS = 150_000;
const SESSION_KEY = 'central_vault_passphrase_v1';
const SALT_KEY = 'central_crypto_salt_v1';

let cachedKey: CryptoKey | null = null;
let cachedSalt: string | null = null;
let cachedPassphrase: string | null = null;

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
  let salt = localStorage.getItem(SALT_KEY);
  if (!salt) {
    const random = crypto.getRandomValues(new Uint8Array(16));
    salt = bufToBase64(random.buffer);
    localStorage.setItem(SALT_KEY, salt);
  }
  return salt;
}

function readSessionPassphrase(): string | null {
  if (cachedPassphrase) return cachedPassphrase;
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    if (v) cachedPassphrase = v;
    return cachedPassphrase;
  } catch {
    return null;
  }
}

function writeSessionPassphrase(pp: string) {
  cachedPassphrase = pp;
  try { sessionStorage.setItem(SESSION_KEY, pp); } catch { /* ignore */ }
}

/**
 * Set the vault passphrase for this session. Call once (e.g. from a UI prompt)
 * before encrypting or decrypting sensitive Memory fields.
 */
export function setVaultPassphrase(passphrase: string) {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase muito curta.');
  }
  // Reset cached key so next getKey() re-derives with the new passphrase.
  cachedKey = null;
  cachedSalt = null;
  writeSessionPassphrase(passphrase);
}

/** Clear the in-memory passphrase (e.g. on logout). */
export function clearVaultPassphrase() {
  cachedKey = null;
  cachedSalt = null;
  cachedPassphrase = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

/** True when a passphrase is available for this session. */
export function hasVaultPassphrase(): boolean {
  return !!readSessionPassphrase();
}

async function ensurePassphrase(): Promise<string> {
  const existing = readSessionPassphrase();
  if (existing) return existing;
  // Fallback prompt so the vault continues to work without extra UI wiring.
  // The prompt happens exactly once per browser tab.
  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    const entered = window.prompt(
      'Digite a senha do cofre para acessar logins e senhas guardados.\nA senha fica apenas nesta aba do navegador.'
    );
    if (entered && entered.length >= 4) {
      writeSessionPassphrase(entered);
      return entered;
    }
  }
  throw new Error('VAULT_PASSPHRASE_REQUIRED');
}

async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuf(saltB64) as BufferSource,
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
  const passphrase = await ensurePassphrase();
  if (cachedKey && cachedSalt === salt) return cachedKey;
  cachedKey = await deriveKey(passphrase, salt);
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
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plain) as BufferSource,
  );
  return `${PREFIX}${bufToBase64(iv.buffer as ArrayBuffer)}:${bufToBase64(ct)}`;
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
      { name: 'AES-GCM', iv: base64ToBuf(ivB64) as BufferSource },
      key,
      base64ToBuf(ctB64) as BufferSource,
    );
    return new TextDecoder().decode(pt);
  } catch (e) {
    if (e instanceof Error && e.message === 'VAULT_PASSPHRASE_REQUIRED') {
      return '🔒 cofre bloqueado';
    }
    console.error('decryptString failed');
    return '⚠️ erro ao descriptografar';
  }
}

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
