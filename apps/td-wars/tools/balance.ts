/**
 * Harnais d'équilibrage + test de fumée du moteur, sans navigateur.
 *
 *   npm run balance
 *
 * Il répond à deux questions que le jeu ne peut pas trancher à l'œil :
 *  - la courbe de PV suit-elle ce que l'économie permet d'encaisser ?
 *  - le meilleur DPS par crédit est-il toujours la tour de départ ?
 */

import {
  ALL_WAVES,
  ENEMIES,
  SECTORS,
  TOWERS,
  WAVES_PER_SECTOR,
} from '../src/game/config';
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../src/game/difficulty';
import { Engine } from '../src/game/engine';
import { buildPath, genPathPoints, mulberry32 } from '../src/game/geom';
import type { TowerKindId } from '../src/game/types';

declare const process: { exitCode?: number };

// --------------------------------------------------------------------------
// 1. Table des tours : DPS par crédit (au niveau max, meilleure spé de dégâts)
// --------------------------------------------------------------------------

const DAMAGE_SPEC: Partial<Record<TowerKindId, number>> = {
  plasma: 1.8,
  laser: 1.6,
  missile: 1.4,
  tesla: 1.7,
  rail: 1.25,
  axial: 1.5,
  ion: 1,
  tractor: 1,
  extractor: 1,
};

interface TowerRow {
  id: TowerKindId;
  cost: number;
  dps: number;
  perCredit: number;
  range: number;
}

function towerRows(): TowerRow[] {
  return (Object.keys(TOWERS) as TowerKindId[])
    .map((id) => {
      const kind = TOWERS[id];
      const level = kind.levels[kind.levels.length - 1];
      const cost = kind.levels.reduce((sum, l) => sum + l.cost, 0);
      const mult = DAMAGE_SPEC[id] ?? 1;
      let dps = level.damage * mult * level.fireRate;
      if (kind.kind === 'chain') {
        // chaîne : rendement décroissant de 20% par saut
        let chain = 0;
        for (let i = 0; i < level.chainTargets; i++) chain += Math.pow(0.8, i);
        dps *= chain;
      }
      if (id === 'extractor') dps = (level.income ?? 0) * 0; // pas de dégâts : hors comparaison
      return { id, cost, dps, perCredit: cost > 0 ? dps / cost : 0, range: level.range };
    })
    .sort((a, b) => b.perCredit - a.perCredit);
}

function printTowers(): void {
  const rows = towerRows();
  console.log('\n=== DPS par crédit (niveau max + meilleure spé) ===');
  console.log('tour        coût   portée      DPS    DPS/cr');
  for (const row of rows) {
    if (row.id === 'extractor') continue;
    console.log(
      `${row.id.padEnd(10)} ${String(row.cost).padStart(5)} ${String(Math.round(row.range)).padStart(7)} ` +
        `${row.dps.toFixed(0).padStart(8)} ${row.perCredit.toFixed(2).padStart(9)}`
    );
  }
  const best = rows.find((r) => r.id !== 'extractor');
  console.log(`meilleur rendement : ${best?.id} (${best?.perCredit.toFixed(2)} DPS/cr)`);
}

// --------------------------------------------------------------------------
// 2. Longueur médiane du tracé généré, par nombre de voies
// --------------------------------------------------------------------------

const pathLengthCache = new Map<number, number>();

function medianPathLength(lanes: number): number {
  const cached = pathLengthCache.get(lanes);
  if (cached) return cached;
  const lengths: number[] = [];
  for (let seed = 0; seed < 200; seed++) {
    const rng = mulberry32(seed * 7919 + 12345);
    const path = buildPath(genPathPoints(rng, 0, lanes));
    lengths.push(path.total);
  }
  lengths.sort((a, b) => a - b);
  const median = lengths[Math.floor(lengths.length / 2)];
  pathLengthCache.set(lanes, median);
  return median;
}

// --------------------------------------------------------------------------
// 3. Courbe : PV de la vague vs DPS finançable
// --------------------------------------------------------------------------

/**
 * Part de la flotte qui a effectivement une cible à un instant donné.
 * Hypothèse de modélisation : 60 %. Toutes les tours achetées ne tirent pas
 * en même temps, et c'est précisément ce que ce facteur corrige.
 */
const ENGAGEMENT = 0.6;

interface WaveReport {
  wave: number;
  sector: number;
  hp: number;
  requiredDps: number;
  credits: number;
  affordableDps: number;
  ratio: number;
  bounty: number;
}

function waveReport(difficulty: Difficulty): WaveReport[] {
  const level = DIFFICULTIES[difficulty];
  const reports: WaveReport[] = [];
  let credits = level.credits;
  let sector = 0;

  for (let index = 0; index < ALL_WAVES.length; index++) {
    if (isSectorStart(index)) {
      sector = Math.floor(index / WAVES_PER_SECTOR);
      if (sector > 0) credits = Math.min(credits, [0, 600, 900, 1300][sector] ?? credits);
    }
    const wave = ALL_WAVES[index];
    const pathLen = medianPathLength(SECTORS[sector].lanes);

    let hp = 0;
    let requiredDps = 0;
    let bounty = 0;
    for (const group of wave.groups) {
      const kind = ENEMIES[group.id];
      const unitHp = kind.hp * group.hpScale * level.hp;
      const speed = kind.speed * group.speedScale * level.speed;
      const travel = pathLen / Math.max(1, speed);
      hp += unitHp * group.count;
      requiredDps += (unitHp / travel) * group.count;
      bounty += kind.bounty * group.count;
    }

    // Ce que le joueur peut réellement aligner : tout son argent en DPS,
    // moins 30 % réservés à l'économie et aux tours utilitaires,
    // et seulement la fraction ENGAGEMENT qui tire à un instant donné.
    const affordableDps = credits * 1.08 * 0.7 * ENGAGEMENT;
    reports.push({
      wave: index + 1,
      sector: sector + 1,
      hp,
      requiredDps,
      credits,
      affordableDps,
      ratio: requiredDps > 0 ? affordableDps / requiredDps : Infinity,
      bounty,
    });

    credits += wave.reward * level.reward + bounty * 0.9;
  }
  return reports;
}

