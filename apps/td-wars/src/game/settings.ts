import { normalizeDifficulty, type Difficulty } from './difficulty';
import { bool, isRecord, num, readJSON, writeJSON } from './storage';

export interface Settings {
  sfx: boolean;
  music: boolean;
  volume: number;
  graphics: '2d' | '2.5d';
  difficulty: Difficulty;
}

const KEY = 'tdwars_settings_v1';
const VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  sfx: true,
  music: true,
  volume: 0.8,
  graphics: '2.5d',
  difficulty: 'normal',
};

/** Valide une charge utile inconnue ; toute valeur hors bornes est ramenée dans le domaine. */
export function validateSettings(value: unknown): Settings | null {
  if (!isRecord(value)) return null;
  return {
    sfx: bool(value.sfx, DEFAULT_SETTINGS.sfx),
    music: bool(value.music, DEFAULT_SETTINGS.music),
    volume: num(value.volume, DEFAULT_SETTINGS.volume, 0, 1),
    graphics: value.graphics === '2d' ? '2d' : '2.5d',
    difficulty: normalizeDifficulty(value.difficulty),
  };
}

export function loadSettings(): Settings {
  return readJSON(KEY, validateSettings) ?? { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings): void {
  writeJSON(KEY, { ...s, version: VERSION });
}
