const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtEur = (n) => Number(n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
const fmtDate = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");
const todayStr = () => new Date().toISOString().slice(0, 10);

const DEVIS_STATUTS = { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé", expire: "Expiré" };
const FACTURE_STATUTS = { a_envoyer: "À envoyer", envoyee_peppol: "Envoyée (Peppol)", envoyee_email: "Envoyée (e-mail)", payee: "Payée" };

let clientsCache = [];
let devisCache = [];
let facturesCache = [];
let signupMode = false;
let currentTab = "dashboard";

async function api(path, opts = {}) {
  const res = await fetch("/api/" + path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (res.status === 401 && path !== "me") { showLogin(true); throw new Error("Session expirée, reconnectez-vous."); }
  let data = null;
  try { data = await res.json(); } catch { /* réponse vide */ }
  if (!res.ok) throw new Error(data?.error || "Erreur " + res.status);
  return data;
}

function openModal(html) {
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal">${html}</div></div>`;
  $(".modal-backdrop", root).addEventListener("click", (e) => { if (e.target === e.currentTarget) closeModal(); });
  return $(".modal", root);
}
const closeModal = () => { $("#modal-root").innerHTML = ""; };

function showLogin(configured) {
  signupMode = !configured;
  $("#view-login").classList.remove("hidden");
  $("#view-app").classList.add("hidden");
  $("#btn-logout").classList.add("hidden");
  $("#nav-user").textContent = "";
  $("#login-hint").textContent = configured
    ? "Mot de passe de l'espace gestion."
    : "Première utilisation : choisis le mot de passe de l'espace (8 caractères min).";
  $("#login-submit").textContent = configured ? "Se connecter" : "Créer le mot de passe";
  $("#login-error").textContent = "";
  $("#login-password").value = "";
  $("#login-password").focus();
}

function showApp() {
  $("#view-login").classList.add("hidden");
  $("#view-app").classList.remove("hidden");
  $("#btn-logout").classList.remove("hidden");
  $("#nav-user").textContent = "Edukisto";
  switchTab(currentTab, true);
}

function switchTab(tab, force = false) {
  currentTab = tab;
  $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  $$(".tab-panel").forEach((p) => p.classList.add("hidden"));
  $("#tab-" + tab).classList.remove("hidden");
  if (force || !$("#tab-" + tab).dataset.loaded) {
    $("#tab-" + tab).dataset.loaded = "1";
    ({ dashboard: renderDashboard, clients: renderClients, devis: renderDevis, factures: renderFactures, profil: renderProfil })[tab]();
  }
}

async function boot() {
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  $("#btn-logout").addEventListener("click", async () => {
    try { await api("logout", { method: "POST", body: "{}" }); } catch { /* déjà déconnecté */ }
    location.reload();
  });
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = $("#login-password").value;
    $("#login-error").textContent = "";
    $("#login-submit").disabled = true;
    try {
      await api("auth", { method: "POST", body: JSON.stringify({ mode: signupMode ? "signup" : "login", password }) });
      showApp();
    } catch (err) {
      $("#login-error").textContent = err.message;
    } finally {
      $("#login-submit").disabled = false;
    }
  });
  try {
    const me = await api("me");
    if (me.authed) showApp(); else showLogin(me.configured);
  } catch {
    showLogin(true);
  }
}

const badge = (map, statut, extra = "") => `<span class="badge ${esc(statut)} ${esc(extra)}">${esc(map[statut] || statut)}</span>`;

async function renderDashboard() {
  const el = $("#tab-dashboard");
  el.innerHTML = "<p class='muted'>Chargement…</p>";
  const st = await api("stats");
  const relancer = st.a_relancer.length
    ? `<div class="card"><h3>Factures en retard (${st.nb_en_retard})</h3>
       <table><thead><tr><th>N°</th><th>Client</th><th>Échéance</th><th class="right">TTC</th></tr></thead>
       <tbody>${st.a_relancer.map((f) => `<tr class="clickable" data-facture="${esc(f.id)}"><td>${esc(f.numero)}</td><td>${esc(f.client_nom)}</td><td>${fmtDate(f.echeance)}</td><td class="right money">${fmtEur(f.total_ttc)}</td></tr>`).join("")}</tbody></table></div>`
    : "";
  el.innerHTML = `
    <div class="stats mt">
      <div class="stat"><div class="label">CA payé (total)</div><div class="value">${fmtEur(st.ca_paye_total)}</div></div>
      <div class="stat"><div class="label">CA payé ce mois</div><div class="value">${fmtEur(st.ca_paye_mois)}</div></div>
      <div class="stat"><div class="label">En attente de paiement</div><div class="value">${fmtEur(st.ca_en_attente)} <span class="muted">(${st.nb_en_attente})</span></div></div>
      <div class="stat"><div class="label">En retard</div><div class="value danger">${fmtEur(st.en_retard)} <span class="muted">(${st.nb_en_retard})</span></div></div>
      <div class="stat"><div class="label">Devis envoyés</div><div class="value">${fmtEur(st.devis_envoyes)} <span class="muted">(${st.nb_devis_envoyes})</span></div></div>
      <div class="stat"><div class="label">Devis acceptés</div><div class="value">${st.nb_devis_acceptes}</div></div>
      <div class="stat"><div class="label">Clients</div><div class="value">${st.nb_clients}</div></div>
    </div>
    ${relancer}
    <div class="card"><h3>Exports</h3>
      <p><a href="/api/export?type=clients" download>Export clients (CSV)</a> ·
         <a href="/api/export?type=devis" download>Export devis (CSV)</a> ·
         <a href="/api/export?type=factures" download>Export factures (CSV)</a></p>
      <p class="muted mt">Factures B2B : à émettre via <a href="https://app.accountable.eu/" target="_blank" rel="noopener">Accountable</a> (envoi Peppol obligatoire depuis 2026).</p>
    </div>`;
  $$("#tab-dashboard tr.clickable").forEach((tr) => tr.addEventListener("click", () => {
    switchTab("factures");
    setTimeout(() => openFactureModal(tr.dataset.facture), 50);
  }));
}

async function renderClients() {
  const el = $("#tab-clients");
  clientsCache = await api("clients");
  el.innerHTML = `
    <div class="toolbar">
      <div><input type="text" id="client-search" placeholder="Rechercher un client…" style="max-width:280px"></div>
      <div>
        <a class="btn secondary small" href="/api/export?type=clients" download>Export CSV</a>
        <button class="btn small" id="btn-new-client" type="button">+ Nouveau client</button>
      </div>
    </div>
    <div class="card"><table>
      <thead><tr><th>Nom</th><th>Société</th><th>N° TVA</th><th>Type</th><th>E-mail</th><th>Tél.</th><th>Devis</th><th>Factures</th></tr></thead>
      <tbody id="clients-body"></tbody>
    </table></div>`;
  const draw = () => {
    const q = ($("#client-search").value || "").toLowerCase();
    $("#clients-body").innerHTML = clientsCache
      .filter((c) => !q || [c.nom, c.societe, c.email, c.tva].filter(Boolean).join(" ").toLowerCase().includes(q))
      .map((c) => `<tr class="clickable" data-client="${esc(c.id)}">
        <td><strong>${esc(c.nom)}</strong></td><td>${esc(c.societe)}</td><td>${esc(c.tva)}</td>
        <td>${c.type === "b2b" ? "B2B (Peppol)" : "B2C"}</td><td>${esc(c.email)}</td><td>${esc(c.tel)}</td>
        <td>${c.nb_devis}</td><td>${c.nb_factures}</td></tr>`).join("") || `<tr><td colspan="8" class="muted">Aucun client.</td></tr>`;
    $$("#clients-body tr.clickable").forEach((tr) => tr.addEventListener("click", () => openClientModal(tr.dataset.client)));
  };
  $("#client-search").addEventListener("input", draw);
  $("#btn-new-client").addEventListener("click", () => openClientModal(null));
  draw();
}

function clientFormHtml(c) {
  return `
    <h2>${c ? "Modifier le client" : "Nouveau client"}</h2>
    <div class="row"><div><label>Nom *</label><input type="text" id="f-nom" value="${esc(c?.nom)}" required></div>
    <div><label>Société</label><input type="text" id="f-societe" value="${esc(c?.societe)}"></div></div>
    <div class="row"><div><label>E-mail</label><input type="email" id="f-email" value="${esc(c?.email)}"></div>
    <div><label>Téléphone</label><input type="tel" id="f-tel" value="${esc(c?.tel)}"></div></div>
    <div class="row"><div><label>Adresse</label><input type="text" id="f-adresse" value="${esc(c?.adresse)}"></div>
    <div><label>Type</label><select id="f-type"><option value="b2b" ${c?.type === "b2b" || !c ? "selected" : ""}>B2B (facture Peppol)</option><option value="b2c" ${c?.type === "b2c" ? "selected" : ""}>B2C (particulier)</option></select></div></div>
    <div class="row"><div><label>N° TVA (BE…)</label><input type="text" id="f-tva" value="${esc(c?.tva)}" placeholder="BE0123456789"></div>
    <div><label>Endpoint Peppol</label><input type="text" id="f-peppol" value="${esc(c?.peppol_id)}" placeholder="ex: 0208:0123456789"></div></div>
    <div><label>Notes</label><textarea id="f-notes">${esc(c?.notes)}</textarea></div>
    <div class="modal-actions">
      ${c ? '<button class="btn danger" id="f-delete" type="button">Supprimer</button>' : ""}
      <button class="btn secondary" id="f-cancel" type="button">Annuler</button>
      <button class="btn" id="f-save" type="submit">Enregistrer</button>
    </div>`;
}

async function openClientModal(id) {
  let c = null, detail = null;
  if (id) {
    detail = await api("clients/" + id);
    c = detail;
  }
  const modal = openModal(clientFormHtml(c));
  $("#f-cancel").addEventListener("click", closeModal);
  $("#f-save").addEventListener("click", async () => {
    const body = {
      nom: $("#f-nom", modal).value, societe: $("#f-societe", modal).value, email: $("#f-email", modal).value,
      tel: $("#f-tel", modal).value, adresse: $("#f-adresse", modal).value, tva: $("#f-tva", modal).value,
      type: $("#f-type", modal).value, peppol_id: $("#f-peppol", modal).value, notes: $("#f-notes", modal).value,
    };
    try {
      if (id) await api("clients/" + id, { method: "PUT", body: JSON.stringify(body) });
      else await api("clients", { method: "POST", body: JSON.stringify(body) });
      closeModal();
      $("#tab-clients").dataset.loaded = "";
      renderClients();
    } catch (err) { alert(err.message); }
  });
  const del = $("#f-delete", modal);
  if (del) del.addEventListener("click", async () => {
    if (!confirm("Supprimer ce client ? (impossible s'il a des devis ou factures)")) return;
    try {
      await api("clients/" + id, { method: "DELETE" });
      closeModal();
      $("#tab-clients").dataset.loaded = "";
      renderClients();
    } catch (err) { alert(err.message); }
  });
  if (detail) {
    const notesHtml = detail.notes.length
      ? detail.notes.map((n) => `<div class="note"><button data-note="${esc(n.id)}" title="Supprimer">✕</button><span class="date">${esc(n.created_at.slice(0, 16).replace("T", " "))}</span><br>${esc(n.texte)}</div>`).join("")
      : "<p class='muted'>Aucune note.</p>";
    const devisHtml = detail.devis.length
      ? `<table><thead><tr><th>N°</th><th>Date</th><th>Statut</th><th class="right">TTC</th></tr></thead><tbody>${detail.devis.map((d) => `<tr><td>${esc(d.numero)}</td><td>${fmtDate(d.date)}</td><td>${badge(DEVIS_STATUTS, d.statut)}</td><td class="right money">${fmtEur(d.total_ttc)}</td></tr>`).join("")}</tbody></table>`
      : "<p class='muted'>Aucun devis.</p>";
    const facturesHtml = detail.factures.length
      ? `<table><thead><tr><th>N°</th><th>Date</th><th>Échéance</th><th>Statut</th><th class="right">TTC</th></tr></thead><tbody>${detail.factures.map((f) => `<tr><td>${esc(f.numero)}</td><td>${fmtDate(f.date)}</td><td>${fmtDate(f.echeance)}</td><td>${badge(FACTURE_STATUTS, f.statut, f.statut !== "payee" && f.echeance < todayStr() ? "retard" : "")}</td><td class="right money">${fmtEur(f.total_ttc)}</td></tr>`).join("")}</tbody></table>`
      : "<p class='muted'>Aucune facture.</p>";
    modal.insertAdjacentHTML("beforeend", `
      <h3>Devis</h3>${devisHtml}
      <h3>Factures</h3>${facturesHtml}
      <h3>Notes</h3>
      <div class="row"><div><input type="text" id="new-note" placeholder="Ajouter une note…"></div>
      <div style="flex:0"><button class="btn small" id="add-note" type="button">Ajouter</button></div></div>
      <div id="notes-list">${notesHtml}</div>`);
    $$("#notes-list .note button").forEach((b) => b.addEventListener("click", async () => {
      await api("notes/" + b.dataset.note, { method: "DELETE" });
      openClientModal(id);
    }));
    $("#add-note").addEventListener("click", async () => {
      const texte = $("#new-note").value.trim();
      if (!texte) return;
      await api("notes", { method: "POST", body: JSON.stringify({ client_id: id, texte }) });
      openClientModal(id);
    });
  }
}

async function renderDevis() {
  const el = $("#tab-devis");
  devisCache = await api("devis");
  if (!clientsCache.length) clientsCache = await api("clients");
  el.innerHTML = `
    <div class="toolbar">
      <span class="muted">${devisCache.length} devis</span>
      <div><a class="btn secondary small" href="/api/export?type=devis" download>Export CSV</a>
      <button class="btn secondary small" id="btn-quick-devis" type="button">⚡ Rapide</button>
      <button class="btn small" id="btn-new-devis" type="button">+ Nouveau devis</button></div>
    </div>
    <div class="card"><table>
      <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Statut</th><th class="right">HT</th><th class="right">TTC</th><th>Valable jusqu'au</th><th>Actions</th></tr></thead>
      <tbody>${devisCache.map((d) => {
        const validUntil = (() => { const dt = new Date(d.date + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + d.validite_jours); return dt.toISOString().slice(0, 10); })();
        return `<tr>
          <td><strong>${esc(d.numero)}</strong></td><td>${fmtDate(d.date)}</td><td>${esc(d.client_nom)}${d.client_societe ? " — " + esc(d.client_societe) : ""}</td>
          <td><select class="statut-devis" data-id="${esc(d.id)}">${Object.entries(DEVIS_STATUTS).map(([k, v]) => `<option value="${k}" ${d.statut === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
          <td class="right money">${fmtEur(d.total_ht)}</td><td class="right money">${fmtEur(d.total_ttc)}</td><td>${fmtDate(validUntil)}</td>
          <td><button class="btn secondary small" data-pdf-devis="${esc(d.id)}" type="button">PDF</button>
              <button class="btn secondary small" data-facturer="${esc(d.id)}" type="button">Facturer</button>
              <button class="btn danger small" data-del-devis="${esc(d.id)}" type="button">✕</button></td>
        </tr>`;
      }).join("") || `<tr><td colspan="8" class="muted">Aucun devis.</td></tr>`}</tbody>
    </table></div>`;
  $("#btn-new-devis").addEventListener("click", () => openDevisModal(null));
  $("#btn-quick-devis").addEventListener("click", () => openQuickCreate("devis"));
  $$("[data-pdf-devis]").forEach((b) => b.addEventListener("click", () => window.open("document.html?type=devis&id=" + b.dataset.pdfDevis, "_blank")));
  $$(".statut-devis").forEach((sel) => sel.addEventListener("change", async () => {
    await api("devis/" + sel.dataset.id, { method: "PUT", body: JSON.stringify({ statut: sel.value }) });
    renderDevis();
  }));
  $$("[data-del-devis]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Supprimer ce devis ?")) return;
    await api("devis/" + b.dataset.delDevis, { method: "DELETE" });
    renderDevis();
  }));
  $$("[data-facturer]").forEach((b) => b.addEventListener("click", () => openFactureModal(null, b.dataset.facturer)));
}

function openDevisModal(devis) {
  const lignes = devis ? JSON.parse(devis.lignes || "[]") : [{ description: "", qty: 1, prix_ht: 0 }];
  const modal = openModal(`
    <h2>${devis ? "Devis " + esc(devis.numero) : "Nouveau devis"}</h2>
    <div class="row"><div><label>Client *</label><select id="d-client">${clientsCache.map((c) => `<option value="${esc(c.id)}" ${devis?.client_id === c.id ? "selected" : ""}>${esc(c.nom)}${c.societe ? " — " + esc(c.societe) : ""}</option>`).join("")}</select></div>
    <div><label>Date</label><input type="date" id="d-date" value="${devis?.date || todayStr()}"></div>
    <div><label>Validité (jours)</label><input type="number" id="d-validite" min="1" max="365" value="${devis?.validite_jours || 30}"></div>
    <div><label>Taux TVA (%)</label><input type="number" id="d-tva" min="0" max="100" step="0.5" value="${devis?.taux_tva ?? 21}"></div></div>
    <h3>Lignes</h3>
    <div id="d-lignes"></div>
    <button class="btn secondary small" id="d-add-ligne" type="button">+ Ajouter une ligne</button>
    <p class="mt"><strong>Total HT :</strong> <span id="d-total-ht" class="money">0,00 €</span> ·
       <strong>TTC :</strong> <span id="d-total-ttc" class="money">0,00 €</span></p>
    <div class="modal-actions">
      <button class="btn secondary" id="d-cancel" type="button">Annuler</button>
      <button class="btn" id="d-save" type="button">Enregistrer</button>
    </div>`);
  const drawLignes = () => {
    $("#d-lignes", modal).innerHTML = lignes.map((l, i) => `
      <div class="ligne-devis">
        <input class="desc" type="text" placeholder="Description" value="${esc(l.description)}">
        <input class="qty" type="number" min="0" step="0.5" title="Quantité" value="${l.qty}">
        <input class="prix" type="number" min="0" step="0.01" title="Prix HT unitaire (€)" value="${l.prix_ht}">
        <button type="button" data-del="${i}" title="Supprimer la ligne">✕</button>
      </div>`).join("");
    $$("#d-lignes .ligne-devis").forEach((row, i) => {
      $(".desc", row).addEventListener("input", (e) => { lignes[i].description = e.target.value; });
      $(".qty", row).addEventListener("input", (e) => { lignes[i].qty = Number(e.target.value) || 0; drawTotal(); });
      $(".prix", row).addEventListener("input", (e) => { lignes[i].prix_ht = Number(e.target.value) || 0; drawTotal(); });
      $("[data-del]", row).addEventListener("click", () => { lignes.splice(i, 1); drawLignes(); });
    });
  };
  const drawTotal = () => {
    const taux = Number($("#d-tva", modal).value) || 0;
    const ht = lignes.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.prix_ht) || 0), 0);
    $("#d-total-ht", modal).textContent = fmtEur(ht);
    $("#d-total-ttc", modal).textContent = fmtEur(ht * (1 + taux / 100));
  };
  $("#d-add-ligne", modal).addEventListener("click", () => { lignes.push({ description: "", qty: 1, prix_ht: 0 }); drawLignes(); });
  $("#d-tva", modal).addEventListener("input", drawTotal);
  $("#d-cancel", modal).addEventListener("click", closeModal);
  $("#d-save", modal).addEventListener("click", async () => {
    const body = {
      client_id: $("#d-client", modal).value,
      date: $("#d-date", modal).value,
      validite_jours: Number($("#d-validite", modal).value) || 30,
      taux_tva: Number($("#d-tva", modal).value) || 21,
      lignes,
    };
    try {
      if (devis) await api("devis/" + devis.id, { method: "PUT", body: JSON.stringify(body) });
      else await api("devis", { method: "POST", body: JSON.stringify(body) });
      closeModal();
      renderDevis();
    } catch (err) { alert(err.message); }
  });
  drawLignes();
  drawTotal();
}

async function renderFactures() {
  const el = $("#tab-factures");
  facturesCache = await api("factures");
  if (!clientsCache.length) clientsCache = await api("clients");
  el.innerHTML = `
    <div class="toolbar">
      <span class="muted">${facturesCache.length} factures — suivi d'envoi et de paiement</span>
      <div><a class="btn secondary small" href="/api/export?type=factures" download>Export CSV</a>
      <button class="btn secondary small" id="btn-quick-facture" type="button">⚡ Rapide</button>
      <button class="btn small" id="btn-new-facture" type="button">+ Nouvelle facture</button></div>
    </div>
    <div class="card"><table>
      <thead><tr><th>N°</th><th>Date</th><th>Échéance</th><th>Client</th><th>Statut</th><th class="right">TTC</th><th>Actions</th></tr></thead>
      <tbody>${facturesCache.map((f) => `<tr>
        <td><strong>${esc(f.numero)}</strong></td><td>${fmtDate(f.date)}</td><td>${fmtDate(f.echeance)}${f.en_retard ? ' <span class="badge retard">retard</span>' : ""}</td>
        <td>${esc(f.client_nom)}${f.client_societe ? " — " + esc(f.client_societe) : ""}</td>
        <td><select class="statut-facture" data-id="${esc(f.id)}">${Object.entries(FACTURE_STATUTS).map(([k, v]) => `<option value="${k}" ${f.statut === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
        <td class="right money">${fmtEur(f.total_ttc)}</td>
        <td>
          <button class="btn secondary small" data-pdf-facture="${esc(f.id)}" type="button">PDF</button>
          <button class="btn secondary small" data-recap="${esc(f.id)}" type="button">Récap Accountable</button>
          <button class="btn danger small" data-del-facture="${esc(f.id)}" type="button">✕</button>
        </td></tr>`).join("") || `<tr><td colspan="7" class="muted">Aucune facture.</td></tr>`}</tbody>
    </table></div>`;
  const prof = await api("profile").catch(() => ({}));
  const franchise = prof.tva_regime === "franchise";
  const peppolNote = franchise
    ? "Régime de franchise (art. 44 §2) : l'émission Peppol n'est pas obligatoire pour toi, mais enregistre-toi sur Peppol via Accountable pour recevoir tes factures fournisseurs. B2B comme B2C : le PDF envoyé par e-mail suffit."
    : `En B2B belge (assujetti), la facture doit être envoyée en Peppol BIS 3.0 via un access point certifié : crée-la dans <a href="https://app.accountable.eu/" target="_blank" rel="noopener">Accountable</a> (bouton « Récap Accountable » pour copier les données), puis marque-la « Envoyée (Peppol) » ici. En B2C, un e-mail suffit.`;
  el.innerHTML += `<div class="card"><p class="muted">${peppolNote}</p></div>`;
  $("#btn-new-facture").addEventListener("click", () => openFactureModal(null));
  $("#btn-quick-facture").addEventListener("click", () => openQuickCreate("facture"));
  $$("[data-pdf-facture]").forEach((b) => b.addEventListener("click", () => window.open("document.html?type=facture&id=" + b.dataset.pdfFacture, "_blank")));
  $$(".statut-facture").forEach((sel) => sel.addEventListener("change", async () => {
    await api("factures/" + sel.dataset.id, { method: "PUT", body: JSON.stringify({ statut: sel.value }) });
    renderFactures();
    $("#tab-dashboard").dataset.loaded = "";
  }));
  $$("[data-del-facture]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Supprimer cette facture du suivi ?")) return;
    await api("factures/" + b.dataset.delFacture, { method: "DELETE" });
    renderFactures();
  }));
  $$("[data-recap]").forEach((b) => b.addEventListener("click", () => recapAccountable(b.dataset.recap)));
}

