import { GRID_H } from './config';
import type { Vec } from './types';

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export interface PathGeom {
  pts: Vec[];
  cumLen: number[];
  total: number;
  dirs: Vec[];
}

export interface PathSample {
  pos: Vec;
  dir: Vec;
}

export function buildPath(pts: Vec[]): PathGeom {
  const cumLen: number[] = [0];
  const dirs: Vec[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const d = dist(a, b);
    dirs.push(d === 0 ? { x: 1, y: 0 } : { x: (b.x - a.x) / d, y: (b.y - a.y) / d });
    total += d;
    cumLen.push(total);
  }
  return { pts, cumLen, total, dirs };
}

/**
 * Échantillonne le tracé une seule fois : position ET direction.
 * Remplace pointAt / Engine.pointOn / Engine.pointOnPublic, qui refaisaient
 * chacun une recherche de segment (et dont le dernier n'avait pas de corps).
 */
export function sampleAt(p: PathGeom, d: number): PathSample {
  if (!p || p.pts.length === 0) return { pos: { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
  const t = clamp(d, 0, p.total);
  for (let i = 0; i < p.cumLen.length - 1; i++) {
    if (t <= p.cumLen[i + 1]) {
      const s = t - p.cumLen[i];
      return {
        pos: { x: p.pts[i].x + p.dirs[i].x * s, y: p.pts[i].y + p.dirs[i].y * s },
        dir: p.dirs[i] ?? { x: 1, y: 0 },
      };
    }
  }
  const last = p.pts[p.pts.length - 1];
  return { pos: { x: last.x, y: last.y }, dir: p.dirs[p.dirs.length - 1] ?? { x: 1, y: 0 } };
}

export function distToPath(p: PathGeom, v: Vec): number {
  let best = Infinity;
  for (let i = 0; i < p.pts.length - 1; i++) {
    const a = p.pts[i];
    const b = p.pts[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    const t = len2 === 0 ? 0 : clamp(((v.x - a.x) * abx + (v.y - a.y) * aby) / len2, 0, 1);
    const px = a.x + abx * t;
    const py = a.y + aby * t;
    best = Math.min(best, Math.hypot(v.x - px, v.y - py));
  }
  return best;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Serpentin procédural : `laneCount` voies parallèles, entrées et sorties
 * distinctes, virages aléatoires mais reproductibles à partir de `rng`.
 */
export function genPathPoints(rng: () => number, laneIndex = 0, laneCount = 1): Vec[] {
  // Plusieurs voies : chaque voie occupe sa propre bande horizontale, donc
  // elles ne peuvent plus se chevaucher ni se croiser.
  if (laneCount > 1) {
    const band = GRID_H / laneCount;
    const top = laneIndex * band;
    const entryY = top + band * 0.5;
    const yA = top + band * 0.26;
    const yB = top + band * 0.74;
    const bends = 3 + Math.floor(rng() * 2);
    const anchors: number[] = [];
    let ax = 150 + rng() * 70;
    for (let i = 0; i < bends; i++) {
      anchors.push(ax);
      ax += 130 + rng() * 80;
    }
    const pts: Vec[] = [
      { x: -40, y: entryY },
      { x: anchors[0] - 50, y: entryY },
    ];
    let y = entryY;
    for (let i = 0; i < bends; i++) {
      y = y === yA ? yB : yA;
      pts.push({ x: anchors[i], y });
    }
    const lastX = anchors[bends - 1] + 96;
    pts.push({ x: lastX, y }, { x: lastX, y: entryY }, { x: 1000, y: entryY });
    return pts;
  }

  const allLevels = [90, 190, 280, 380, 470];
  for (let i = allLevels.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allLevels[i], allLevels[j]] = [allLevels[j], allLevels[i]];
  }
  const count = 3 + Math.floor(rng() * 3);
  const ys = allLevels.slice(0, count);
  if (rng() > 0.5) ys.reverse();
  const anchors: number[] = [];
  let ax = 200 + Math.floor(rng() * 60);
  for (let i = 0; i < count - 1; i++) {
    anchors.push(ax);
    ax += 140 + Math.floor(rng() * 100);
  }
  const pts: Vec[] = [
    { x: -40, y: ys[0] },
    { x: anchors[0] - 60, y: ys[0] },
  ];
  for (let i = 0; i < count - 1; i++) {
    pts.push({ x: anchors[i], y: ys[i] });
    pts.push({ x: anchors[i], y: ys[i + 1] });
  }
  const exitY = ys[count - 1];
  pts.push({ x: 1000, y: exitY });
  return pts;
}
