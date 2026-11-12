/* Client API Barakfix — remplace supabase-js.
   Sessions bailleur : JWT maison stocké en localStorage (30 jours).
   Sessions locataire : inchangées (TENANT_TOKEN_KEY). */

export const OWNER_TOKEN_KEY = "barakfix_owner_token";
export const TENANT_TOKEN_KEY = "barakfix_tenant_token";

export function getOwnerToken(): string | null {
  try {
    return localStorage.getItem(OWNER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setOwnerToken(token: string) {
  try {
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  } catch {}
}

export function clearOwnerToken() {
  try {
    localStorage.removeItem(OWNER_TOKEN_KEY);
  } catch {}
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* Appel générique : POST JSON, lance ApiError si erreur */
export async function apiPost<T = any>(url: string, body: object): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Erreur ${res.status}`, res.status);
  return data as T;
}

/* Gateway bailleur : toutes les actions CRUD passent par /api/owner-data */
export async function ownerApi<T = any>(action: string, extra: object = {}): Promise<T> {
  const token = getOwnerToken();
  if (!token) throw new ApiError("Session expirée, reconnectez-vous", 401);
  return apiPost<T>("/api/owner-data", { token, action, ...extra });
}

/* Auth bailleur */
export async function ownerSignUp(email: string, password: string, fullName: string) {
  const data = await apiPost<{ token: string }>("/api/owner-auth", {
    mode: "signup",
    email,
    password,
    full_name: fullName,
  });
  setOwnerToken(data.token);
}

export async function ownerSignIn(email: string, password: string) {
  const data = await apiPost<{ token: string }>("/api/owner-auth", {
    mode: "login",
    email,
    password,
  });
  setOwnerToken(data.token);
}