function isSectorStart(index: number): boolean {
  return index % WAVES_PER_SECTOR === 0;
}

function printCurve(reports: WaveReport[], difficulty: Difficulty): void {
  console.log(`\n=== Courbe — ${DIFFICULTIES[difficulty].label.toUpperCase()} ===`);
  console.log(`ratio = DPS engagé finançable / DPS requis (engagement supposé ${Math.round(ENGAGEMENT * 100)} %)`);
  console.log('1.0 = la vague est pile à la limite du budget du joueur\n');
  console.log('vague  sect   PV total   DPS requis   DPS financable   ratio');
  for (const r of reports) {
    if (r.wave % 5 !== 0 && r.wave % 25 !== 1) continue; // une ligne toutes les 5 vagues
    const flag = r.ratio < 1 ? '  <-- trop dur' : r.ratio < 1.3 ? '  <- tendu' : '';
    console.log(
      `${String(r.wave).padStart(5)} ${String(r.sector).padStart(5)} ${r.hp.toFixed(0).padStart(10)} ` +
        `${r.requiredDps.toFixed(0).padStart(12)} ${r.affordableDps.toFixed(0).padStart(16)} ` +
        `${r.ratio.toFixed(2).padStart(7)}${flag}`
    );
  }
  const worst = [...reports].sort((a, b) => a.ratio - b.ratio).slice(0, 5);
  console.log('\n5 vagues les plus tendues :');
  for (const r of worst) console.log(`  vague ${r.wave} (secteur ${r.sector}) : ratio ${r.ratio.toFixed(2)}`);
  const best = [...reports].sort((a, b) => b.ratio - a.ratio)[0];
  if (best) console.log(`vague la plus facile : ${best.wave} (ratio ${best.ratio.toFixed(2)})`);
}

// --------------------------------------------------------------------------
// 4. Test de fumée : le moteur tourne-t-il sans planter ?
// --------------------------------------------------------------------------

function smoke(): boolean {
  console.log('\n=== Test de fumée du moteur ===');
  const engine = new Engine();
  try {
    engine.credits = 5000;
    const spots: [number, number][] = [
      [300, 200],
      [420, 300],
      [600, 200],
      [700, 380],
      [820, 240],
    ];
    for (const [x, y] of spots) {
      for (const id of ['plasma', 'ion', 'missile'] as TowerKindId[]) {
        engine.placeTower(id, { x, y });
      }
    }
    engine.placeTower('plasma', { x: 480, y: 120 });

    const dt = 1 / 60;
    let frames = 0;
    let wavesStarted = 0;
    for (let step = 0; step < 60 * 90; step++) {
      engine.update(dt);
      frames++;
      if (engine.canStartWave()) {
        engine.startWave();
        wavesStarted++;
        if (wavesStarted >= 4) break;
      }
    }
    console.log(`tours posées   : ${engine.towers.length}`);
    console.log(`vagues lancées : ${wavesStarted}`);
    console.log(`frames simulées: ${frames}`);
    console.log(`crédits finaux : ${Math.round(engine.credits)}`);
    console.log(`vies restantes : ${engine.lives}`);
    console.log(`ennemis vivants: ${engine.enemies.length}, projectiles : ${engine.projectiles.length}`);
    const ok = frames > 0 && engine.towers.length > 0;
    console.log(ok ? 'OK — le moteur avance sans exception' : 'ECHEC');
    return ok;
  } catch (error) {
    console.error('ECHEC —', error);
    return false;
  }
}

// --------------------------------------------------------------------------

printTowers();

let feasible = true;
for (const difficulty of DIFFICULTY_ORDER) {
  const reports = waveReport(difficulty);
  printCurve(reports, difficulty);
  const impossible = reports.filter((r) => r.ratio < 1).length;
  const tense = reports.filter((r) => r.ratio >= 1 && r.ratio < 1.8).length;
  const worst = [...reports].sort((a, b) => a.ratio - b.ratio)[0];
  console.log(
    `\nBilan ${DIFFICULTIES[difficulty].label} : ${impossible} vague(s) infaisable(s), ` +
      `${tense} tendue(s) sur ${reports.length} — pire ratio ${worst.ratio.toFixed(2)} (vague ${worst.wave}).`
  );
  // Facile et Moyen doivent rester jouables de bout en bout ; Difficile a le droit
  // d'être à la limite sur les dernières vagues.
  if (impossible > 0 && difficulty !== 'hard') feasible = false;
}

const smokeOk = smoke();
process.exitCode = smokeOk && feasible ? 0 : 1;
