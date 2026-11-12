/**
 * Difficulté : un seul axe, appliqué au moteur (PV, vitesse, économie).
 *
 * Les valeurs de `normal` déplacent la courbe actuelle vers le haut : elle
 * était réglée pour être découverte, pas pour tenir en haleine.
 */
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  hint: string;
  /** Multiplicateur des PV des ennemis. */
  hp: number;
  /** Multiplicateur de leur vitesse de déplacement. */
  speed: number;
  /** Vies de départ. */
  lives: number;
  /** Crédits de départ. */
  credits: number;
  /** Multiplicateur des récompenses de fin de vague. */
  reward: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Facile',
    hint: 'Pour découvrir le jeu — ennemis plus fragiles, plus de vies et de crédits.',
    hp: 0.75,
    speed: 0.95,
    lives: 25,
    credits: 260,
    reward: 1.15,
  },
  normal: {
    id: 'normal',
    label: 'Moyen',
    hint: 'Le réglage conseillé : il faut varier ses armes pour tenir jusqu’au bout.',
    hp: 1.2,
    speed: 1,
    lives: 18,
    credits: 220,
    reward: 1,
  },
  hard: {
    id: 'hard',
    label: 'Difficile',
    hint: 'Pour les habitués — ennemis coriaces et rapides, marge d’erreur quasi nulle.',
    hp: 1.45,
    speed: 1.06,
    lives: 14,
    credits: 200,
    reward: 1,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export function normalizeDifficulty(value: unknown): Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard' ? value : DEFAULT_DIFFICULTY;
}

export function difficultyConfig(value: unknown): DifficultyConfig {
  return DIFFICULTIES[normalizeDifficulty(value)];
}
