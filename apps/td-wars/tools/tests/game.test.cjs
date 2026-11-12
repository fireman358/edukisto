/**
 * Tests du noyau, sans navigateur ni dépendance :
 *   npm test
 *
 * Ils s'exécutent sur la compilation CommonJS produite dans .tmp/build.
 */
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const build = path.join(__dirname, '..', '..', '.tmp', 'build');
fs.mkdirSync(build, { recursive: true });
fs.writeFileSync(path.join(build, 'package.json'), JSON.stringify({ type: 'commonjs' }));
const mod = (p) => require(path.join(build, 'src/game', p));

const storage = mod('storage.js');
const settings = mod('settings.js');
const meta = mod('meta.js');
const run = mod('run.js');
const engineMod = mod('engine.js');
const config = mod('config.js');
const enemyMod = mod('enemy.js');
const towerMod = mod('tower.js');

test('storage : bornes et repli', () => {
  assert.equal(storage.num(NaN, 0.8), 0.8);
  assert.equal(storage.num(5, 0.8, 0, 1), 1);
  assert.equal(storage.num('3', 2), 2);
  assert.equal(storage.int(2.7, 0), 3);
  assert.equal(storage.int(-4, 0, 0), 0);
  assert.equal(storage.bool('oui', true), true);
  assert.equal(storage.bool(false, true), false);
});

test('settings : volume invalide ramené dans le domaine', () => {
  const bad = settings.validateSettings({ volume: Number.NaN, graphics: 'flou', sfx: 'oui' });
  assert.equal(bad.volume, settings.DEFAULT_SETTINGS.volume);
  assert.equal(bad.graphics, '2.5d');
  assert.equal(bad.sfx, true);
  assert.equal(settings.validateSettings({ volume: 4 }).volume, 1);
  assert.equal(settings.validateSettings(null), null);
});

test('meta : migration sans perte et bornes', () => {
  const migrated = meta.validateMeta({ points: 12, bestWave: 7 });
  assert.equal(migrated.points, 12);
  assert.equal(migrated.bestWave, 7);
  assert.deepEqual(migrated.perks, { credits: 0, lives: 0, saber: 0, shield: 0 });

  const clamped = meta.validateMeta({ points: -3, perks: { credits: 99, lives: 2 } });
  assert.equal(clamped.points, 0);
  assert.equal(clamped.perks.credits, 5);
  assert.equal(clamped.perks.lives, 2);
});

test('meta : remboursement du respec avec taxe', () => {
  const m = meta.emptyMeta();
  m.perks.credits = 2; // 5 + 10 points dépensés
  assert.equal(meta.respecPoints(m), 12); // 15 * 0.8
  assert.equal(meta.perkCost(0), 5);
});

test('run : une sauvegarde sans vague est refusée', () => {
  assert.equal(run.validateRun({ wave: -1, sector: 0 }), null);
  assert.equal(run.validateRun('nope'), null);
  const ok = run.validateRun({ wave: 4, sector: 1, credits: 300, lives: 12, towers: [] });
  assert.equal(ok.sector, 1);
  assert.equal(ok.wave, 4);
});

test('run : aller-retour sauvegarde / reprise', () => {
  const engine = new engineMod.Engine();
  engine.credits = 500;
  engine.waveIndex = 2;
  engine.placeTower('plasma', { x: 300, y: 200 });
  const snapshot = run.snapshotRun(engine);

  const fresh = new engineMod.Engine();
  run.restoreRun(fresh, run.validateRun(snapshot));
  assert.equal(fresh.towers.length, engine.towers.length);
  assert.equal(fresh.waveIndex, 2);
  assert.equal(fresh.credits, engine.credits);
  assert.equal(fresh.seed, engine.seed);
  // le tracé est régénéré à l'identique grâce à la graine
  assert.equal(fresh.paths[0].total, engine.paths[0].total);
});

