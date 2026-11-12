// Point d'entrée du harnais : tsc (voir tsconfig.tools.json) émet du CommonJS
// dans .tmp/build, puis on marque ce dossier comme CommonJS car le projet est
// en "type": "module".
const fs = require('node:fs');
const path = require('node:path');

const out = path.join(__dirname, '..', '.tmp', 'build');
const entry = path.join(out, 'tools', 'balance.js');
if (!fs.existsSync(entry)) {
  console.error('Harnais non compilé : lancez `npx tsc -p tsconfig.tools.json`.');
  process.exit(1);
}
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ type: 'commonjs' }));
require(entry);
