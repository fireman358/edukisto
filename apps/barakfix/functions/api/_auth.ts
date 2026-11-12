/* Helpers d'auth partagés : JWT HS256 (propriétaire & locataire) + mots de passe bailleur (PBKDF2). */

const enc = new TextEncoder();

function b64url(o: object | string): string {
  const s = typeof o === "string" ? o : JSON.stringify(o);
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64uDecode(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  return decodeURIComponent(escape(atob(padded)));
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function jwtSign(payload: object, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const data = `${b64url(header)}.${b64url({ ...payload, iat: Math.floor(Date.now() / 1000) })}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export async function jwtVerify(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(b64uDecode(parts[2]), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;
    const payload = JSON.parse(b64uDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* Mots de passe bailleur : PBKDF2-SHA256, format pbkdf2$iterations$saltHex$hashHex */
export async function hashPassword(password: string, iterations = 100000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return `pbkdf2$${iterations}$${hex(salt.buffer)}$${hex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltHex, hashHex] = stored.split("$");
    if (scheme !== "pbkdf2" || !iterStr || !saltHex || !hashHex) return false;
    const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: parseInt(iterStr, 10) },
      key,
      256
    );
    return hex(bits) === hashHex;
  } catch {
    return false;
  }
}

/* PIN locataires : HMAC-SHA256, format sha256$saltHex$sigHex (inchangé par rapport à Supabase) */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, salt);
  return `sha256$${hex(salt.buffer)}$${hex(sig)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored.startsWith("sha256$")) return false;
  const [, saltHex, sigHex] = stored.split("$");
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, salt);
  return hex(sig) === sigHex;
}

export const uuid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
