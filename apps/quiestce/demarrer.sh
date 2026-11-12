#!/usr/bin/env sh
# Serveur statique local pour activer le service worker et l'installation PWA.
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8080}"

if command -v node >/dev/null 2>&1; then
  (sleep 1; if command -v xdg-open >/dev/null 2>&1; then xdg-open "http://127.0.0.1:$PORT/"; elif command -v open >/dev/null 2>&1; then open "http://127.0.0.1:$PORT/"; fi) &
  exec node serve.mjs "$PORT"
fi

if command -v python3 >/dev/null 2>&1; then
  (sleep 1; if command -v xdg-open >/dev/null 2>&1; then xdg-open "http://127.0.0.1:$PORT/"; elif command -v open >/dev/null 2>&1; then open "http://127.0.0.1:$PORT/"; fi) &
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi

echo "Node.js ou Python est nécessaire pour lancer le serveur local."
echo "index.html peut aussi être ouvert directement, sans installation PWA."
