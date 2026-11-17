const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const fmtEur = (value) => Number(value || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
const fmtDate = (value) => {
  if (!value) return "";
  const date = String(value).slice(0, 10);
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
};
const fmtQty = (value) => Number(value || 0).toLocaleString("fr-BE", { maximumFractionDigits: 2 });

async function boot() {
  const params = new URLSearchParams(location.search);
  const type = params.get("type");
  const id = params.get("id");
  const page = $("#doc");
  if (!id || (type !== "devis" && type !== "facture")) {
    page.innerHTML = '<p id="err">Paramètres invalides (type=devis|facture, id=…). <a href="/">Retour</a></p>';
    return;
  }
  let data;
  try {
    const response = await fetch(`/api/document?type=${type}&id=${encodeURIComponent(id)}`);
    if (response.status === 401) {
      page.innerHTML = '<p id="err">Session expirée — <a href="/">reconnecte-toi dans l\'app</a>, puis reviens sur ce document.</p>';
      return;
    }
    data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur");
  } catch (error) {
    page.innerHTML = `<p id="err">${esc(error.message)} — <a href="/">Retour</a></p>`;
    return;
  }

  const { profile, client, doc, franchise, mention_tva, est_test } = data;
  const isDevis = type === "devis";
  const title = isDevis ? "Devis" : "Facture";
  const brand = profile.nom || "Edukisto";
  const documentLabel = title;
  document.title = `${title}${est_test ? " (exemple)" : ""} ${doc.numero} — ${brand}`;

  const coordinates = [
    profile.adresse,
    profile.bce ? `N° entreprise : ${profile.bce}` : "",
    !franchise && profile.tva ? `TVA : ${profile.tva}` : "",
    profile.iban ? `IBAN : ${profile.iban}` : "",
    [profile.email, profile.tel].filter(Boolean).join(" · "),
    profile.site,
  ]
    .filter(Boolean)
    .join("\n");

  const clientName = client.display_name || [client.societe, client.nom].filter(Boolean).join(" — ");
  const normalizeName = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const showContact =
    client.societe &&
    client.nom &&
    !normalizeName(client.societe).includes(normalizeName(client.nom)) &&
    !normalizeName(client.nom).includes(normalizeName(client.societe));
  const clientContact = showContact ? client.nom : "";
  const clientLines = [clientContact ? `Contact : ${clientContact}` : "", client.adresse, client.email, client.tva ? `N° TVA : ${client.tva}` : ""]
    .filter(Boolean)
    .join("\n");

  const meta = [
    `Date : ${fmtDate(doc.date)}`,
    isDevis
      ? `Valable ${doc.validite_jours} jours (jusqu'au ${fmtDate(validUntil(doc.date, doc.validite_jours))})`
      : `Échéance : ${fmtDate(doc.echeance)}`,
    doc.date_prestation ? `Prestation : ${fmtDate(doc.date_prestation)}` : "",
    doc.numero_externe ? `Réf. Accountable : ${doc.numero_externe}` : "",
    !isDevis && doc.en_retard ? "En retard de paiement" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = doc.lignes || [];
  const linesHtml = lines
    .map((line) => {
      const qty = Number(line.qty || 0);
      const price = Number(line.prix_ht || 0);
      return `<tr>
        <td>${esc(line.description)}</td>
        <td class="right money">${fmtQty(qty)}</td>
        <td class="right money">${fmtEur(price)}</td>
        <td class="right money">${fmtEur(qty * price)}</td>
      </tr>`;
    })
    .join("");

  const totalHt = Number(doc.total_ht || 0);
  const totalTtc = Number(doc.total_ttc || 0);
  const vat = franchise ? 0 : Math.max(0, Number(doc.tva || totalTtc - totalHt));

  const totals = franchise
    ? `<div class="row ttc"><span>Total à payer</span><span class="money">${fmtEur(totalHt)}</span></div>`
    : `<div class="row"><span>Sous-total HT</span><span class="money">${fmtEur(totalHt)}</span></div>
       <div class="row"><span>TVA (${Number(doc.taux_tva || 0)} %)</span><span class="money">${fmtEur(vat)}</span></div>
       <div class="row ttc"><span>Total TTC</span><span class="money">${fmtEur(totalTtc)}</span></div>`;

  const officialNote = !isDevis && doc.numero_externe
    ? `<p class="official">Facture officielle émise via Accountable (Peppol) — référence ${esc(doc.numero_externe)}. Cette copie est un justificatif de travail.</p>`
    : "";

  page.innerHTML = `
    ${est_test ? '<div class="test-banner">EXEMPLE — document de travail, ne pas envoyer au client</div>' : ""}
    <header class="doc-header">
      <div class="emitter">
        <div class="brand"><img src="brand/edukisto-mark.svg" alt=""><div class="name">${esc(brand)}</div></div>
        <div class="emitter-lines">${esc(coordinates)}</div>
      </div>
      <div class="doc-title">
        <h1>${esc(documentLabel)}</h1>
        <div class="num">${esc(doc.numero)}</div>
        <div class="meta">${esc(meta)}</div>
      </div>
    </header>
    <section class="client-block">
      <div class="label">${isDevis ? "Destinataire" : "Client"}</div>
      <div class="nom">${esc(clientName)}</div>
      <div class="pre">${esc(clientLines)}</div>
    </section>
    <table class="lines">
      <thead><tr><th>Description</th><th class="right">Qté</th><th class="right">Prix HT</th><th class="right">Total HT</th></tr></thead>
      <tbody>${linesHtml || '<tr><td colspan="4" class="muted">Aucune ligne.</td></tr>'}</tbody>
    </table>
    <div class="totals">${totals}</div>
    ${mention_tva ? `<p class="mention-tva">${esc(mention_tva)}</p>` : ""}
    ${officialNote}
    ${doc.note ? `<p class="doc-note">${esc(doc.note)}</p>` : ""}
    <footer class="doc-footer">
      <div class="mentions">${esc(profile.mentions || (!isDevis ? "Paiement à 30 jours par virement sur l'IBAN repris en en-tête." : ""))}</div>
      <div class="page-ref">${esc(brand)} · ${esc(profile.site || "")}</div>
    </footer>`;

  $("#btn-print").addEventListener("click", () => window.print());
}

function validUntil(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

boot();
