/* calendar-proxy (gcal) — proxy multi-agendas Google pour eCalendar Family
   Déploiement : Cloudflare Workers (repo GitHub avec ce worker.js à la racine)
   
   Chaque agenda = une entrée AGENDAS ci-dessous :
     - chemin : l'URL locale, ex. /papa  → https://gcal.<ton-domaine>/papa
     - url    : l'URL secrète iCal Google (Google Agenda → Paramètres de l'agenda
                → Adresse secrète au format iCal)
     - couleur : (optionnel, non utilisé par le Worker — l'app gère ses couleurs)

   Ajouter un agenda = ajouter une ligne. Rien d'autre à faire :
   le push GitHub redéploie automatiquement. */

const AGENDAS = {
  "papa":  "COLLE_ICI_URL_ICAL_SECRETE_DE_PAPA",
  "maman": "COLLE_ICI_URL_ICAL_SECRETE_DE_MAMAN",
  // Exemples — ajoute/décommente autant de lignes que d'agendas :
  // "lulu":  "https://calendar.google.com/calendar/ical/xxxx/private-xxxx/basic.ics",
  // "gabi":  "https://calendar.google.com/calendar/ical/yyyy/private-yyyy/basic.ics",
};

/* Fusionne plusieurs agendas ? /tout renvoie la fusion de tous :
   pratique pour un affichage familial global. */
const SERVIR_FUSION = true;

/* ============ Code du Worker — rien à modifier ci-dessous ============ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function reponseTexte(texte, cache) {
  return new Response(texte, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `max-age=${cache || 300}`,
    },
  });
}

async function telechargerICS(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.text();
}

function fusionner(listeICS) {
  // Fusionne des calendriers ICS en un seul (on garde les VEVENT de chacun)
  const evenements = listeICS.map(txt => {
    const m = txt.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    return m.join("\r\n");
  }).filter(e => e).join("\r\n");
  return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//edukisto//gcal//FR\r\n"
    + evenencesSafe(evenements)
    + "\r\nEND:VCALENDAR";
}
function evenencesSafe(e) { return e; }

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const nom = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();

    try {
      // Un agenda précis : /papa, /maman, ...
      if (AGENDAS[nom]) {
        const data = await telechargerICS(AGENDAS[nom]);
        return reponseTexte(data, 300);
      }

      // Fusion de tous : /tout
      if (SERVIR_FUSION && (nom === "tout" || nom === "")) {
        const textes = await Promise.all(
          Object.values(AGENDAS).map(u => telechargerICS(u).catch(() => ""))
        );
        return reponseTexte(fusionner(textes), 300);
      }

      // Page d'accueil : liste des agendas disponibles
      const noms = Object.keys(AGENDAS);
      return new Response(
        JSON.stringify({
          service: "gcal — proxy agendas Google · edukisto",
          agendas: noms.map(n => "/" + n),
          fusion: SERVIR_FUSION ? "/tout" : null,
        }, null, 2),
        { headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } }
      );
    } catch (err) {
      return new Response("Erreur Worker: " + err.message, { status: 500, headers: CORS });
    }
  },
};