async function openFactureModal(id, devisId = null) {
  let devis = null;
  if (devisId) {
    devis = devisCache.find((d) => d.id === devisId);
    if (!devis) { devisCache = await api("devis"); devis = devisCache.find((d) => d.id === devisId); }
  }
  const f = id ? facturesCache.find((x) => x.id === id) : null;
  const clientId = f?.client_id || devis?.client_id || "";
  const modal = openModal(`
    <h2>${f ? "Facture " + esc(f.numero) : "Nouvelle facture"}</h2>
    ${devis ? `<p class="muted">Issue du devis ${esc(devis.numero)} (${fmtEur(devis.total_ttc)} TTC)</p>` : ""}
    <div class="row"><div><label>Client *</label><select id="f-client">${clientsCache.map((c) => `<option value="${esc(c.id)}" ${clientId === c.id ? "selected" : ""}>${esc(c.nom)}${c.societe ? " — " + esc(c.societe) : ""}</option>`).join("")}</select></div>
    <div><label>N° (vide = auto)</label><input type="text" id="f-numero" value="${esc(f?.numero)}" placeholder="F-2026-001"></div></div>
    <div class="row"><div><label>Date</label><input type="date" id="f-date" value="${f?.date || todayStr()}"></div>
    <div><label>Échéance</label><input type="date" id="f-echeance" value="${f?.echeance || (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })()}"></div></div>
    <div class="row"><div><label id="f-ht-label">Montant HT (€) *</label><input type="number" id="f-ht" min="0" step="0.01" value="${f?.montant_ht ?? devis?.total_ht ?? 0}"><div class="muted" id="f-hint"></div>
    <label class="muted" style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="f-ttc"> saisir en TTC (HT/TVA calculés)</label></div>
    <div><label>Taux TVA (%)</label><input type="number" id="f-tva" min="0" max="100" step="0.5" value="${f?.taux_tva ?? devis?.taux_tva ?? 21}"></div>
    <div><label>Statut</label><select id="f-statut">${Object.entries(FACTURE_STATUTS).map(([k, v]) => `<option value="${k}" ${f?.statut === k ? "selected" : ""}>${v}</option>`).join("")}</select></div></div>
    <div><label>Note</label><input type="text" id="f-note" value="${esc(f?.note)}"></div>
    <div class="modal-actions">
      <button class="btn secondary" id="f-cancel" type="button">Annuler</button>
      <button class="btn" id="f-save" type="button">Enregistrer</button>
    </div>`);
  const syncF = () => {
    const ttcMode = $("#f-ttc", modal).checked;
    const taux = Number($("#f-tva", modal).value) || 0;
    const val = Number($("#f-ht", modal).value) || 0;
    $("#f-ht-label", modal).textContent = ttcMode ? "Montant TTC (€) *" : "Montant HT (€) *";
    $("#f-hint", modal).textContent = ttcMode && val > 0
      ? "→ HT " + fmtEur(Math.round((val / (1 + taux / 100)) * 100) / 100) + " · TVA " + fmtEur(val - Math.round((val / (1 + taux / 100)) * 100) / 100)
      : "";
  };
  ["f-ttc", "f-tva", "f-ht"].forEach((id) => $("#" + id, modal).addEventListener("input", syncF));
  syncF();
  $("#f-cancel", modal).addEventListener("click", closeModal);
  $("#f-save", modal).addEventListener("click", async () => {
    const ttcMode = $("#f-ttc", modal).checked;
    const val = Number($("#f-ht", modal).value) || 0;
    const body = {
      client_id: $("#f-client", modal).value,
      numero: $("#f-numero", modal).value,
      date: $("#f-date", modal).value,
      echeance: $("#f-echeance", modal).value,
      montant_ht: ttcMode ? undefined : val,
      montant_ttc: ttcMode ? val : undefined,
      taux_tva: Number($("#f-tva", modal).value) || 21,
      statut: $("#f-statut", modal).value,
      note: $("#f-note", modal).value,
      devis_id: devisId || null,
    };
    try {
      if (id) await api("factures/" + id, { method: "PUT", body: JSON.stringify(body) });
      else await api("factures", { method: "POST", body: JSON.stringify(body) });
      closeModal();
      renderFactures();
      $("#tab-dashboard").dataset.loaded = "";
    } catch (err) { alert(err.message); }
  });
}