test('secteurs : chaque voie occupe sa propre bande', () => {
  const engine = new engineMod.Engine();
  for (let i = 0; i < config.SECTORS.length; i++) {
    engine.loadSector(i);
    assert.equal(engine.paths.length, config.SECTORS[i].lanes);
    if (engine.paths.length > 1) {
      const bands = engine.paths.map((p) => {
        const ys = p.pts.map((pt) => pt.y);
        return [Math.min(...ys), Math.max(...ys)];
      });
      for (let a = 0; a < bands.length; a++) {
        for (let b = a + 1; b < bands.length; b++) {
          const overlap = Math.min(bands[a][1], bands[b][1]) - Math.max(bands[a][0], bands[b][0]);
          assert.ok(overlap < 40, `voies ${a} et ${b} du secteur ${i} se chevauchent`);
        }
      }
    }
  }
});

test('sabre : blesse mais ne rapporte pas de crédits', () => {
  const engine = new engineMod.Engine();
  engine.credits = 100;
  const enemy = new enemyMod.Enemy(config.ENEMIES.drone, 1, 1);
  enemy.pos = { x: 480, y: 270 };
  engine.enemies.push(enemy);
  engine.saberPos = { x: 480, y: 270 };
  engine.saberActive = true;
  engine.updateSaber(0.5);
  assert.ok(enemy.hp < enemy.maxHp, "l'ennemi doit être blessé");
  assert.equal(engine.credits, 100, 'le sabre ne doit rien rapporter');
});

test('fin de vague : récapitulatif émis avec les compteurs', () => {
  const engine = new engineMod.Engine();
  engine.credits = 1000;
  engine.startWave();
  assert.equal(engine.waveKills, 0);
  engine.waveKills = 7;
  engine.waveLeaks = 2;
  engine.enemies = [];
  engine.spawnQueue = [];
  engine.paused = false;

  let recap = null;
  engine.onEvent = (event) => {
    if (event.type === 'waveEnd') recap = event;
  };
  engine.update(1 / 60);
  assert.ok(recap, 'un événement waveEnd doit être émis');
  assert.equal(recap.kills, 7);
  assert.equal(recap.leaks, 2);
});

test('tours : les stats suivent niveau et spécialisation', () => {
  const kind = config.TOWERS.plasma;
  const tower = new towerMod.Tower('plasma', kind, { x: 0, y: 0 });
  const base = tower.stats.damage;
  tower.level = 2;
  assert.ok(tower.stats.damage > base, 'le niveau 3 doit frapper plus fort');
  const beforeSpec = tower.stats.damage;
  tower.specIndex = 1; // Overcharge
  assert.ok(tower.stats.damage > beforeSpec, 'la spé doit modifier les dégâts');
});

test('difficulté : valeurs valides et repli', () => {
  const diff = mod('difficulty.js');
  assert.equal(diff.normalizeDifficulty('hard'), 'hard');
  assert.equal(diff.normalizeDifficulty('impossible'), 'normal');
  assert.equal(diff.normalizeDifficulty(undefined), 'normal');
  assert.ok(diff.DIFFICULTIES.hard.hp > diff.DIFFICULTIES.normal.hp);
  assert.ok(diff.DIFFICULTIES.normal.hp > diff.DIFFICULTIES.easy.hp);
  const s = settings.validateSettings({ difficulty: 'hard' });
  assert.equal(s.difficulty, 'hard');
  assert.equal(settings.validateSettings({}).difficulty, 'normal');
});

test('difficulté : vies de départ et PV des ennemis', () => {
  const easy = new engineMod.Engine('easy');
  const hard = new engineMod.Engine('hard');
  assert.equal(easy.lives, 25);
  assert.equal(hard.lives, 14);
  assert.ok(easy.credits > hard.credits, 'facile donne plus de crédits');

  easy.credits = 1000;
  hard.credits = 1000;
  easy.startWave();
  hard.startWave();
  for (let i = 0; i < 200 && (easy.enemies.length === 0 || hard.enemies.length === 0); i++) {
    easy.update(0.05);
    hard.update(0.05);
  }
  assert.ok(easy.enemies.length > 0 && hard.enemies.length > 0, 'des ennemis doivent apparaître');
  const easyHp = Math.max(...easy.enemies.map((e) => e.maxHp));
  const hardHp = Math.max(...hard.enemies.map((e) => e.maxHp));
  assert.ok(hardHp > easyHp * 1.7, `PV difficile ${hardHp} vs facile ${easyHp}`);
});
