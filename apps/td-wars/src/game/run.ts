import { ALL_WAVES, SECTORS, TOWERS } from './config';
import type { Engine } from './engine';
import { int, isRecord, num, readJSON, removeKey, writeJSON } from './storage';
import { Tower } from './tower';
import type { TargetMode, TowerKindId } from './types';

/**
 * Sauvegarde de la partie en cours.
 *
 * Seuls les états « stables » sont persistés : le run est enregistré uniquement
 * entre deux vagues. Une reprise redémarre donc la vague courante depuis son
 * début, ce qui évite de sérialiser les ennemis et les projectiles.
 */

const KEY = 'tdwars_run_v1';
const VERSION = 1;

const TARGET_MODES: TargetMode[] = ['first', 'close', 'fast', 'strong'];

interface SavedTower {
  id: TowerKindId;
  x: number;
  y: number;
  level: number;
  spec: number | null;
  target: TargetMode;
  spent: number;
}

export interface RunSnapshot {
  version: number;
  seed: number;
  sector: number;
  wave: number;
  credits: number;
  lives: number;
  shield: number;
  towers: SavedTower[];
}

export function snapshotRun(engine: Engine): RunSnapshot {
  return {
    version: VERSION,
    seed: engine.seed,
    sector: engine.sectorIndex,
    wave: engine.waveIndex,
    credits: Math.round(engine.credits),
    lives: engine.lives,
    shield: engine.shield,
    towers: engine.towers.map((t) => ({
      id: t.id,
      x: Math.round(t.pos.x),
      y: Math.round(t.pos.y),
      level: t.level,
      spec: t.specIndex,
      target: t.targetMode,
      spent: t.totalSpent,
    })),
  };
}

function validateTower(value: unknown): SavedTower | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  // `in` accepterait "__proto__" : on ne teste que les clés propres
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(TOWERS, id)) return null;
  const kind = TOWERS[id as TowerKindId];
  const spec = value.spec === null || value.spec === undefined ? null : int(value.spec, 0, 0, 1);
  return {
    id: id as TowerKindId,
    x: num(value.x, 0, -200, 2000),
    y: num(value.y, 0, -200, 2000),
    level: int(value.level, 0, 0, kind.levels.length - 1),
    // une spécialisation n'a de sens qu'au dernier niveau
    spec: kind.specs && spec !== null ? Math.min(spec, kind.specs.length - 1) : null,
    target: TARGET_MODES.includes(value.target as TargetMode) ? (value.target as TargetMode) : 'first',
    spent: num(value.spent, 0, 0, 1_000_000),
  };
}

export function validateRun(value: unknown): RunSnapshot | null {
  if (!isRecord(value)) return null;
  const towers = Array.isArray(value.towers)
    ? value.towers.map(validateTower).filter((t): t is SavedTower => t !== null)
    : [];
  const wave = int(value.wave, -1, -1, ALL_WAVES.length - 1);
  if (wave < 0) return null; // rien à reprendre
  return {
    version: VERSION,
    seed: int(value.seed, 1, 0, 2 ** 31 - 1),
    sector: int(value.sector, 0, 0, SECTORS.length - 1),
    wave,
    credits: int(value.credits, 0, 0, 10_000_000),
    lives: int(value.lives, 1, 1, 999),
    shield: int(value.shield, 0, 0, 999),
    towers,
  };
}

/** Enregistre la partie si elle est dans un état repris-table (entre deux vagues). */
export function saveRun(engine: Engine): void {
  if (!engine.running || engine.waveActive || engine.waveIndex < 0) return;
  writeJSON(KEY, snapshotRun(engine), 0);
}

export function loadRun(): RunSnapshot | null {
  return readJSON(KEY, validateRun);
}

export function clearRun(): void {
  removeKey(KEY);
}

/** Rejoue une sauvegarde dans un moteur neuf. */
export function restoreRun(engine: Engine, snap: RunSnapshot): void {
  engine.seed = snap.seed;
  engine.loadSector(snap.sector);
  engine.credits = snap.credits;
  engine.lives = snap.lives;
  engine.shield = Math.min(snap.shield, engine.maxShield);
  engine.towers = snap.towers.map((saved) => {
    const kind = TOWERS[saved.id];
    const tower = new Tower(saved.id, kind, { x: saved.x, y: saved.y });
    tower.level = Math.min(saved.level, kind.levels.length - 1);
    tower.specIndex = saved.spec;
    tower.targetMode = saved.target;
    tower.totalSpent = saved.spent;
    return tower;
  });
  engine.waveIndex = snap.wave;
  engine.waveActive = false;
  engine.spawnQueue = [];
  engine.autoTimer = -1;
  engine.paused = false;
}
