/**
 * Accès `localStorage` centralisé : lecture validée, écriture différée,
 * et aucun crash si le stockage est indisponible (navigation privée, quota, SSR).
 *
 * Toutes les clés sont versionnées par leur nom (`_v1`) ET par un champ
 * `version` dans la charge utile, ce qui permet une migration explicite.
 */

const timers = new Map<string, number>();
const pending = new Map<string, string>();

const hasWindow = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/** Écrit tout de suite une valeur (sérialisation JSON). */
export function writeJSONNow(key: string, value: unknown): void {
  if (!hasWindow) return;
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return;
  }
  pending.delete(key);
  window.clearTimeout(timers.get(key));
  timers.delete(key);
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* quota dépassé ou stockage refusé */
  }
}

/**
 * Écrit une valeur après un court délai : un slider de volume ne doit pas
 * déclencher 60 sérialisations par seconde.
 */
export function writeJSON(key: string, value: unknown, debounceMs = 250): void {
  if (!hasWindow) return;
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return;
  }
  pending.set(key, raw);
  window.clearTimeout(timers.get(key));
  if (debounceMs <= 0) {
    flushKey(key);
    return;
  }
  timers.set(key, window.setTimeout(() => flushKey(key), debounceMs));
}

/** Vide la file d'attente d'une clé. */
export function flushKey(key: string): void {
  const raw = pending.get(key);
  if (raw === undefined) return;
  pending.delete(key);
  window.clearTimeout(timers.get(key));
  timers.delete(key);
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* stockage refusé */
  }
}

/** À appeler sur `pagehide` / `beforeunload`. */
export function flushAll(): void {
  for (const key of [...pending.keys()]) flushKey(key);
}

export function removeKey(key: string): void {
  pending.delete(key);
  if (!hasWindow) return;
  window.clearTimeout(timers.get(key));
  timers.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* stockage refusé */
  }
}

/**
 * Lit et valide une charge utile. `parse` reçoit la donnée brute (potentiellement
 * corrompue) et doit renvoyer `null` si elle est inexploitable : l'appelant
 * retombe alors sur ses valeurs par défaut.
 */
export function readJSON<T>(key: string, parse: (value: unknown) => T | null): T | null {
  if (!hasWindow) return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return parse(JSON.parse(raw));
  } catch {
    // JSON illisible : on conserve la valeur corrompue sous un nom de secours
    // plutôt que de l'effacer silencieusement, puis on repart des défauts.
    try {
      localStorage.setItem(`${key}_corrupt`, raw);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function num(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export function int(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return Math.round(num(value, fallback, min, max));
}

export function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
