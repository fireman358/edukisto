/* ics-proxy — proxy public multi-usage pour n'importe quel agenda iCal Google.
   Déployé une fois (ex. ics.edukisto.win), il permet à n'importe quel utilisateur
   d'Edukisto Home d'importer son agenda Google sans blocage CORS.

   Usage : https://ics.edukisto.win/?url=<URL iCal Google encodée>
   Sécurité : uniquement les URLs calendar.google.com en https (aucun stockage,
   aucun log des URLs — le worker ne fait que relayer avec un cache de 5 min). */

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const cible = url.searchParams.get("url");
    if (!cible) {
      return new Response(
        JSON.stringify({ service: "ics-proxy · edukisto", usage: "/?url=<URL iCal Google>" }, null, 2),
        { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Sécurité : uniquement les agendas Google en https
    if (!/^https:\/\/calendar\.google\.com\/calendar\/ical\//.test(cible)) {
      return new Response("URL non autorisée : uniquement les agendas calendar.google.com", {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    try {
      const r = await fetch(cible);
      if (!r.ok) {
        return new Response("Google a répondu " + r.status, {
          status: r.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
      const data = await r.text();
      return new Response(data, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "max-age=300",
        },
      });
    } catch (err) {
      return new Response("Erreur proxy : " + err.message, {
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
