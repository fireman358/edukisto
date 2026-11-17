/* Redirection de secours si la page a été servie en HTTP (cache edge, etc.). */
if (location.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
  location.replace(`https://${location.host}${location.pathname}${location.search}${location.hash}`);
}

/* SPA Gestion Edukisto — sans dépendance.
   Toutes les données sont injectées via des templates échappés. */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

const TABS = ["dashboard", "clients", "devis", "factures", "prestations", "profil"];
const DEVIS_STATUTS = ["brouillon", "envoye", "accepte", "refuse", "expire"];
const FACTURE_STATUTS = ["a_envoyer", "envoyee_peppol", "envoyee_email", "payee"];
const CLIENT_STATUTS = ["prospect", "actif", "inactif"];
const STATUS_LABELS = {
  devis: { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé", expire: "Expiré" },
  facture: { a_envoyer: "À envoyer", envoyee_peppol: "Envoyée (Peppol)", envoyee_email: "Envoyée (e-mail)", payee: "Payée" },
  client: { prospect: "Prospect", actif: "Actif", inactif: "Inactif" },
};
const STATUS_KIND = {
  brouillon: "neutral",
  envoye: "info",
  accepte: "ok",
  refuse: "danger",
  expire: "warn",
  a_envoyer: "neutral",
  envoyee_peppol: "info",
  envoyee_email: "info",
  payee: "ok",
  prospect: "info",
  actif: "ok",
  inactif: "neutral",
};
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const state = {
  authed: false,
  signup: false,
  tab: "dashboard",
  includeTest: localStorage.getItem("gestion.includeTest") === "1",
  clients: [],
  devis: [],
  factures: [],
  services: [],
  profile: {},
  stats: null,
  filters: { clients: "", clientStatut: "", devis: "", devisStatut: "", factures: "", factureStatut: "", services: "" },
};

/* ------------------------------- Helpers ---------------------------------- */

const fmtEur = (value) =>
  Number(value || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
const fmtDate = (value) => {
  if (!value) return "";
  const date = String(value).slice(0, 10);
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
};
const fmtDateTime = (value) => (value ? String(value).slice(0, 16).replace("T", " ") : "");
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
const addDays = (dateStr, days) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};
const cents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (value) => Math.round(Number(value) || 0) / 100;
const numberValue = (value) => {
  const normalized = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};
const lineTotalCents = (line) => Math.round(numberValue(line.qty) * cents(line.prix_ht));
const safeJsonArray = (value) => { try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const computeTotals = (lines, rate) => {
  const ht = (lines || []).reduce((acc, line) => acc + lineTotalCents(line), 0);
  const tva = Math.round((ht * Number(rate || 0)) / 100);
  return { ht, tva, ttc: ht + tva };
};
const validUntil = (devis) => addDays(devis.date, devis.validite_jours || 0);
const isFranchise = () => (state.profile.tva_regime || "franchise") === "franchise";
const statusLabel = (type, status) => STATUS_LABELS[type]?.[status] || status;
const badge = (type, status, extra = "") =>
  `<span class="badge ${STATUS_KIND[status] || "neutral"} ${extra}">${esc(statusLabel(type, status))}</span>`;
const testBadge = (doc) => (Number(doc?.est_test) ? '<span class="badge test">TEST</span>' : "");
const clientName = (client) => {
  if (!client) return "";
  const nom = String(client.nom || "").trim();
  const societe = String(client.societe || "").trim();
  return societe || nom;
};
const clientSearch = (client) =>
  [client.nom, client.societe, client.email, client.tel, client.tva].filter(Boolean).join(" ").toLowerCase();
const clientById = (id) => state.clients.find((client) => client.id === id) || null;
const devisById = (id) => state.devis.find((devis) => devis.id === id) || null;
const factureById = (id) => state.factures.find((facture) => facture.id === id) || null;

function pageHead(title, subtitle, actions = "") {
  return `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="page-actions">${actions}</div></div>`;
}
const emptyState = (title, text, action = "") =>
  `<div class="empty"><strong>${esc(title)}</strong><span>${esc(text)}</span>${action ? `<div>${action}</div>` : ""}</div>`;

function toast(message, type = "success") {
  const root = $("#toasts");
  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.textContent = message;
  root.appendChild(element);
  setTimeout(() => element.remove(), 4200);
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch("/api/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "me") {
    showLogin(true);
    throw new Error("Session expirée — reconnectez-vous.");
  }
  if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
  return data;
}

function exportUrl(type) {
  const params = new URLSearchParams({ type });
  if (state.includeTest) params.set("include_test", "1");
  return `/api/export?${params.toString()}`;
}

/* -------------------------------- Dialog ---------------------------------- */

function openDialog({ title, sub = "", body, submitLabel = "Enregistrer", onSubmit, wide = false, danger = false }) {
  const dialog = $("#dialog");
  if (dialog.open) dialog.close();
  dialog.classList.toggle("wide", wide);
  dialog.innerHTML = `<form class="dialog-card" method="dialog">
    <div class="dialog-head"><div><h2>${esc(title)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div><button type="button" class="dialog-close" data-close aria-label="Fermer">✕</button></div>
    <div class="dialog-body">${body}</div>
    <div class="dialog-actions"><button type="button" class="btn ghost" data-close>Annuler</button><button type="submit" class="btn ${danger ? "danger" : "primary"}">${esc(submitLabel)}</button></div>
  </form>`;
  const form = dialog.querySelector("form");
  dialog.showModal();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await onSubmit(form);
      if (dialog.open) dialog.close();
    } catch (error) {
      toast(error.message || "Erreur", "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  setTimeout(() => {
    const first = form.querySelector("input:not([type=hidden]):not([type=checkbox]), select, textarea");
    if (first) first.focus();
  }, 30);
  return { dialog, form };
}

function confirmDialog({ title = "Confirmer", message, confirmLabel = "Confirmer", danger = true }) {
  return new Promise((resolve) => {
    const dialog = $("#dialog");
    if (dialog.open) dialog.close();
    dialog.classList.remove("wide");
    dialog.innerHTML = `<div class="dialog-card dialog-narrow">
      <div class="dialog-head"><h2>${esc(title)}</h2><button type="button" class="dialog-close" data-cancel aria-label="Fermer">✕</button></div>
      <div class="dialog-body"><p>${esc(message)}</p></div>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-cancel>Annuler</button><button type="button" class="btn ${danger ? "danger" : "primary"}" data-confirm>${esc(confirmLabel)}</button></div>
    </div>`;
    dialog.showModal();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close();
      resolve(value);
    };
    dialog.querySelector("[data-confirm]").addEventListener("click", () => finish(true));
    dialog.querySelectorAll("[data-cancel]").forEach((button) => button.addEventListener("click", () => finish(false)));
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(false);
    }, { once: true });
    dialog.addEventListener("close", () => finish(false), { once: true });
  });
}

/* -------------------------------- Login ----------------------------------- */

function showLogin(configured) {
  state.authed = false;
  state.signup = !configured;
  $("#view-login").classList.remove("hidden");
  $("#view-app").classList.add("hidden");
  $("#btn-logout").classList.add("hidden");
  $(".test-toggle").classList.add("hidden");
  $("#login-hint").textContent = configured
    ? "Mot de passe de l'espace gestion."
    : "Première utilisation : choisis le mot de passe de l'espace (10 caractères minimum).";
  $("#login-submit").textContent = configured ? "Se connecter" : "Créer le mot de passe";
  $("#login-error").textContent = "";
  $("#login-password").value = "";
  $("#login-password").setAttribute("minlength", "10");
  $("#login-password").focus();
}

function showApp() {
  state.authed = true;
  $("#view-login").classList.add("hidden");
  $("#view-app").classList.remove("hidden");
  $("#btn-logout").classList.remove("hidden");
  $(".test-toggle").classList.remove("hidden");
  $("#include-test").checked = state.includeTest;
}

