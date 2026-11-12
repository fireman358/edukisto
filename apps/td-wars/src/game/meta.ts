import { int, isRecord, readJSON, writeJSON } from './storage';

export interface Perks {
  credits: number;
  lives: number;
  saber: number;
  shield: number;
}

export interface MetaState {
  points: number;
  perks: Perks;
  bestWave: number;
}

const KEY = 'tdwars_meta_v1';
const VERSION = 1;

export const PERK_DEFS = [
  { id: 'credits', name: 'Cargaison', desc: 'Crédits de départ', perLevel: 40, unit: 'cr', max: 5 },
  { id: 'lives', name: 'Boucliers renforcés', desc: 'Vies de départ', perLevel: 2, unit: ' vies', max: 5 },
  { id: 'saber', name: 'Cristal kyber', desc: 'Énergie du sabrelaser', perLevel: 25, unit: '%', max: 5 },
  { id: 'shield', name: 'Générateur de déflecteur', desc: 'Bouclier de la base', perLevel: 3, unit: ' pts', max: 5 },
] as const;

export type PerkId = (typeof PERK_DEFS)[number]['id'];

const PERK_MAX: Record<PerkId, number> = PERK_DEFS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p.max }),
  {} as Record<PerkId, number>
);

export function emptyMeta(): MetaState {
  return { points: 0, perks: { credits: 0, lives: 0, saber: 0, shield: 0 }, bestWave: 0 };
}

export function perkCost(level: number): number {
  return (level + 1) * 5;
}

/** Coût cumulé des niveaux déjà achetés d'un perk. */
export function perkSpent(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += perkCost(i);
  return total;
}

/**
 * Valide et migre une sauvegarde de méta-progression.
 * Un schéma antérieur sans `perks` conserve désormais ses points et son record
 * (l'ancienne version remettait tout à zéro).
 */
export function validateMeta(value: unknown): MetaState | null {
  if (!isRecord(value)) return null;
  const rawPerks = isRecord(value.perks) ? value.perks : {};
  const perks = {} as Perks;
  for (const def of PERK_DEFS) {
    perks[def.id] = int(rawPerks[def.id], 0, 0, PERK_MAX[def.id]);
  }
  return {
    points: int(value.points, 0, 0),
    perks,
    bestWave: int(value.bestWave, 0, 0),
  };
}

export function loadMeta(): MetaState {
  return readJSON(KEY, validateMeta) ?? emptyMeta();
}

export function saveMeta(m: MetaState): void {
  writeJSON(KEY, { ...m, version: VERSION }, 120);
}

export const RESPEC_TAX = 0.2;

export function respecPoints(m: MetaState): number {
  const spent = PERK_DEFS.reduce((total, p) => total + perkSpent(m.perks[p.id]), 0);
  return Math.floor(spent * (1 - RESPEC_TAX));
}

export function resetAll(): MetaState {
  const fresh = emptyMeta();
  saveMeta(fresh);
  return fresh;
}