function recapAccountable(factureId) {
  const f = facturesCache.find((x) => x.id === factureId);
  if (!f) return;
  const tva = Math.round((f.total_ttc - f.montant_ht) * 100) / 100;
  const texte = [
    `Facture ${f.numero} — à créer dans Accountable (envoi Peppol)`,
    `Client : ${f.client_nom}${f.client_societe ? " — " + f.client_societe : ""}`,
    f.client_tva ? `N° TVA client : ${f.client_tva}` : "Client particulier (B2C : envoi par e-mail accepté)",
    `Date : ${fmtDate(f.date)}`,
    `Échéance : ${fmtDate(f.echeance)}`,
    `Montant HT : ${f.montant_ht.toFixed(2)} €`,
    `TVA (${f.taux_tva} %) : ${tva.toFixed(2)} €`,
    `Total TTC : ${f.total_ttc.toFixed(2)} €`,
  ].join("\n");
  const done = () => alert("Récapitulatif copié dans le presse-papiers. Collez-le dans Accountable, envoyez via Peppol, puis marquez la facture « Envoyée (Peppol) ».");
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texte).then(done, () => { prompt("Copiez ce récap :", texte); });
  else prompt("Copiez ce récap :", texte);
}

function openQuickCreate(kind) {
  const isDevis = kind === "devis";
  const modal = openModal(`
    <h2>${isDevis ? "⚡ Devis rapide" : "⚡ Facture rapide"}</h2>
    <div class="row"><div><label>Client existant</label><select id="q-client">${clientsCache.map((c) => `<option value="${esc(c.id)}">${esc(c.nom)}${c.societe ? " — " + esc(c.societe) : ""}</option>`).join("")}</select></div>
    <div><label>…ou nouveau client (B2C)</label><input type="text" id="q-newclient" placeholder="Nom du client…"></div></div>
    ${isDevis ? '<div><label>Description</label><input type="text" id="q-desc" value="Prestation"></div>' : ""}
    <div class="row"><div><label id="q-ht-label">Montant HT (€)</label><input type="number" id="q-ht" min="0" step="0.01" value="0"><div class="muted" id="q-hint"></div></div>
    <div><label>Taux TVA</label><select id="q-tva"><option value="21">21 %</option><option value="6">6 %</option><option value="0">0 %</option></select></div></div>
    <label class="muted" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="q-ttc"> Saisir le montant TTC — HT et TVA calculés automatiquement</label>
    <p class="muted">Le PDF (logo + tes coordonnées) s'ouvre juste après. Facture B2B : l'envoi officiel reste Peppol via Accountable.</p>
    <div class="modal-actions">
      <button class="btn secondary" id="q-cancel" type="button">Annuler</button>
      <button class="btn" id="q-save" type="button">Créer + ouvrir le PDF</button>
    </div>`);
  const syncQ = () => {
    const ttcMode = $("#q-ttc", modal).checked;
    const taux = Number($("#q-tva", modal).value);
    const val = Number($("#q-ht", modal).value) || 0;
    $("#q-ht-label", modal).textContent = ttcMode ? "Montant TTC (€)" : "Montant HT (€)";
    $("#q-hint", modal).textContent = ttcMode && val > 0
      ? "→ HT " + fmtEur(Math.round((val / (1 + taux / 100)) * 100) / 100) + " · TVA " + fmtEur(val - Math.round((val / (1 + taux / 100)) * 100) / 100)
      : "";
  };
  ["q-ttc", "q-tva", "q-ht"].forEach((id) => $("#" + id, modal).addEventListener("input", syncQ));
  syncQ();
  $("#q-cancel", modal).addEventListener("click", closeModal);
  $("#q-save", modal).addEventListener("click", async () => {
    try {
      let clientId = $("#q-client", modal).value;
      const newName = $("#q-newclient", modal).value.trim();
      if (newName) {
        const r = await api("clients", { method: "POST", body: JSON.stringify({ nom: newName, type: "b2c" }) });
        clientId = r.id;
        clientsCache = await api("clients");
      }
      if (!clientId) { alert("Choisis ou crée un client."); return; }
      const taux = Number($("#q-tva", modal).value);
      const val = Number($("#q-ht", modal).value) || 0;
      const ttcMode = $("#q-ttc", modal).checked;
      if (val <= 0) { alert("Montant obligatoire."); return; }
      const desc = ($("#q-desc", modal)?.value || "").trim() || "Prestation";
      if (isDevis) {
        const payload = { client_id: clientId, taux_tva: taux };
        if (ttcMode) { payload.montant_ttc = val; payload.description = desc; }
        else payload.lignes = [{ description: desc, qty: 1, prix_ht: val }];
        const r = await api("devis", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        renderDevis();
        window.open("document.html?type=devis&id=" + r.id, "_blank");
      } else {
        const payload = { client_id: clientId, taux_tva: taux };
        if (ttcMode) payload.montant_ttc = val; else payload.montant_ht = val;
        const r = await api("factures", { method: "POST", body: JSON.stringify(payload) });
        closeModal();
        renderFactures();
        $("#tab-dashboard").dataset.loaded = "";
        window.open("document.html?type=facture&id=" + r.id, "_blank");
      }
    } catch (err) { alert(err.message); }
  });
}

async function renderProfil() {
  const el = $("#tab-profil");
  el.innerHTML = `
    <div class="card">
      <h2>Mon profil — coordonnées sur les PDF devis/factures</h2>
      <div class="row"><div><label>Nom / entreprise</label><input type="text" id="p-nom" placeholder="Edukisto — David …"></div>
      <div><label>Régime TVA</label><select id="p-regime"><option value="assujetti">Assujetti à la TVA</option><option value="franchise">Non assujetti — franchise (art. 44 §2)</option></select></div></div>
      <div><label>N° TVA (si assujetti)</label><input type="text" id="p-tva" placeholder="BE0123456789"></div>
      <div><label>Adresse</label><input type="text" id="p-adresse"></div>
      <div class="row"><div><label>IBAN (paiement)</label><input type="text" id="p-iban" placeholder="BE68 5390 0754 7034"></div>
      <div><label>Site</label><input type="text" id="p-site"></div></div>
      <div class="row"><div><label>E-mail</label><input type="email" id="p-email"></div>
      <div><label>Téléphone</label><input type="tel" id="p-tel"></div></div>
      <div><label>Mentions en pied de page</label><textarea id="p-mentions" placeholder="Paiement à 30 jours sur IBAN…"></textarea></div>
      <p class="muted">Charte fixe : logo Edukisto + bleu #38bdf8 sur fond blanc (impression A4). En franchise (art. 44 §2), la mention « Dispensé du paiement de la TVA — art. 44 §2 du Code TVA » est ajoutée automatiquement sur chaque facture et la TVA est forcée à 0 %. En assujetti B2B, l'envoi officiel reste Peppol via Accountable.</p>
      <p id="p-msg" class="error"></p>
      <button class="btn" id="p-save" type="button">Enregistrer</button>
    </div>`;
  const p = await api("profile");
  const set = (id, v) => { $("#" + id).value = v || ""; };
  set("p-nom", p.nom); set("p-tva", p.tva); set("p-adresse", p.adresse); set("p-iban", p.iban);
  set("p-site", p.site); set("p-email", p.email); set("p-tel", p.tel); set("p-mentions", p.mentions);
  set("p-regime", p.tva_regime || "assujetti");
  const syncRegime = () => {
    const fr = $("#p-regime").value === "franchise";
    const tvaEl = $("#p-tva");
    tvaEl.disabled = fr;
    tvaEl.placeholder = fr ? "Non assujetti — art. 44 §2" : "BE0123456789";
  };
  $("#p-regime").addEventListener("change", syncRegime);
  syncRegime();
  $("#p-save").addEventListener("click", async () => {
    try {
      await api("profile", { method: "PUT", body: JSON.stringify({
        nom: $("#p-nom").value, tva: $("#p-tva").value, tva_regime: $("#p-regime").value, adresse: $("#p-adresse").value,
        iban: $("#p-iban").value, site: $("#p-site").value, email: $("#p-email").value,
        tel: $("#p-tel").value, mentions: $("#p-mentions").value,
      }) });
      $("#p-msg").textContent = "";
      alert("Profil enregistré.");
    } catch (err) { $("#p-msg").textContent = err.message; }
  });
}

boot();
