const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtEur = (n) => Number(n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
const fmtDate = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

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
    const res = await fetch(`/api/document?type=${type}&id=${encodeURIComponent(id)}`);
    if (res.status === 401) {
      page.innerHTML = '<p id="err">Session expirée — <a href="/">reconnecte-toi dans l\'app</a>, puis reviens sur ce document.</p>';
      return;
    }
    data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur");
  } catch (e) {
    page.innerHTML = `<p id="err">${esc(e.message)} — <a href="/">Retour</a></p>`;
    return;
  }
  const { profile, client, doc, franchise, mention_tva } = data;
  const isDevis = type === "devis";
  const titre = isDevis ? "Devis" : "Facture";
  document.title = `${titre} ${doc.numero} — ${profile.nom || "Edukisto"}`;

  const emetteur = [profile.nom || "Edukisto", profile.adresse, franchise ? "Non assujetti à la TVA — régime de franchise (art. 44 §2 du Code TVA)" : (profile.tva ? `TVA : ${profile.tva}` : ""), profile.iban ? `IBAN : ${profile.iban}` : "", [profile.email, profile.tel].filter(Boolean).join(" · "), profile.site].filter(Boolean).join("\n");
  const clientLines = [client.nom, client.societe, client.adresse, client.email, client.tva ? `N° TVA : ${client.tva}` : ""].filter(Boolean).join("\n");

  const meta = isDevis
    ? `Date : ${fmtDate(doc.date)}\nValable ${doc.validite_jours} jours (jusqu'au ${fmtDate(validUntil(doc.date, doc.validite_jours))})`
    : `Date : ${fmtDate(doc.date)}\nÉchéance : ${fmtDate(doc.echeance)}${doc.en_retard ? "\n⚠ en retard de paiement" : ""}`;

  const lignes = isDevis
    ? (doc.lignes || [])
    : (doc.lignes && doc.lignes.length ? doc.lignes : [{ description: "Prestation", qty: 1, prix_ht: doc.montant_ht }]);

  const lignesHtml = lignes.map((l) => `
    <tr>
      <td>${esc(l.description)}</td>
      <td class="right money">${Number(l.qty || 1)}</td>
      <td class="right money">${fmtEur(l.prix_ht)}</td>
      <td class="right money">${fmtEur((Number(l.qty) || 1) * (Number(l.prix_ht) || 0))}</td>
    </tr>`).join("");

  const tva = Math.round(((isDevis ? doc.total_ttc : doc.total_ttc) - (isDevis ? doc.total_ht : doc.montant_ht)) * 100) / 100;
  const ht = isDevis ? doc.total_ht : doc.montant_ht;
  const ttc = doc.total_ttc;

  const b2bNote = !isDevis && client.type === "b2b"
    ? (franchise
      ? `<div class="b2b-note">Régime de franchise (art. 44 §2) : l'émission Peppol n'est pas obligatoire pour toi. Enregistre-toi quand même sur Peppol via Accountable pour recevoir tes factures fournisseurs. Ce PDF peut être envoyé par e-mail.</div>`
      : `<div class="b2b-note">Client professionnel belge : cette facture doit être émise via <strong>Peppol</strong> (Accountable). Ce PDF est une copie lisible envoyée en parallèle.</div>`)
    : "";

  page.innerHTML = `
    <header class="doc-header">
      <div>
        <div class="brand"><img src="brand/edukisto-mark.svg" alt=""><div class="name">Edu<span>kisto</span></div></div>
        <div class="emetteur">${esc(emetteur)}</div>
      </div>
      <div class="doc-title">
        <h1>${titre}</h1>
        <div class="num">${esc(doc.numero)}</div>
        <div class="meta">${esc(meta)}</div>
      </div>
    </header>
    <section class="client-block">
      <div class="label">${isDevis ? "Destinataire" : "Client"}</div>
      <div class="nom">${esc(client.nom)}${client.societe ? " — " + esc(client.societe) : ""}</div>
      <div class="pre">${esc(clientLines)}</div>
    </section>
    ${b2bNote}
    <table>
      <thead><tr><th>Description</th><th class="right">Qté</th><th class="right">Prix HT</th><th class="right">Total HT</th></tr></thead>
      <tbody>${lignesHtml}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Sous-total HT</span><span class="money">${fmtEur(ht)}</span></div>
      <div class="row"><span>TVA (${doc.taux_tva} %)</span><span class="money">${fmtEur(tva)}</span></div>
      <div class="row ttc"><span>Total TTC</span><span class="money">${fmtEur(ttc)}</span></div>
    </div>
    ${mention_tva ? `<p class="mention-tva">${esc(mention_tva)}</p>` : ""}
    ${doc.note ? `<p class="doc-note">${esc(doc.note)}</p>` : ""}
    <footer class="doc-footer">
      <div class="coords">${esc(emetteur)}</div>
      ${profile.mentions ? `<div class="mentions">${esc(profile.mentions)}</div>` : ""}
    </footer>`;

  $("#btn-print").addEventListener("click", () => window.print());
}

function validUntil(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Number(days || 30));
  return d.toISOString().slice(0, 10);
}

boot();
