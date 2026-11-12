#!/bin/bash
V="$1"
if [ -z "$V" ]; then echo "Usage: ./scripts/version.sh vX.Y"; exit 1; fi
OLD=$(cat public/version.txt)
echo "Ancienne: $OLD → Nouvelle: $V"
sed -i "s/$OLD/$V/g" public/js/app.js public/js/storage.js public/js/sync.js public/js/meteo.js public/js/sons.js public/sw.js public/index.html public/css/style.css
echo "$V" > public/version.txt
grep -o 'app.js?v=[^"]*' public/index.html | head -1
node --check public/js/app.js && echo "OK version mise a jour partout"