async function enterApp() {
  showApp();
  await loadAll();
  const hashTab = location.hash.replace(/^#\/?/, "");
  state.tab = TABS.includes(hashTab) ? hashTab : "dashboard";
  render();
}

/* -------------------------------- Data ------------------------------------ */

async function loadAll() {
  const suffix = `?include_test=${state.includeTest ? "1" : "0"}`;
  const [profile, clients, devis, factures, services, stats] = await Promise.all([
    api("profile"),
    api("clients"),
    api("devis"),
    api("factures"),
    api("services"),
    api(`stats${suffix}`),
  ]);
  state.profile = profile;
  state.clients = clients;
  state.devis = devis;
  state.factures = factures;
  state.services = services;
  state.stats = stats;
}

async function refresh() {
  try {
    await loadAll();
    render();
  } catch (error) {
    toast(error.message, "error");
  }
}

/* -------------------------------- Render ---------------------------------- */

function renderTabs() {
  $$(".tabs button").forEach((button) => {
    const selected = button.dataset.tab === state.tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
}

function navigate(tab) {
  if (!TABS.includes(tab)) tab = "dashboard";
  if (state.tab === tab) {
    render();
    return;
  }
  state.tab = tab;
  if (location.hash !== `#/${tab}`) location.hash = `#/${tab}`;
  render();
}

function render() {
  if (!state.authed) return;
  renderTabs();
  document.title = `${state.tab === "dashboard" ? "Tableau de bord" : state.tab[0].toUpperCase() + state.tab.slice(1)} — Gestion Edukisto`;
  const content = $("#tab-content");
  if (state.tab === "dashboard") renderDashboard(content);
  else if (state.tab === "clients") renderClients(content);
  else if (state.tab === "devis") renderDevis(content);
  else if (state.tab === "factures") renderFactures(content);
  else if (state.tab === "prestations") renderPrestations(content);
  else renderProfil(content);
}

/* ------------------------------- Dashboard -------------------------------- */

function renderDashboard(root) {
  const stats = state.stats;
  if (!stats) {
    root.innerHTML = '<div class="card"><p class="muted">Chargement…</p></div>';
    return;
  }
  const actions = [
    {
      action: "open-factures",
      filter: "a_envoyer",
      label: "À envoyer",
      value: `${stats.nb_a_envoyer}`,
      sub: fmtEur(stats.ca_a_envoyer),
      className: "info",
    },
    {
      action: "open-factures",
      filter: "en_retard",
      label: "En retard",
      value: `${stats.nb_en_retard}`,
      sub: fmtEur(stats.en_retard),
      className: "danger",
    },
    {
      action: "open-devis",
      filter: "a_relancer",
      label: "Devis à relancer",
      value: `${stats.devis_a_relancer.length}`,
      sub: "sans réponse ou proche de l'échéance",
      className: "warn",
    },
  ];
  const chart = renderChart(stats.ca_par_mois || []);
  const franchise = stats.franchise || {};
  const gaugeClass = franchise.pourcentage >= 100 ? "danger" : franchise.pourcentage >= 80 ? "warn" : "";
  const lists = `
    ${listCard("Factures en retard", stats.a_relancer, (facture) => invoiceRow(facture, true), "Aucune facture en retard.", "edit-facture", "facture")}
    ${listCard("Factures à envoyer", stats.a_envoyer, (facture) => invoiceRow(facture, false), "Aucune facture à envoyer.", "edit-facture", "facture")}
    ${listCard("Devis à relancer", stats.devis_a_relancer, (devis) => quoteRow(devis), "Aucun devis en attente.", "edit-devis", "devis")}
  `;

  root.innerHTML = `
    ${pageHead("Tableau de bord", "Ce qui est encaissé, ce qui reste à faire, et où en sont tes devis.", `
      <button class="btn secondary" type="button" data-action="new-devis">+ Devis</button>
      <button class="btn primary" type="button" data-action="new-facture">+ Facture</button>
    `)}
    <div class="grid action-grid">
      ${actions.map((item) => `<button class="action-card ${item.className}" type="button" data-action="${item.action}" data-filter="${item.filter}">
        <span class="label">${esc(item.label)}</span><span class="big">${esc(item.value)}</span><span class="stat-sub">${esc(item.sub)}</span>
      </button>`).join("")}
    </div>
    <div class="stats-grid grid mt">
      <div class="stat"><div class="stat-label">CA encaissé ce mois</div><div class="stat-value">${fmtEur(stats.ca_paye_mois)}</div><div class="stat-sub">${stats.nb_paye_mois} facture(s) payée(s)</div></div>
      <div class="stat"><div class="stat-label">CA encaissé cette année</div><div class="stat-value">${fmtEur(stats.ca_paye_annee)}</div><div class="stat-sub">depuis le 1er janvier</div></div>
      <div class="stat"><div class="stat-label">En attente de paiement</div><div class="stat-value">${fmtEur(stats.ca_en_attente)}</div><div class="stat-sub">${stats.nb_en_attente} facture(s) envoyée(s)</div></div>
      <div class="stat"><div class="stat-label">En retard</div><div class="stat-value ${stats.nb_en_retard ? "danger" : ""}">${fmtEur(stats.en_retard)}</div><div class="stat-sub">${stats.nb_en_retard} facture(s)</div></div>
    </div>
    <div class="grid two-col">
      <div>
        <div class="card">
          <div class="card-head"><h2>À faire maintenant</h2><span class="muted small">${stats.nb_clients} client(s) · ${stats.nb_clients_actifs} actif(s)</span></div>
          ${lists}
        </div>
      </div>
      <div>
        ${franchise.regime === "franchise" ? `<div class="card">
          <div class="card-head"><h3>Seuil de franchise</h3><span class="muted small">${franchise.pourcentage}%</span></div>
          <div class="gauge"><div class="gauge-bar"><div class="gauge-fill ${gaugeClass}" style="width:${Math.min(100, franchise.pourcentage)}%"></div></div>
          <div class="gauge-legend"><span>${fmtEur(franchise.ca_annee_ht)} facturés</span><span>${fmtEur(franchise.seuil)}</span></div></div>
          <p class="muted small mt">${franchise.pourcentage >= 80 ? "Attention : tu approches du seuil. Vérifie avec ton comptable." : "Le seuil se calcule sur le chiffre d'affaires HTVA de l'année civile."}</p>
        </div>` : ""}
        <div class="card">
          <div class="card-head"><h3>Encaissements (6 mois)</h3></div>
          ${chart}
        </div>
        <div class="card">
          <div class="card-head"><h3>Exports</h3></div>
          <p class="small"><a href="${exportUrl("clients")}" download>Clients</a> · <a href="${exportUrl("devis")}" download>Devis</a> · <a href="${exportUrl("factures")}" download>Factures</a> · <a href="${exportUrl("services")}" download>Prestations</a></p>
          <p class="muted small mt">Sauvegarde : exporte régulièrement la base complète depuis le README, ou configure une copie D1.</p>
        </div>
      </div>
    </div>
  `;
}

function listCard(title, items, row, emptyText, action, type) {
  return `<div class="card" style="margin-top:12px">
    <div class="card-head"><h3>${esc(title)}</h3><span class="muted small">${items.length}</span></div>
    ${items.length ? `<div class="list">${items.slice(0, 5).map((item) => row(item)).join("")}</div>` : `<p class="muted small">${esc(emptyText)}</p>`}
  </div>`;
}

function invoiceRow(facture, late) {
  return `<div class="list-row">
    <div class="main"><strong>${esc(facture.numero)} — ${esc(facture.client_societe || facture.client_nom || "")}</strong>
      <span>${late ? `Échéance ${fmtDate(facture.echeance)}${facture.jours_retard > 0 ? ` · ${facture.jours_retard} j de retard` : ""}` : `Créée le ${fmtDate(facture.date)}`}</span></div>
    <div class="side"><strong>${fmtEur(facture.total_ttc)}</strong><button class="link small" type="button" data-action="edit-facture" data-id="${esc(facture.id)}">Ouvrir</button></div>
  </div>`;
}

function quoteRow(devis) {
  const days = Number(devis.jours_restants);
  return `<div class="list-row">
    <div class="main"><strong>${esc(devis.numero)} — ${esc(devis.client_societe || devis.client_nom || "")}</strong>
      <span>${days < 0 ? `Expiré depuis ${Math.abs(days)} j` : `Valable encore ${days} j`} · ${fmtDate(devis.valid_until)}</span></div>
    <div class="side"><strong>${fmtEur(devis.total_ttc)}</strong><button class="link small" type="button" data-action="edit-devis" data-id="${esc(devis.id)}">Ouvrir</button></div>
  </div>`;
}

function renderChart(data) {
  if (!data.length) return '<p class="muted small">Pas encore d\'encaissement.</p>';
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  return `<div class="chart">${data.map((item) => {
    const value = Number(item.value) || 0;
    const height = value > 0 ? Math.max(4, Math.round((value / max) * 100)) : 2;
    const [year, month] = item.mois.split("-");
    return `<div class="bar" title="${esc(fmtEur(value))}"><span class="bar-value">${value ? fmtEur(value) : ""}</span><div class="bar-fill" style="height:${height}%"></div><span class="bar-label">${MONTHS[Number(month) - 1]} ${year.slice(2)}</span></div>`;
  }).join("")}</div>`;
}

/* --------------------------------- Clients -------------------------------- */

function renderClients(root) {
  const list = state.clients.filter((client) => state.includeTest || !Number(client.est_test));
  root.innerHTML = `
    ${pageHead("Clients", `${list.length} client(s) — prospects, actifs et inactifs.`, '<button class="btn primary" type="button" data-action="new-client">+ Nouveau client</button>')}
    <div class="toolbar">
      <div class="toolbar-group">
        <input type="search" class="search" id="client-search" placeholder="Rechercher un client…" value="${esc(state.filters.clients)}" aria-label="Rechercher un client">
        <select id="client-statut" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          ${CLIENT_STATUTS.map((statut) => `<option value="${statut}" ${state.filters.clientStatut === statut ? "selected" : ""}>${statusLabel("client", statut)}</option>`).join("")}
        </select>
      </div>
      <span class="muted small" id="clients-count">${list.length} client(s)</span>
    </div>
    <div class="card table-card"><div class="table-wrap">
      <table class="responsive" aria-label="Liste des clients">
        <thead><tr><th>Nom</th><th>Type</th><th>Contact</th><th class="right">CA payé</th><th>Documents</th><th>Statut</th><th></th></tr></thead>
        <tbody id="clients-body">
          ${list.map((client) => `<tr data-row data-test="${Number(client.est_test)}" data-statut="${esc(client.statut)}" data-search="${esc(clientSearch(client))}">
            <td data-label="Nom"><button class="link" type="button" data-action="edit-client" data-id="${esc(client.id)}">${esc(client.nom)}</button>${client.societe ? `<span class="sub">${esc(client.societe)}</span>` : ""}${testBadge(client)}</td>
            <td data-label="Type">${client.type === "b2b" ? "B2B" : "B2C"}</td>
            <td data-label="Contact">${esc(client.email || "—")}<span class="sub">${esc(client.tel || "")}</span></td>
            <td data-label="CA payé" class="right money">${fmtEur(client.ca_total)}</td>
            <td data-label="Documents">${client.nb_devis} devis · ${client.nb_factures} fact.</td>
            <td data-label="Statut">${badge("client", client.statut)}${Number(client.en_retard) ? ' <span class="badge danger">retard</span>' : ""}</td>
            <td data-label="" class="row-actions">${actionsMenu([
              { label: "Modifier", action: "edit-client", id: client.id },
              { label: "Nouveau devis", action: "new-devis", id: client.id, client: true },
              { label: "Nouvelle facture", action: "new-facture", id: client.id, client: true },
              { label: "Supprimer", action: "delete-client", id: client.id, danger: true },
            ])}</td>
          </tr>`).join("") || `<tr><td colspan="7">${emptyState("Aucun client", "Crée ton premier client pour commencer.", '<button class="btn primary" type="button" data-action="new-client">+ Nouveau client</button>')}</td></tr>`}
        </tbody>
      </table>
    </div></div>`;
  $("#client-search").addEventListener("input", (event) => {
    state.filters.clients = event.target.value;
    applyClientFilter();
  });
  $("#client-statut").addEventListener("change", (event) => {
    state.filters.clientStatut = event.target.value;
    applyClientFilter();
  });
  applyClientFilter();
}

function applyClientFilter() {
  const query = state.filters.clients.trim().toLowerCase();
  const statut = state.filters.clientStatut;
  let visible = 0;
  $$("#clients-body tr[data-row]").forEach((row) => {
    const show = (state.includeTest || row.dataset.test !== "1") && (!query || row.dataset.search.includes(query)) && (!statut || row.dataset.statut === statut);
    row.hidden = !show;
    if (show) visible += 1;
  });
  const count = $("#clients-count");
  if (count) count.textContent = `${visible} client(s)`;
}

/* ---------------------------------- Devis --------------------------------- */

function renderDevis(root) {
  const list = state.devis.filter((devis) => state.includeTest || !Number(devis.est_test));
  root.innerHTML = `
    ${pageHead("Devis", `${list.length} devis — brouillons, envoyés, acceptés.`, `
      <button class="btn secondary" type="button" data-action="quick-devis">⚡ Devis rapide</button>
      <button class="btn primary" type="button" data-action="new-devis">+ Nouveau devis</button>
    `)}
    <div class="toolbar">
      <div class="toolbar-group">
        <input type="search" class="search" id="devis-search" placeholder="Rechercher un devis, un client…" value="${esc(state.filters.devis)}" aria-label="Rechercher un devis">
        <select id="devis-statut" aria-label="Filtrer les devis">
          <option value="">Tous les statuts</option>
          ${DEVIS_STATUTS.map((statut) => `<option value="${statut}" ${state.filters.devisStatut === statut ? "selected" : ""}>${statusLabel("devis", statut)}</option>`).join("")}
          <option value="a_relancer" ${state.filters.devisStatut === "a_relancer" ? "selected" : ""}>À relancer</option>
        </select>
      </div>
      <span class="muted small" id="devis-count">${list.length} devis</span>
    </div>
    <div class="card table-card"><div class="table-wrap">
      <table class="responsive" aria-label="Liste des devis">
        <thead><tr><th>N°</th><th>Client</th><th>Date</th><th>Statut</th><th class="right">TTC</th><th>Validité</th><th></th></tr></thead>
        <tbody id="devis-body">
          ${list.map((devis) => {
            const until = validUntil(devis);
            const days = Math.round((Date.parse(until) - Date.parse(todayStr())) / 86400000);
            const relance = devis.statut === "envoye" && days <= 7;
            return `<tr data-row data-test="${Number(devis.est_test)}" data-statut="${esc(devis.statut)}" data-relance="${relance ? 1 : 0}" data-search="${esc(`${devis.numero} ${devis.client_nom || ""} ${devis.client_societe || ""}`.toLowerCase())}">
              <td data-label="N°"><strong class="num">${esc(devis.numero)}</strong>${testBadge(devis)}${devis.facture_numero ? `<span class="sub">Facture ${esc(devis.facture_numero)}</span>` : ""}</td>
              <td data-label="Client">${esc(devis.client_societe || devis.client_nom || "")}<span class="sub">${devis.client_societe ? esc(devis.client_nom || "") : ""}</span></td>
              <td data-label="Date">${fmtDate(devis.date)}</td>
              <td data-label="Statut">${badge("devis", devis.statut)}${relance ? ' <span class="badge warn">à relancer</span>' : ""}</td>
              <td data-label="TTC" class="right money">${fmtEur(devis.total_ttc)}</td>
              <td data-label="Validité">${fmtDate(until)}<span class="sub">${days < 0 ? `expiré depuis ${Math.abs(days)} j` : `${days} j restants`}</span></td>
              <td data-label="" class="row-actions">${actionsMenu([
                { label: "PDF", href: `/document.html?type=devis&id=${encodeURIComponent(devis.id)}` },
                { label: "Modifier", action: "edit-devis", id: devis.id },
                { label: "Dupliquer", action: "duplicate-devis", id: devis.id },
                { label: "Facturer", action: "facturer-devis", id: devis.id, disabled: Boolean(devis.facture_id) || ["refuse", "expire"].includes(devis.statut) },
                { label: "Supprimer", action: "delete-devis", id: devis.id, danger: true },
              ])}</td>
            </tr>`;
          }).join("") || `<tr><td colspan="7">${emptyState("Aucun devis", "Crée un devis en deux minutes avec le catalogue de prestations.", '<button class="btn primary" type="button" data-action="new-devis">+ Nouveau devis</button>')}</td></tr>`}
        </tbody>
      </table>
    </div></div>`;
  $("#devis-search").addEventListener("input", (event) => {
    state.filters.devis = event.target.value;
    applyDevisFilter();
  });
  $("#devis-statut").addEventListener("change", (event) => {
    state.filters.devisStatut = event.target.value;
    applyDevisFilter();
  });
  applyDevisFilter();
}

function applyDevisFilter() {
  const query = state.filters.devis.trim().toLowerCase();
  const statut = state.filters.devisStatut;
  let visible = 0;
  $$("#devis-body tr[data-row]").forEach((row) => {
    const show =
      (state.includeTest || row.dataset.test !== "1") &&
      (!query || row.dataset.search.includes(query)) &&
      (!statut || (statut === "a_relancer" ? row.dataset.relance === "1" : row.dataset.statut === statut));
    row.hidden = !show;
    if (show) visible += 1;
  });
  const count = $("#devis-count");
  if (count) count.textContent = `${visible} devis`;
}

/* -------------------------------- Factures -------------------------------- */

function renderFactures(root) {
  const list = state.factures.filter((facture) => state.includeTest || !Number(facture.est_test));
  root.innerHTML = `
    ${pageHead("Factures", `${list.length} facture(s) — suivi d'envoi et de paiement.`, `
      <button class="btn secondary" type="button" data-action="quick-facture">⚡ Facture rapide</button>
      <button class="btn primary" type="button" data-action="new-facture">+ Nouvelle facture</button>
    `)}
    <div class="toolbar">
      <div class="toolbar-group">
        <input type="search" class="search" id="factures-search" placeholder="Rechercher une facture, un client…" value="${esc(state.filters.factures)}" aria-label="Rechercher une facture">
        <select id="factures-statut" aria-label="Filtrer les factures">
          <option value="">Tous les statuts</option>
          ${FACTURE_STATUTS.map((statut) => `<option value="${statut}" ${state.filters.factureStatut === statut ? "selected" : ""}>${statusLabel("facture", statut)}</option>`).join("")}
          <option value="en_retard" ${state.filters.factureStatut === "en_retard" ? "selected" : ""}>En retard</option>
        </select>
      </div>
      <span class="muted small" id="factures-count">${list.length} facture(s)</span>
    </div>
    <div class="card table-card"><div class="table-wrap">
      <table class="responsive" aria-label="Liste des factures">
        <thead><tr><th>N°</th><th>Client</th><th>Échéance</th><th>Statut</th><th class="right">TTC</th><th></th></tr></thead>
        <tbody id="factures-body">
          ${list.map((facture) => `<tr data-row data-test="${Number(facture.est_test)}" data-statut="${esc(facture.statut)}" data-retard="${Number(facture.en_retard)}" data-search="${esc(`${facture.numero} ${facture.numero_externe || ""} ${facture.client_nom || ""} ${facture.client_societe || ""}`.toLowerCase())}">
            <td data-label="N°"><strong class="num">${esc(facture.numero)}</strong>${testBadge(facture)}${facture.numero_externe ? `<span class="sub">Accountable ${esc(facture.numero_externe)}</span>` : ""}</td>
            <td data-label="Client">${esc(facture.client_societe || facture.client_nom || "")}<span class="sub">${facture.client_societe ? esc(facture.client_nom || "") : ""}</span></td>
            <td data-label="Échéance">${fmtDate(facture.echeance)}${Number(facture.en_retard) ? ' <span class="badge danger">retard</span>' : ""}${facture.relance_le ? `<span class="sub">relancée le ${fmtDate(facture.relance_le)}</span>` : ""}</td>
            <td data-label="Statut">${badge("facture", facture.statut)}</td>
            <td data-label="TTC" class="right money">${fmtEur(facture.total_ttc)}</td>
            <td data-label="" class="row-actions">${actionsMenu([
              { label: "PDF", href: `/document.html?type=facture&id=${encodeURIComponent(facture.id)}` },
              { label: "Modifier", action: "edit-facture", id: facture.id },
              { label: "Dupliquer", action: "duplicate-facture", id: facture.id },
              { label: "Marquer payée", action: "mark-paid", id: facture.id, disabled: facture.statut === "payee" },
              { label: "Relancer", action: "relance-facture", id: facture.id, disabled: !["envoyee_peppol", "envoyee_email"].includes(facture.statut) },
              { label: "Supprimer", action: "delete-facture", id: facture.id, danger: true },
            ])}</td>
          </tr>`).join("") || `<tr><td colspan="6">${emptyState("Aucune facture", "Crée une facture ou facture un devis accepté.", '<button class="btn primary" type="button" data-action="new-facture">+ Nouvelle facture</button>')}</td></tr>`}
        </tbody>
      </table>
    </div></div>`;
  $("#factures-search").addEventListener("input", (event) => {
    state.filters.factures = event.target.value;
    applyFactureFilter();
  });
  $("#factures-statut").addEventListener("change", (event) => {
    state.filters.factureStatut = event.target.value;
    applyFactureFilter();
  });
  applyFactureFilter();
}

function applyFactureFilter() {
  const query = state.filters.factures.trim().toLowerCase();
  const statut = state.filters.factureStatut;
  let visible = 0;
  $$("#factures-body tr[data-row]").forEach((row) => {
    const show =
      (state.includeTest || row.dataset.test !== "1") &&
      (!query || row.dataset.search.includes(query)) &&
      (!statut || (statut === "en_retard" ? row.dataset.retard === "1" : row.dataset.statut === statut));
    row.hidden = !show;
    if (show) visible += 1;
  });
  const count = $("#factures-count");
  if (count) count.textContent = `${visible} facture(s)`;
}

/* ------------------------------- Prestations ------------------------------- */

function renderPrestations(root) {
  const list = state.services.filter((service) => !state.filters.services || service.description.toLowerCase().includes(state.filters.services.toLowerCase()));
  root.innerHTML = `
    ${pageHead("Prestations", "Le catalogue qui pré-remplit les lignes de devis et de factures.", '<button class="btn primary" type="button" data-action="new-service">+ Nouvelle prestation</button>')}
    <div class="toolbar">
      <div class="toolbar-group"><input type="search" class="search" id="service-search" placeholder="Rechercher une prestation…" value="${esc(state.filters.services)}" aria-label="Rechercher une prestation"></div>
      <span class="muted small">${list.length} prestation(s)</span>
    </div>
    <div class="card table-card"><div class="table-wrap">
      <table class="responsive" aria-label="Catalogue de prestations">
        <thead><tr><th>Description</th><th class="right">Prix HT</th><th>TVA</th><th>Unité</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          ${list.map((service) => `<tr data-row data-test="0" data-statut="${service.actif ? "actif" : "inactif"}">
            <td data-label="Description"><strong>${esc(service.description)}</strong></td>
            <td data-label="Prix HT" class="right money">${fmtEur(service.prix_ht)}</td>
            <td data-label="TVA">${Number(service.taux_tva)} %</td>
            <td data-label="Unité">${esc(service.unite || "—")}</td>
            <td data-label="Statut">${service.actif ? '<span class="badge ok">Active</span>' : '<span class="badge neutral">Inactive</span>'}</td>
            <td data-label="" class="row-actions">${actionsMenu([
              { label: "Modifier", action: "edit-service", id: service.id },
              { label: "Supprimer", action: "delete-service", id: service.id, danger: true },
            ])}</td>
          </tr>`).join("") || `<tr><td colspan="6">${emptyState("Catalogue vide", "Ajoute tes prestations récurrentes : installation, sauvegarde, site web, cours…", '<button class="btn primary" type="button" data-action="new-service">+ Nouvelle prestation</button>')}</td></tr>`}
        </tbody>
      </table>
    </div></div>`;
  $("#service-search").addEventListener("input", (event) => {
    state.filters.services = event.target.value;
    renderPrestations(root);
    const input = $("#service-search");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
}

/* --------------------------------- Profil --------------------------------- */

function renderProfil(root) {
  const profile = state.profile || {};
  root.innerHTML = `
    ${pageHead("Mon profil", "Coordonnées imprimées sur les devis et les copies de factures.", "")}
    <div class="card">
      <form data-form="profile">
        <div class="form-grid">
          <div class="field full"><label for="p-nom">Nom / entreprise</label><input id="p-nom" type="text" value="${esc(profile.nom || "")}" placeholder="Edukisto — David Demoulin"></div>
          <div class="field full"><label for="p-adresse">Adresse</label><textarea id="p-adresse" rows="2">${esc(profile.adresse || "")}</textarea></div>
          <div class="field"><label for="p-bce">N° entreprise (BCE)</label><input id="p-bce" type="text" value="${esc(profile.bce || "")}" placeholder="BE 0892.739.993"></div>
          <div class="field"><label for="p-tva">N° TVA (si assujetti)</label><input id="p-tva" type="text" value="${esc(profile.tva || "")}" placeholder="BE0123456789"></div>
          <div class="field"><label for="p-regime">Régime TVA</label><select id="p-regime"><option value="franchise" ${profile.tva_regime !== "assujetti" ? "selected" : ""}>Franchise — art. 56bis</option><option value="assujetti" ${profile.tva_regime === "assujetti" ? "selected" : ""}>Assujetti à la TVA</option></select></div>
          <div class="field"><label for="p-seuil">Seuil de franchise (€ HTVA)</label><input id="p-seuil" type="number" min="0" step="100" value="${esc(profile.seuil_franchise || "25000")}"><span class="hint">25 000 € en 2026, 26 000 € en 2027.</span></div>
          <div class="field"><label for="p-iban">IBAN</label><input id="p-iban" type="text" value="${esc(profile.iban || "")}" placeholder="BE68 5390 0754 7034"></div>
          <div class="field"><label for="p-site">Site</label><input id="p-site" type="text" value="${esc(profile.site || "")}" placeholder="edukisto.win"></div>
          <div class="field"><label for="p-email">E-mail</label><input id="p-email" type="email" value="${esc(profile.email || "")}"></div>
          <div class="field"><label for="p-tel">Téléphone</label><input id="p-tel" type="tel" value="${esc(profile.tel || "")}"></div>
          <div class="field full"><label for="p-mentions">Mentions en pied de page</label><textarea id="p-mentions" rows="3" placeholder="Paiement à 30 jours sur IBAN…">${esc(profile.mentions || "")}</textarea></div>
        </div>
        <div class="dialog-actions" style="padding:14px 0 0;border:0;background:none"><button class="btn primary" type="submit">Enregistrer le profil</button></div>
      </form>
    </div>
    <div class="card">
      <h2>Sécurité</h2>
      <p class="muted small">Change le mot de passe ou révoque toutes les sessions ouvertes (autres appareils).</p>
      <form data-form="password" class="form-grid mt">
        <div class="field"><label for="p-current">Mot de passe actuel</label><input id="p-current" type="password" autocomplete="current-password" required></div>
        <div class="field"><label for="p-new">Nouveau mot de passe</label><input id="p-new" type="password" autocomplete="new-password" minlength="10" required><span class="hint">10 caractères minimum.</span></div>
        <div class="field"><label for="p-confirm">Confirmer</label><input id="p-confirm" type="password" autocomplete="new-password" minlength="10" required></div>
        <div class="field" style="justify-content:flex-end"><button class="btn secondary" type="submit">Changer le mot de passe</button></div>
      </form>
      <div class="dialog-actions" style="padding:14px 0 0;border:0;background:none;justify-content:flex-start">
        <button class="btn danger" type="button" data-action="logout-all">Déconnecter toutes les sessions</button>
      </div>
    </div>
    <div class="card">
      <h2>Données</h2>
      <p class="small">Exports CSV : <a href="${exportUrl("clients")}" download>clients</a> · <a href="${exportUrl("devis")}" download>devis</a> · <a href="${exportUrl("factures")}" download>factures</a> · <a href="${exportUrl("services")}" download>prestations</a>.</p>
      <p class="muted small mt">Les documents marqués TEST sont exclus par défaut des statistiques et des exports.</p>
    </div>`;
}

/* -------------------------------- Menus ----------------------------------- */

function actionsMenu(items) {
  const filtered = items.filter(Boolean);
  return `<details class="menu"><summary aria-label="Actions" title="Actions">⋯</summary><div class="menu-panel">${filtered
    .map((item) => {
      if (item.href) return `<a class="menu-item" href="${esc(item.href)}" target="_blank" rel="noopener">${esc(item.label)}</a>`;
      const attrs = [`data-action="${esc(item.action)}"`, item.id ? `data-id="${esc(item.id)}"` : "", item.client ? 'data-client="1"' : ""].filter(Boolean).join(" ");
      return `<button class="menu-item ${item.danger ? "danger" : ""}" type="button" ${attrs} ${item.disabled ? "disabled" : ""}>${esc(item.label)}</button>`;
    })
    .join("")}</div></details>`;
}

/* --------------------------------- Forms ---------------------------------- */

function field(label, id, input, hint = "") {
  return `<div class="field"><label for="${id}">${esc(label)}</label>${input}${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</div>`;
}

function clientForm(client) {
  const c = client || { type: "b2c", statut: "actif" };
  return `<div class="form-grid">
    ${field("Nom *", "c-nom", `<input id="c-nom" name="nom" type="text" value="${esc(c.nom || "")}" required maxlength="200" autocomplete="name">`)}
    ${field("Société", "c-societe", `<input id="c-societe" name="societe" type="text" value="${esc(c.societe || "")}" maxlength="200" autocomplete="organization">`)}
    ${field("E-mail", "c-email", `<input id="c-email" name="email" type="email" value="${esc(c.email || "")}" maxlength="200" autocomplete="email">`)}
    ${field("Téléphone", "c-tel", `<input id="c-tel" name="tel" type="tel" value="${esc(c.tel || "")}" maxlength="60" autocomplete="tel">`)}
    <div class="field full"><label for="c-adresse">Adresse</label><textarea id="c-adresse" name="adresse" rows="3" maxlength="1000" placeholder="Rue, code postal, ville, pays">${esc(c.adresse || "")}</textarea></div>
    ${field("Type", "c-type", `<select id="c-type" name="type"><option value="b2c" ${c.type !== "b2b" ? "selected" : ""}>B2C — particulier</option><option value="b2b" ${c.type === "b2b" ? "selected" : ""}>B2B — professionnel</option></select>`)}
    ${field("Statut", "c-statut", `<select id="c-statut" name="statut">${CLIENT_STATUTS.map((statut) => `<option value="${statut}" ${c.statut === statut ? "selected" : ""}>${statusLabel("client", statut)}</option>`).join("")}</select>`)}
    ${field("N° TVA", "c-tva", `<input id="c-tva" name="tva" type="text" value="${esc(c.tva || "")}" maxlength="40" placeholder="BE0123456789">`)}
    ${field("Endpoint Peppol", "c-peppol", `<input id="c-peppol" name="peppol_id" type="text" value="${esc(c.peppol_id || "")}" maxlength="100" placeholder="0208:0123456789">`)}
    <div class="field full"><label for="c-notes">Notes</label><textarea id="c-notes" name="notes" rows="3" maxlength="5000" placeholder="Contexte, préférences, historique…">${esc(c.notes || "")}</textarea></div>
    <div class="field full"><label class="check"><input id="c-test" name="est_test" type="checkbox" ${Number(c.est_test) ? "checked" : ""}> Client de test / exemple (exclu des statistiques)</label></div>
  </div>`;
}

function tvaOptions(current, disabled = false) {
  return [21, 12, 6, 0]
    .map((rate) => `<option value="${rate}" ${Number(current) === rate ? "selected" : ""}>${rate} %${rate === 0 ? " — franchise" : ""}</option>`)
    .join("");
}

function linesEditorHtml(lines, services) {
  const options = services.filter((service) => service.actif).map((service) => `<option value="${esc(service.id)}">${esc(service.description)} — ${fmtEur(service.prix_ht)}</option>`).join("");
  return `<div id="lines-editor">
    <div class="line-head"><span>Description</span><span>Qté</span><span>Prix HT</span><span>Total</span><span></span></div>
    <div class="lines" data-lines></div>
    <div class="line-actions">
      <button class="btn secondary small" type="button" data-add-line>+ Ajouter une ligne</button>
      ${options ? `<select data-add-service aria-label="Ajouter une prestation du catalogue"><option value="">Ajouter depuis le catalogue…</option>${options}</select>` : ""}
    </div>
    <div class="totals-preview" data-totals></div>
  </div>`;
}

function setupLines(container, initialLines, rate, services) {
  let lines = (initialLines && initialLines.length ? initialLines : [{ description: "", qty: 1, prix_ht: 0 }]).map((line) => ({
    description: String(line.description || ""),
    qty: Number(line.qty ?? 1),
    prix_ht: Number(line.prix_ht || 0),
  }));
  let currentRate = Number(rate || 0);
  const list = container.querySelector("[data-lines]");
  const totals = container.querySelector("[data-totals]");

  const draw = () => {
    list.innerHTML = lines.map((line, index) => `<div class="line" data-index="${index}">
      <input class="desc" data-field="description" type="text" value="${esc(line.description)}" placeholder="Description de la prestation" aria-label="Description ligne ${index + 1}" maxlength="500">
      <input data-field="qty" type="number" min="0" step="0.5" value="${line.qty}" aria-label="Quantité ligne ${index + 1}">
      <input data-field="prix_ht" type="number" min="0" step="0.01" value="${line.prix_ht}" aria-label="Prix HT ligne ${index + 1}">
      <span class="line-total">${fmtEur(fromCents(lineTotalCents(line)))}</span>
      <button class="line-remove" type="button" data-remove-line="${index}" aria-label="Supprimer la ligne ${index + 1}">✕</button>
    </div>`).join("");
    updateTotals();
  };

  const updateTotals = () => {
    const total = computeTotals(lines, currentRate);
    if (isFranchise()) {
      totals.innerHTML = `<span class="grand">Total <strong>${fmtEur(fromCents(total.ttc))}</strong></span>`;
    } else {
      const vat = currentRate === 0
        ? ""
        : `<span>TVA ${currentRate} % <strong>${fmtEur(fromCents(total.tva))}</strong></span>`;
      totals.innerHTML = `<span>Total HT <strong>${fmtEur(fromCents(total.ht))}</strong></span>${vat}<span class="grand">Total <strong>${fmtEur(fromCents(total.ttc))}</strong></span>`;
    }
  };

  container.addEventListener("input", (event) => {
    const row = event.target.closest(".line");
    if (!row) return;
    const index = Number(row.dataset.index);
    const field = event.target.dataset.field;
    if (!field || !lines[index]) return;
    if (field === "description") lines[index].description = event.target.value;
    else lines[index][field] = numberValue(event.target.value);
    const cell = row.querySelector(".line-total");
    if (cell) cell.textContent = fmtEur(fromCents(lineTotalCents(lines[index])));
    updateTotals();
  });

  container.addEventListener("click", (event) => {
    if (event.target.closest("[data-add-line]")) {
      lines.push({ description: "", qty: 1, prix_ht: 0 });
      draw();
      return;
    }
    const remove = event.target.closest("[data-remove-line]");
    if (remove) {
      lines.splice(Number(remove.dataset.removeLine), 1);
      if (!lines.length) lines.push({ description: "", qty: 1, prix_ht: 0 });
      draw();
    }
  });

  container.addEventListener("change", (event) => {
    const select = event.target.closest("[data-add-service]");
    if (!select) return;
    const service = services.find((item) => item.id === select.value);
    if (!service) return;
    lines.push({ description: service.description, qty: 1, prix_ht: Number(service.prix_ht || 0) });
    select.value = "";
    draw();
  });

  draw();
  return {
    getLines: () => lines.filter((line) => line.description || line.qty || line.prix_ht),
    setRate: (value) => {
      currentRate = Number(value || 0);
      updateTotals();
    },
  };
}

/* ------------------------------- Modales ---------------------------------- */

async function openClientModal(id) {
  let detail = null;
  if (id) detail = await api("clients/" + encodeURIComponent(id));
  const client = detail || {};
  const { form } = openDialog({
    title: id ? "Modifier le client" : "Nouveau client",
    sub: id ? "Coordonnées, statut, notes et historique." : "Quelques informations suffisent pour démarrer.",
    body: `${clientForm(client)}
      ${detail ? `<div class="history-section"><div class="form-section-title">Historique</div>
        <div class="grid stats-grid">
          <div class="stat"><div class="stat-label">CA payé</div><div class="stat-value">${fmtEur(detail.totals?.ca_paye)}</div></div>
          <div class="stat"><div class="stat-label">En cours</div><div class="stat-value">${fmtEur(detail.totals?.en_cours)}</div></div>
          <div class="stat"><div class="stat-label">Devis</div><div class="stat-value">${detail.devis.length}</div></div>
        </div>
        <div class="card-head mt"><h3>Notes</h3></div>
        <div class="notes" id="client-notes">${(detail.notes_list || []).length ? (detail.notes_list || []).map((note) => `<div class="note">
          <div class="note-head"><span class="date">${esc(fmtDateTime(note.created_at))}</span><button class="note-delete" type="button" data-action="delete-note" data-id="${esc(note.id)}" data-client="${esc(client.id)}">Supprimer</button></div>
          <p>${esc(note.texte)}</p>
        </div>`).join("") : '<p class="muted small">Aucune note.</p>'}</div>
        <div class="toolbar-group mt"><input type="text" id="new-note" placeholder="Ajouter une note…" maxlength="5000" aria-label="Nouvelle note"><button class="btn secondary" type="button" data-action="add-note" data-id="${esc(client.id)}">Ajouter</button></div>
        <div class="card-head mt"><h3>Documents</h3></div>
        <div class="table-wrap"><table class="history-table"><thead><tr><th>N°</th><th>Date</th><th>Statut</th><th class="right">TTC</th></tr></thead><tbody>
          ${detail.devis.map((devis) => `<tr><td><button class="doc-link" type="button" data-action="edit-devis" data-id="${esc(devis.id)}">${esc(devis.numero)}</button></td><td>${fmtDate(devis.date)}</td><td>${badge("devis", devis.statut)}</td><td class="right money">${fmtEur(devis.total_ttc)}</td></tr>`).join("")}
          ${detail.factures.map((facture) => `<tr><td><button class="doc-link" type="button" data-action="edit-facture" data-id="${esc(facture.id)}">${esc(facture.numero)}</button></td><td>${fmtDate(facture.date)}</td><td>${badge("facture", facture.statut)}</td><td class="right money">${fmtEur(facture.total_ttc)}</td></tr>`).join("")}
          ${!detail.devis.length && !detail.factures.length ? '<tr><td colspan="4" class="muted">Aucun document.</td></tr>' : ""}
        </tbody></table></div>
        <div class="dialog-actions" style="padding:12px 0 0;border:0;background:none;justify-content:flex-start">
          <button class="btn secondary small" type="button" data-action="new-devis" data-id="${esc(client.id)}" data-client="1">+ Devis</button>
          <button class="btn secondary small" type="button" data-action="new-facture" data-id="${esc(client.id)}" data-client="1">+ Facture</button>
        </div>
      </div>` : ""}`,
    submitLabel: id ? "Enregistrer" : "Créer le client",
    wide: Boolean(detail),
    onSubmit: async (dialogForm) => {
      const payload = {
        nom: dialogForm.querySelector("#c-nom").value,
        societe: dialogForm.querySelector("#c-societe").value,
        email: dialogForm.querySelector("#c-email").value,
        tel: dialogForm.querySelector("#c-tel").value,
        adresse: dialogForm.querySelector("#c-adresse").value,
        type: dialogForm.querySelector("#c-type").value,
        statut: dialogForm.querySelector("#c-statut").value,
        tva: dialogForm.querySelector("#c-tva").value,
        peppol_id: dialogForm.querySelector("#c-peppol").value,
        notes: dialogForm.querySelector("#c-notes").value,
        est_test: dialogForm.querySelector("#c-test").checked ? 1 : 0,
      };
      if (id) await api("clients/" + encodeURIComponent(id), { method: "PUT", body: payload });
      else await api("clients", { method: "POST", body: payload });
      toast(id ? "Client enregistré." : "Client créé.");
      await refresh();
    },
  });

}

async function openDevisModal(id, options = {}) {
  if (!state.clients.length) {
    toast("Crée d'abord un client.", "error");
    openClientModal();
    return;
  }
  const devis = id ? devisById(id) : null;
  if (id && !devis) {
    toast("Devis introuvable.", "error");
    return;
  }
  const defaultClient = devis?.client_id || options.clientId || state.clients.find((client) => !Number(client.est_test))?.id || state.clients[0].id;
  const rate = devis ? Number(devis.taux_tva) : isFranchise() ? 0 : 21;
  const lines = devis ? safeJsonArray(devis.lignes) : [{ description: "", qty: 1, prix_ht: 0 }];
  const { form } = openDialog({
    title: devis ? `Devis ${devis.numero}` : "Nouveau devis",
    sub: devis ? `Créé le ${fmtDate(devis.date)}` : "Le numéro est attribué automatiquement.",
    wide: true,
    body: `<div class="form-grid">
      ${field("Client *", "d-client", `<select id="d-client">${state.clients.map((client) => `<option value="${esc(client.id)}" ${client.id === defaultClient ? "selected" : ""}>${esc(clientName(client))}${Number(client.est_test) ? " (test)" : ""}</option>`).join("")}</select>`)}
      ${field("Date", "d-date", `<input id="d-date" type="date" value="${esc(devis?.date || todayStr())}">`)}
      ${field("Validité (jours)", "d-validite", `<input id="d-validite" type="number" min="1" max="365" value="${devis?.validite_jours || 15}">`)}
      ${field("Taux TVA", "d-tva", `<select id="d-tva" ${isFranchise() ? "disabled" : ""}>${tvaOptions(rate)}</select>`)}
      ${field("Date de prestation", "d-prestation", `<input id="d-prestation" type="date" value="${esc(devis?.date_prestation || "")}">`, "Facultative, si différente de la date du devis.")}
      ${field("Statut", "d-statut", `<select id="d-statut">${DEVIS_STATUTS.map((statut) => `<option value="${statut}" ${devis?.statut === statut ? "selected" : ""}>${statusLabel("devis", statut)}</option>`).join("")}</select>`)}
      <div class="field full"><label class="check"><input id="d-test" type="checkbox" ${Number(devis?.est_test) ? "checked" : ""}> Document de test / exemple</label></div>
      <div class="field full"><div class="form-section-title">Lignes</div>${linesEditorHtml(lines, state.services)}</div>
      <div class="field full"><label for="d-notes">Notes / conditions</label><textarea id="d-notes" rows="3" maxlength="5000" placeholder="Conditions particulières, délai, acompte…">${esc(devis?.notes || "")}</textarea></div>
    </div>`,
    submitLabel: devis ? "Enregistrer" : "Créer le devis",
    onSubmit: async (dialogForm) => {
      const payload = {
        client_id: $("#d-client", dialogForm).value,
        date: $("#d-date", dialogForm).value,
        validite_jours: Number($("#d-validite", dialogForm).value) || 15,
        taux_tva: Number($("#d-tva", dialogForm).value) || 0,
        date_prestation: $("#d-prestation", dialogForm).value || null,
        statut: $("#d-statut", dialogForm).value,
        notes: $("#d-notes", dialogForm).value,
        est_test: $("#d-test", dialogForm).checked ? 1 : 0,
        lignes: readLines(dialogForm),
      };
      if (devis) await api("devis/" + encodeURIComponent(devis.id), { method: "PUT", body: payload });
      else await api("devis", { method: "POST", body: payload });
      toast(devis ? "Devis enregistré." : "Devis créé.");
      await refresh();
    },
  });
  const editor = setupLines($("#lines-editor", form), lines, Number($("#d-tva", form).value), state.services);
  $("#d-tva", form)?.addEventListener("change", (event) => editor.setRate(Number(event.target.value)));
}

function readLines(form) {
  return $$("#lines-editor [data-lines] .line", form).map((row) => ({
    description: row.querySelector('[data-field="description"]').value,
    qty: numberValue(row.querySelector('[data-field="qty"]').value),
    prix_ht: numberValue(row.querySelector('[data-field="prix_ht"]').value),
  }));
}

async function openFactureModal(id, options = {}) {
  if (!state.clients.length) {
    toast("Crée d'abord un client.", "error");
    openClientModal();
    return;
  }
  const facture = id ? factureById(id) : null;
  if (id && !facture) {
    toast("Facture introuvable.", "error");
    return;
  }
  const defaultClient = facture?.client_id || options.clientId || state.clients.find((client) => !Number(client.est_test))?.id || state.clients[0].id;
  const lines = facture ? safeJsonArray(facture.lignes) : [];
  const detailed = lines.length > 0;
  const rate = facture ? Number(facture.taux_tva) : isFranchise() ? 0 : 21;
  const { form } = openDialog({
    title: facture ? `Facture ${facture.numero}` : "Nouvelle facture",
    sub: facture ? `Créée le ${fmtDate(facture.date)}` : "Numéro automatique. La facture officielle reste dans Accountable.",
    wide: true,
    body: `<div class="form-grid">
      ${field("Client *", "f-client", `<select id="f-client">${state.clients.map((client) => `<option value="${esc(client.id)}" ${client.id === defaultClient ? "selected" : ""}>${esc(clientName(client))}${Number(client.est_test) ? " (test)" : ""}</option>`).join("")}</select>`)}
      ${field("Statut", "f-statut", `<select id="f-statut">${FACTURE_STATUTS.map((statut) => `<option value="${statut}" ${facture?.statut === statut ? "selected" : ""}>${statusLabel("facture", statut)}</option>`).join("")}</select>`)}
      ${field("Date", "f-date", `<input id="f-date" type="date" value="${esc(facture?.date || todayStr())}">`)}
      ${field("Échéance", "f-echeance", `<input id="f-echeance" type="date" value="${esc(facture?.echeance || addDays(todayStr(), 30))}">`)}
      ${field("Date de prestation", "f-prestation", `<input id="f-prestation" type="date" value="${esc(facture?.date_prestation || "")}">`, "Facultative, si différente de la date de facture.")}
      ${field("Taux TVA", "f-tva", `<select id="f-tva" ${isFranchise() ? "disabled" : ""}>${tvaOptions(rate)}</select>`)}
      <div class="field"><label for="f-payee">Payée le</label><input id="f-payee" type="date" value="${esc(facture?.payee_le || "")}"></div>
      <div class="field full"><label class="check"><input id="f-detailed" type="checkbox" ${detailed ? "checked" : ""}> Détailler les lignes sur la facture</label></div>
      <div class="field full ${detailed ? "" : "hidden"}" id="f-lines-wrap">${linesEditorHtml(lines.length ? lines : [{ description: "", qty: 1, prix_ht: 0 }], state.services)}</div>
      <div class="field full ${detailed ? "hidden" : ""}" id="f-amount-wrap">
        <label for="f-amount" id="f-amount-label">Montant HT (€)</label>
        <input id="f-amount" type="number" min="0" step="0.01" value="${facture ? Number(facture.montant_ht).toFixed(2) : ""}">
        <span class="hint" id="f-amount-hint"></span>
        <label class="check mt"><input id="f-ttc" type="checkbox"> Saisir en TTC — HT et TVA calculés automatiquement</label>
      </div>
      ${field("N° Accountable / Peppol", "f-numero-externe", `<input id="f-numero-externe" type="text" maxlength="100" value="${esc(facture?.numero_externe || "")}" placeholder="Numéro de la facture officielle">`)}
      ${field("Lien Accountable", "f-lien", `<input id="f-lien" type="url" maxlength="500" value="${esc(facture?.lien_externe || "")}" placeholder="https://…">`)}
      ${field("Moyen de paiement", "f-moyen", `<input id="f-moyen" type="text" maxlength="50" value="${esc(facture?.moyen_paiement || "")}" placeholder="Virement, Bancontact…">`)}
      <div class="field full"><label for="f-note">Note</label><input id="f-note" type="text" maxlength="2000" value="${esc(facture?.note || "")}"></div>
      <div class="field full"><label class="check"><input id="f-test" type="checkbox" ${Number(facture?.est_test) ? "checked" : ""}> Document de test / exemple</label></div>
    </div>`,
    submitLabel: facture ? "Enregistrer" : "Créer la facture",
    onSubmit: async (dialogForm) => {
      const detail = $("#f-detailed", dialogForm).checked;
      const payload = {
        client_id: $("#f-client", dialogForm).value,
        date: $("#f-date", dialogForm).value,
        echeance: $("#f-echeance", dialogForm).value,
        date_prestation: $("#f-prestation", dialogForm).value || null,
        statut: $("#f-statut", dialogForm).value,
        taux_tva: Number($("#f-tva", dialogForm).value) || 0,
        numero_externe: $("#f-numero-externe", dialogForm).value,
        lien_externe: $("#f-lien", dialogForm).value,
        moyen_paiement: $("#f-moyen", dialogForm).value,
        note: $("#f-note", dialogForm).value,
        est_test: $("#f-test", dialogForm).checked ? 1 : 0,
        payee_le: $("#f-payee", dialogForm).value || null,
      };
      if (detail) {
        payload.lignes = readLines(dialogForm);
      } else {
        const amount = numberValue($("#f-amount", dialogForm).value);
        if (amount <= 0) throw new Error("Le montant doit être supérieur à 0.");
        if ($("#f-ttc", dialogForm).checked) payload.montant_ttc = amount;
        else payload.montant_ht = amount;
      }
      if (facture) await api("factures/" + encodeURIComponent(facture.id), { method: "PUT", body: payload });
      else await api("factures", { method: "POST", body: payload });
      toast(facture ? "Facture enregistrée." : "Facture créée.");
      await refresh();
    },
  });
  const editor = setupLines($("#lines-editor", form), lines.length ? lines : [{ description: "", qty: 1, prix_ht: 0 }], Number($("#f-tva", form).value), state.services);
  const updateAmountHint = () => {
    const ttc = $("#f-ttc", form).checked;
    const rateValue = Number($("#f-tva", form).value) || 0;
    const amount = numberValue($("#f-amount", form).value);
    $("#f-amount-label", form).textContent = ttc ? "Montant TTC (€)" : "Montant HT (€)";
    const hint = $("#f-amount-hint", form);
    if (hint) hint.textContent = ttc && amount > 0 ? `→ HT ${fmtEur(fromCents(Math.round(cents(amount) / (1 + rateValue / 100))))} · TVA ${fmtEur(fromCents(cents(amount) - Math.round(cents(amount) / (1 + rateValue / 100))))}` : "";
  };
  $("#f-tva", form)?.addEventListener("change", (event) => {
    editor.setRate(Number(event.target.value));
    updateAmountHint();
  });
  $("#f-ttc", form)?.addEventListener("change", updateAmountHint);
  $("#f-amount", form)?.addEventListener("input", updateAmountHint);
  $("#f-detailed", form)?.addEventListener("change", (event) => {
    $("#f-lines-wrap", form).classList.toggle("hidden", !event.target.checked);
    $("#f-amount-wrap", form).classList.toggle("hidden", event.target.checked);
  });
  const updatePayee = () => {
    const payee = $("#f-statut", form).value === "payee";
    $("#f-payee", form).disabled = !payee;
    if (!payee) $("#f-payee", form).value = "";
  };
  $("#f-statut", form)?.addEventListener("change", updatePayee);
  updatePayee();
  updateAmountHint();
}

async function openServiceModal(id) {
  const service = id ? state.services.find((item) => item.id === id) : null;
  openDialog({
    title: service ? "Modifier la prestation" : "Nouvelle prestation",
    body: `<div class="form-grid">
      <div class="field full"><label for="s-description">Description *</label><input id="s-description" type="text" maxlength="300" value="${esc(service?.description || "")}" placeholder="Installation et configuration d'un PC"></div>
      ${field("Prix HT (€)", "s-prix", `<input id="s-prix" type="number" min="0" step="0.01" value="${service ? Number(service.prix_ht).toFixed(2) : "0.00"}">`)}
      ${field("Taux TVA", "s-tva", `<select id="s-tva">${tvaOptions(service?.taux_tva ?? (isFranchise() ? 0 : 21))}</select>`)}
      ${field("Unité", "s-unite", `<input id="s-unite" type="text" maxlength="30" value="${esc(service?.unite || "")}" placeholder="heure, forfait, jour…">`)}
      <div class="field full"><label class="check"><input id="s-actif" type="checkbox" ${service ? (service.actif ? "checked" : "") : "checked"}> Prestation active</label></div>
    </div>`,
    submitLabel: service ? "Enregistrer" : "Créer",
    onSubmit: async (form) => {
      const payload = {
        description: $("#s-description", form).value,
        prix_ht: numberValue($("#s-prix", form).value),
        taux_tva: Number($("#s-tva", form).value) || 0,
        unite: $("#s-unite", form).value,
        actif: $("#s-actif", form).checked ? 1 : 0,
      };
      if (service) await api("services/" + encodeURIComponent(service.id), { method: "PUT", body: payload });
      else await api("services", { method: "POST", body: payload });
      toast(service ? "Prestation enregistrée." : "Prestation créée.");
      await refresh();
    },
  });
}

async function openQuickModal(kind) {
  const isDevis = kind === "devis";
  openDialog({
    title: isDevis ? "Devis rapide" : "Facture rapide",
    sub: "Client existant ou nouveau client B2C, un montant, c'est tout.",
    body: `<div class="form-grid">
      ${field("Client existant", "q-client", `<select id="q-client"><option value="">— Nouveau client —</option>${state.clients.map((client) => `<option value="${esc(client.id)}">${esc(clientName(client))}${Number(client.est_test) ? " (test)" : ""}</option>`).join("")}</select>`)}
      ${field("…ou nouveau client", "q-new-name", `<input id="q-new-name" type="text" maxlength="200" placeholder="Nom du client">`)}
      ${field("Adresse du nouveau client", "q-new-adresse", `<input id="q-new-adresse" type="text" maxlength="1000" placeholder="Rue, code postal, ville">`)}
      ${field("E-mail du nouveau client", "q-new-email", `<input id="q-new-email" type="email" maxlength="200" placeholder="client@example.com">`)}
      ${field("Description", "q-description", `<input id="q-description" type="text" maxlength="300" value="${isDevis ? "Prestation" : "Prestation"}" placeholder="Description">`)}
      ${field("Montant (€)", "q-amount", `<input id="q-amount" type="number" min="0" step="0.01" value="0">`)}
      ${field("Taux TVA", "q-tva", `<select id="q-tva" ${isFranchise() ? "disabled" : ""}>${tvaOptions(isFranchise() ? 0 : 21)}</select>`)}
      <div class="field full"><label class="check"><input id="q-ttc" type="checkbox"> Saisir en TTC — HT et TVA calculés</label>
      <label class="check mt"><input id="q-test" type="checkbox"> Document de test / exemple</label></div>
    </div>`,
    submitLabel: isDevis ? "Créer le devis + PDF" : "Créer la facture + PDF",
    onSubmit: async (form) => {
      let clientId = $("#q-client", form).value;
      const newName = $("#q-new-name", form).value.trim();
      const test = $("#q-test", form).checked ? 1 : 0;
      if (newName) {
        const created = await api("clients", {
          method: "POST",
          body: { nom: newName, adresse: $("#q-new-adresse", form).value, email: $("#q-new-email", form).value, type: "b2c", est_test: test },
        });
        clientId = created.id;
      }
      if (!clientId) throw new Error("Choisis un client ou saisis un nom.");
      const amount = numberValue($("#q-amount", form).value);
      if (amount <= 0) throw new Error("Le montant doit être supérieur à 0.");
      const description = $("#q-description", form).value.trim() || "Prestation";
      const ttc = $("#q-ttc", form).checked;
      const payload = { client_id: clientId, taux_tva: Number($("#q-tva", form).value) || 0, est_test: test };
      if (ttc) {
        payload.montant_ttc = amount;
        payload.description = description;
      } else {
        payload.lignes = [{ description, qty: 1, prix_ht: amount }];
      }
      const created = isDevis
        ? await api("devis", { method: "POST", body: payload })
        : await api("factures", { method: "POST", body: payload });
      await refresh();
      window.open(`/document.html?type=${isDevis ? "devis" : "facture"}&id=${encodeURIComponent(created.id)}`, "_blank", "noopener");
      toast(isDevis ? "Devis créé." : "Facture créée.");
    },
  });
}

/* ------------------------------- Actions ---------------------------------- */

async function handleAction(element) {
  const action = element.dataset.action;
  const id = element.dataset.id;
  const clientId = element.dataset.client === "1" ? element.dataset.id : null;
  const dialog = $("#dialog");
  if (dialog.open) dialog.close();

  if (action === "new-client") return openClientModal();
  if (action === "edit-client") return openClientModal(id);
  if (action === "new-devis") return openDevisModal(null, { clientId: clientId || undefined });
  if (action === "edit-devis") return openDevisModal(id);
  if (action === "new-facture") return openFactureModal(null, { clientId: clientId || undefined });
  if (action === "edit-facture") return openFactureModal(id);
  if (action === "new-service") return openServiceModal();
  if (action === "edit-service") return openServiceModal(id);
  if (action === "quick-devis") return openQuickModal("devis");
  if (action === "quick-facture") return openQuickModal("facture");

  if (action === "open-factures") {
    state.filters.factureStatut = element.dataset.filter || "";
    navigate("factures");
    return;
  }
  if (action === "open-devis") {
    state.filters.devisStatut = element.dataset.filter || "";
    navigate("devis");
    return;
  }

  if (action === "delete-client") {
    const client = clientById(id);
    const ok = await confirmDialog({ title: "Supprimer le client", message: `Supprimer ${client ? clientName(client) : "ce client"} ?`, confirmLabel: "Supprimer" });
    if (!ok) return;
    try {
      await api("clients/" + encodeURIComponent(id), { method: "DELETE" });
    } catch (error) {
      if (!client?.est_test) throw error;
      const force = await confirmDialog({
        title: "Client de test",
        message: "Ce client a des documents de test. Les supprimer aussi ?",
        confirmLabel: "Tout supprimer",
      });
      if (!force) return;
      await api("clients/" + encodeURIComponent(id) + "?force=1", { method: "DELETE" });
    }
    toast("Client supprimé.");
    await refresh();
    return;
  }

  if (action === "delete-devis") {
    const devis = devisById(id);
    const ok = await confirmDialog({ title: "Supprimer le devis", message: `Supprimer ${devis?.numero || "ce devis"} ?`, confirmLabel: "Supprimer" });
    if (!ok) return;
    await api("devis/" + encodeURIComponent(id), { method: "DELETE" });
    toast("Devis supprimé.");
    await refresh();
    return;
  }

  if (action === "delete-facture") {
    const facture = factureById(id);
    const ok = await confirmDialog({ title: "Supprimer la facture", message: `Supprimer ${facture?.numero || "cette facture"} du suivi ? La facture officielle Accountable n'est pas touchée.`, confirmLabel: "Supprimer" });
    if (!ok) return;
    await api("factures/" + encodeURIComponent(id), { method: "DELETE" });
    toast("Facture supprimée du suivi.");
    await refresh();
    return;
  }

  if (action === "delete-service") {
    const service = state.services.find((item) => item.id === id);
    const ok = await confirmDialog({ title: "Supprimer la prestation", message: `Supprimer « ${service?.description || "cette prestation"} » du catalogue ?`, confirmLabel: "Supprimer" });
    if (!ok) return;
    await api("services/" + encodeURIComponent(id), { method: "DELETE" });
    toast("Prestation supprimée.");
    await refresh();
    return;
  }

  if (action === "duplicate-devis") {
    const created = await api("devis/" + encodeURIComponent(id) + "/duplicate", { method: "POST" });
    toast(`Devis ${created.numero} créé.`);
    await refresh();
    return;
  }
  if (action === "duplicate-facture") {
    const created = await api("factures/" + encodeURIComponent(id) + "/duplicate", { method: "POST" });
    toast(`Facture ${created.numero} créée.`);
    await refresh();
    return;
  }
  if (action === "facturer-devis") {
    const devis = devisById(id);
    const ok = await confirmDialog({ title: "Facturer le devis", message: `Créer une facture à partir de ${devis?.numero || "ce devis"} ?`, confirmLabel: "Facturer", danger: false });
    if (!ok) return;
    const created = await api("devis/" + encodeURIComponent(id) + "/facture", { method: "POST" });
    toast(`Facture ${created.numero} créée.`);
    await refresh();
    openFactureModal(created.id);
    return;
  }
  if (action === "mark-paid") {
    await api("factures/" + encodeURIComponent(id) + "/statut", { method: "POST", body: { statut: "payee" } });
    toast("Facture marquée payée.");
    await refresh();
    return;
  }
  if (action === "relance-facture") {
    const facture = factureById(id);
    if (!facture) return;
    const client = clientById(facture.client_id);
    await api("factures/" + encodeURIComponent(id) + "/relance", { method: "POST" });
    const subject = `Rappel facture ${facture.numero}`;
    const text = `Bonjour ${client?.nom || ""},\n\nSauf erreur de ma part, la facture ${facture.numero} d'un montant de ${fmtEur(facture.total_ttc)} est arrivée à échéance le ${fmtDate(facture.echeance)}.\n\nPeux-tu me confirmer son paiement ? Si tu as besoin d'un justificatif ou d'un délai, dis-le moi.\n\nMerci d'avance,\n${state.profile.nom || "Edukisto"}`;
    if (client?.email) {
      location.href = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    } else {
      await copyText(text);
      toast("E-mail du client absent : texte de relance copié.", "success");
    }
    await refresh();
    return;
  }
  if (action === "add-note") {
    const input = $("#new-note");
    const texte = input?.value.trim();
    if (!texte) return;
    await api("notes", { method: "POST", body: { client_id: id, texte } });
    toast("Note ajoutée.");
    await refresh();
    openClientModal(id);
    return;
  }
  if (action === "delete-note") {
    await api("notes/" + encodeURIComponent(id), { method: "DELETE" });
    toast("Note supprimée.");
    await refresh();
    if (element.dataset.client) openClientModal(element.dataset.client);
    return;
  }
  if (action === "logout-all") {
    const ok = await confirmDialog({ title: "Déconnecter partout", message: "Toutes les sessions seront révoquées, y compris celle-ci.", confirmLabel: "Déconnecter" });
    if (!ok) return;
    await api("logout-all", { method: "POST" });
    showLogin(true);
    return;
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

/* --------------------------------- Events --------------------------------- */

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      navigate(tabButton.dataset.tab);
      return;
    }
    const close = event.target.closest("[data-close]");
    if (close) {
      const dialog = close.closest("dialog");
      if (dialog) dialog.close();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (action) {
      event.preventDefault();
      $$("details.menu[open]").forEach((menu) => { menu.open = false; });
      try {
        await handleAction(action);
      } catch (error) {
        toast(error.message || "Erreur", "error");
      }
      return;
    }
    const openMenu = event.target.closest("details.menu");
    if (!openMenu) $$("details.menu[open]").forEach((menu) => { menu.open = false; });
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const dataForm = form.dataset.form;
    if (dataForm === "login") {
      const button = $("#login-submit");
      button.disabled = true;
      $("#login-error").textContent = "";
      try {
        await api("auth", {
          method: "POST",
          body: { mode: state.signup ? "signup" : "login", password: $("#login-password").value },
        });
        await enterApp();
      } catch (error) {
        $("#login-error").textContent = error.message;
      } finally {
        button.disabled = false;
      }
      return;
    }
    if (dataForm === "profile") {
      try {
        const payload = {
          nom: $("#p-nom").value,
          adresse: $("#p-adresse").value,
          bce: $("#p-bce").value,
          tva: $("#p-tva").value,
          tva_regime: $("#p-regime").value,
          seuil_franchise: $("#p-seuil").value,
          iban: $("#p-iban").value,
          site: $("#p-site").value,
          email: $("#p-email").value,
          tel: $("#p-tel").value,
          mentions: $("#p-mentions").value,
        };
        await api("profile", { method: "PUT", body: payload });
        await refresh();
        toast("Profil enregistré.");
      } catch (error) {
        toast(error.message, "error");
      }
      return;
    }
    if (dataForm === "password") {
      const current = $("#p-current").value;
      const next = $("#p-new").value;
      const confirm = $("#p-confirm").value;
      if (next !== confirm) {
        toast("Les deux mots de passe ne correspondent pas.", "error");
        return;
      }
      try {
        await api("password", { method: "POST", body: { current, new: next } });
        form.reset();
        toast("Mot de passe changé. Les autres sessions sont révoquées.");
      } catch (error) {
        toast(error.message, "error");
      }
    }
  });

  $("#include-test").addEventListener("change", async (event) => {
    state.includeTest = event.target.checked;
    localStorage.setItem("gestion.includeTest", state.includeTest ? "1" : "0");
    if (!state.authed) return;
    try {
      state.stats = await api(`stats?include_test=${state.includeTest ? "1" : "0"}`);
      render();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  $("#btn-logout").addEventListener("click", async () => {
    try { await api("logout", { method: "POST" }); } catch { /* déjà déconnecté */ }
    showLogin(true);
  });

  $(".tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const buttons = $$(".tabs button");
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    buttons[next].click();
  });

  window.addEventListener("hashchange", () => {
    if (!state.authed) return;
    const tab = location.hash.replace(/^#\/?/, "");
    if (TABS.includes(tab) && tab !== state.tab) {
      state.tab = tab;
      render();
    }
  });

  $("#dialog").addEventListener("click", (event) => {
    if (event.target === $("#dialog")) $("#dialog").close();
  });
}

/* ---------------------------------- Boot ---------------------------------- */

async function boot() {
  bindEvents();
  try {
    const me = await api("me");
    if (me.authed) await enterApp();
    else showLogin(me.configured);
  } catch {
    showLogin(true);
  }
}

boot();
