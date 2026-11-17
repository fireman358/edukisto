/* Lib commune — logique pure, testable sans Worker ni D1.
   Argent en centimes, dates en Europe/Bruxelles, CSV sûr. */

export const clampNumber = (value, min, max, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export const cents = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export const fromCents = (value) => Math.round(Number(value) || 0) / 100;

export const money = (value) => fromCents(Math.max(0, cents(value)));

/** Totaux à partir de lignes (qty × prix HT), TVA calculée sur le total HT. */
export function computeLineTotals(lines, rate) {
  const safeRate = clampNumber(rate, 0, 100, 0);
  let htCents = 0;
  for (const line of Array.isArray(lines) ? lines : []) {
    const qty = clampNumber(line?.qty, 0, 100000, 0);
    const price = Math.max(0, cents(line?.prix_ht));
    htCents += Math.round(qty * price);
  }
  const tvaCents = Math.round((htCents * safeRate) / 100);
  return {
    htCents,
    tvaCents,
    ttcCents: htCents + tvaCents,
    ht: fromCents(htCents),
    tva: fromCents(tvaCents),
    ttc: fromCents(htCents + tvaCents),
  };
}

/** Totaux à partir d'un montant TTC saisi : le TTC est conservé à l'identique. */
export function computeTotalsFromTtc(ttc, rate) {
  const safeRate = clampNumber(rate, 0, 100, 0);
  const ttcCents = Math.max(0, cents(ttc));
  const htCents = Math.round(ttcCents / (1 + safeRate / 100));
  const tvaCents = ttcCents - htCents;
  return {
    htCents,
    tvaCents,
    ttcCents,
    ht: fromCents(htCents),
    tva: fromCents(tvaCents),
    ttc: fromCents(ttcCents),
  };
}

/** Normalise les lignes reçues (JSON ou tableau) et supprime les lignes vides. */
export function parseLines(raw) {
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 200)
    .map((line) => ({
      description: String(line?.description ?? "").trim().slice(0, 500),
      qty: clampNumber(line?.qty, 0, 100000, 0),
      prix_ht: fromCents(Math.max(0, cents(line?.prix_ht))),
    }))
    .filter((line) => line.description || line.qty || line.prix_ht);
}

/** Total d'une ligne, pour l'affichage. */
export const lineTotal = (line) =>
  fromCents(Math.round(clampNumber(line?.qty, 0, 100000, 0) * Math.max(0, cents(line?.prix_ht))));

export const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [y, m, d] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export const yearOf = (value) => Number(String(value || "").slice(0, 4)) || new Date().getUTCFullYear();

export function addDays(dateStr, days) {
  if (!isDate(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

/** Date du jour en Europe/Bruxelles (pas UTC). */
export const today = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());

/** Nom lisible sans doublon « Brasserie du Canal — Brasserie du Canal SRL ». */
export function clientDisplayName(nom, societe) {
  const n = String(nom || "").trim();
  const s = String(societe || "").trim();
  if (!s) return n;
  if (!n) return s;
  const norm = (value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const nn = norm(n);
  const ns = norm(s);
  if (nn && ns && (ns.includes(nn) || nn.includes(ns))) return s.length >= n.length ? s : n;
  return `${n} — ${s}`;
}

/** Échappe une cellule CSV et neutralise les formules Excel. */
export function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  if (/[";\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvDocument(header, rows, delimiter = ";") {
  const head = header.map(csvCell).join(delimiter);
  const body = rows.map((row) => row.map(csvCell).join(delimiter)).join("\n");
  return "\uFEFF" + head + "\n" + body + "\n";
}

export const statusLabels = {
  devis: {
    brouillon: "Brouillon",
    envoye: "Envoyé",
    accepte: "Accepté",
    refuse: "Refusé",
    expire: "Expiré",
  },
  facture: {
    a_envoyer: "À envoyer",
    envoyee_peppol: "Envoyée (Peppol)",
    envoyee_email: "Envoyée (e-mail)",
    payee: "Payée",
  },
  client: {
    prospect: "Prospect",
    actif: "Actif",
    inactif: "Inactif",
  },
};
