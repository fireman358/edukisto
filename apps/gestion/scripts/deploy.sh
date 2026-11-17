#!/usr/bin/env bash
# Déploiement one-shot de l'app gestion (gestion.edukisto.win).
# À lancer depuis ta machine, avec wrangler déjà connecté à ton compte Cloudflare
# (npx wrangler login, ou CLOUDFLARE_API_TOKEN dans l'environnement — ne le colle nulle part).
# Aucun secret n'est affiché ni commité : AUTH_SECRET est généré aléatoirement ici.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== 0. Vérifications =="
command -v npx >/dev/null 2>&1 || { echo "Node.js/npx requis"; exit 1; }
npx wrangler whoami

PLACEHOLDER="00000000-0000-0000-0000-000000000000"

echo "== 1. Base D1 'gestion' =="
if grep -q "$PLACEHOLDER" wrangler.jsonc; then
  echo "Création de la base D1…"
  OUT=$(npx wrangler d1 create gestion --json 2>/dev/null || npx wrangler d1 create gestion)
  ID=$(echo "$OUT" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const o=Array.isArray(j)?j[0]:j;console.log(o.database_id||'')}catch{const m=s.match(/database_id[\"':\s]+([0-9a-f-]{36})/i);console.log(m?m[1]:'')}})")
  if [ -z "$ID" ] || [ "$ID" = "$PLACEHOLDER" ]; then echo "Impossible de récupérer le database_id :"; echo "$OUT"; exit 1; fi
  node -e "const fs=require('fs');const p='wrangler.jsonc';fs.writeFileSync(p,fs.readFileSync(p,'utf8').split(process.argv[1]).join(process.argv[2]))" "$PLACEHOLDER" "$ID"
  echo "database_id renseigné dans wrangler.jsonc : $ID"
  echo "-> commit ce changement avant de continuer : git add apps/gestion/wrangler.jsonc && git commit -m 'gestion: database_id D1' && git push"
  read -rp "Commit fait et pushé ? [o/N] " ans
  [ "$ans" = "o" ] || [ "$ans" = "O" ] || exit 1
else
  echo "database_id déjà renseigné."
fi

echo "== 2. Schéma D1 (tables) =="
npx wrangler d1 execute gestion --remote --file=d1/schema.sql

echo "== 3. Secret de session AUTH_SECRET =="
if npx wrangler secret list 2>/dev/null | grep -q "AUTH_SECRET"; then
  echo "AUTH_SECRET déjà défini, on ne le touche pas."
else
  openssl rand -hex 32 | npx wrangler secret put AUTH_SECRET
  echo "AUTH_SECRET créé (32 octets aléatoires, non affiché)."
fi

echo "== 4. Déploiement du Worker =="
npx wrangler deploy

echo
echo "== Terminé =="
echo "Le Worker 'gestion' est en ligne (URL *.workers.dev affichée ci-dessus)."
echo "Reste à faire dans le dashboard Cloudflare :"
echo "  Workers & Pages > gestion > Settings > Domains & Routes > Add > Custom Domain"
echo "  -> 'gestion.edukisto.win' (zone edukisto.win)."
echo "Alternative API (token avec droits zone) : décommente 'routes' dans wrangler.jsonc et redeploie."
echo "Puis ouvre https://gestion.edukisto.win/ : la première connexion crée le mot de passe."
