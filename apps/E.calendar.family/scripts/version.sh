#!/bin/bash
V="$1"
if [ -z "$V" ]; then echo "Usage: ./scripts/version.sh vX.Y"; exit 1; fi
OLD=$(cat version.txt)
echo "Ancienne: $OLD → Nouvelle: $V"
sed -i "s/$OLD/$V/g" js/app.js js/storage.js js/sync.js js/meteo.js js/sons.js sw.js index.html css/style.css
echo "$V" > version.txt
grep -o 'app.js?v=[^"]*' index.html | head -1
node --check js/app.js && echo "OK version mise a jour partout"
