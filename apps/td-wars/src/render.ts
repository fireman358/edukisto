import { GRID_H, GRID_W, PATH_WIDTH, SECTORS } from './game/config';
import { mulberry32 } from './game/geom';
import type { Engine } from './game/engine';
import type { Enemy } from './game/enemy';
import type { Tower } from './game/tower';
import type { TowerKindId, Vec } from './game/types';

/**
 * Rendu 2.5D.
 *
 * Direction artistique : une seule source de lumière, en haut à gauche. Tout
 * objet est posé sur une plaque extrudée et projette une ombre vers le bas à
 * droite. Les matériaux sont des dégradés verticaux (clair dessus, sombre
 * dessous) pour donner du volume sans textures.
 *
 * Le décor (ciel, chemin, props, base) est pré-rendu une fois par secteur dans
 * un canvas hors écran deux fois plus grand que la zone logique ; seules les
 * entités et l'ambiance sont redessinées à chaque frame.
 */

type ThemeName = 'desert' | 'ice' | 'forest' | 'city';

interface ThemePalette {
  ground: [number, string][];
  patch: string;
  patch2: string;
  detail: string;
  glow: string;
  pathSide: string;
  pathTop: string;
  pathEdge: string;
  pathTex: string;
  pathDash: string;
  ambient: 'dust' | 'snow' | 'firefly' | 'mote';
  vignette: string;
}

const TAU = Math.PI * 2;

const THEMES: Record<ThemeName, ThemePalette> = {
  desert: {
    ground: [
      [0, '#4a2c1c'],
      [0.38, '#7d4c2b'],
      [0.72, '#b47c46'],
      [1, '#d59f61'],
    ],
    patch: 'rgba(206, 140, 78, 0.12)',
    patch2: 'rgba(74, 48, 96, 0.16)',
    detail: 'rgba(255, 214, 160, 0.35)',
    glow: 'rgba(255, 214, 150, 0.16)',
    pathSide: '#8a6238',
    pathTop: '#d3ab7c',
    pathEdge: '#f4dcb4',
    pathTex: '#a97f52',
    pathDash: 'rgba(255, 236, 200, 0.35)',
    ambient: 'dust',
    vignette: 'rgba(28, 10, 4, 0.32)',
  },
  ice: {
    ground: [
      [0, '#0d2038'],
      [0.42, '#1b4770'],
      [0.78, '#4b82a6'],
      [1, '#93bcd6'],
    ],
    patch: 'rgba(220, 240, 255, 0.1)',
    patch2: 'rgba(18, 46, 96, 0.16)',
    detail: 'rgba(255, 255, 255, 0.4)',
    glow: 'rgba(150, 220, 255, 0.14)',
    pathSide: '#3a5c7e',
    pathTop: '#b6cfdf',
    pathEdge: '#f2fbff',
    pathTex: '#8fa9c0',
    pathDash: 'rgba(226, 246, 255, 0.4)',
    ambient: 'snow',
    vignette: 'rgba(3, 12, 26, 0.36)',
  },
  forest: {
    ground: [
      [0, '#0d2417'],
      [0.42, '#17452a'],
      [0.78, '#265c38'],
      [1, '#377347'],
    ],
    patch: 'rgba(96, 160, 96, 0.14)',
    patch2: 'rgba(6, 34, 34, 0.26)',
    detail: 'rgba(160, 210, 120, 0.3)',
    glow: 'rgba(190, 255, 170, 0.1)',
    pathSide: '#42582f',
    pathTop: '#83995d',
    pathEdge: '#c6dba0',
    pathTex: '#5e7440',
    pathDash: 'rgba(220, 245, 190, 0.3)',
    ambient: 'firefly',
    vignette: 'rgba(2, 12, 6, 0.36)',
  },
  city: {
    ground: [
      [0, '#090f1c'],
      [0.5, '#131e34'],
      [1, '#243352'],
    ],
    patch: 'rgba(90, 120, 190, 0.1)',
    patch2: 'rgba(20, 34, 74, 0.18)',
    detail: 'rgba(140, 190, 255, 0.3)',
    glow: 'rgba(120, 180, 255, 0.1)',
    pathSide: '#232d47',
    pathTop: '#4f6088',
    pathEdge: '#a9c0ea',
    pathTex: '#3a4664',
    pathDash: 'rgba(160, 200, 255, 0.45)',
    ambient: 'mote',
    vignette: 'rgba(2, 4, 12, 0.4)',
  },
};

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  drift: number;
}

const SHADOW = 'rgba(0, 0, 0, 0.3)';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  graphicsMode: '2d' | '2.5d' = '2.5d';
  selectedTower: Tower | null = null;
  buildPreview: { kindId: TowerKindId; valid: boolean; range: number; bonus: boolean } | null = null;
  mouse: Vec = { x: -100, y: -100 };
  hyperT = 0;

  private stars: Star[] = [];
  private flakes: Flake[] = [];
  private t = 0;
  private dt = 1 / 60;
  private backdrop: HTMLCanvasElement | null = null;
  private backdropKey = '';
  private gradientCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasGradient>>();
  private vignetteCache: CanvasGradient | null = null;

  constructor(canvas: HTMLCanvasElement, private engine: Engine) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    for (let i = 0; i < 110; i++) {
      this.stars.push({
        x: Math.random() * GRID_W,
        y: Math.random() * GRID_H * 0.72,
        r: Math.random() * 1.2 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 2,
      });
    }
    for (let i = 0; i < 70; i++) {
      this.flakes.push({
        x: Math.random() * GRID_W,
        y: Math.random() * GRID_H,
        r: Math.random() * 1.6 + 0.6,
        vy: 12 + Math.random() * 28,
        drift: Math.random() * 20 - 10,
      });
    }
  }

  // ---------------------------------------------------------------- thème
  private get themeName(): ThemeName {
    return SECTORS[this.engine.sectorIndex].theme;
  }

  private get palette(): ThemePalette {
    return THEMES[this.themeName] ?? THEMES.desert;
  }

  private get rich(): boolean {
    return this.graphicsMode !== '2d';
  }

  /** Dégradé vertical mémorisé par (contexte, clé). */
  private grad(
    ctx: CanvasRenderingContext2D,
    key: string,
    y0: number,
    y1: number,
    stops: [number, string][]
  ): CanvasGradient {
    let byCtx = this.gradientCache.get(ctx);
    if (!byCtx) {
      byCtx = new Map();
      this.gradientCache.set(ctx, byCtx);
    }
    const hit = byCtx.get(key);
    if (hit) return hit;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (const [offset, color] of stops) g.addColorStop(offset, color);
    byCtx.set(key, g);
    return g;
  }

  /** Matière d'un corps : clair dessus, sombre dessous. */
  private bodyGrad(ctx: CanvasRenderingContext2D, color: string, y0 = -12, y1 = 12): CanvasGradient {
    return this.grad(ctx, `body:${color}:${y0}:${y1}`, y0, y1, [
      [0, lighten(color, 0.35)],
      [0.45, color],
      [1, darken(color, 0.45)],
    ]);
  }

  // ---------------------------------------------------------------- boucle
  draw(dt: number): void {
    this.t += dt;
    this.dt = dt;
    if (this.hyperT > 0) this.hyperT -= dt;

    const ctx = this.ctx;
    this.ensureBackdrop();
    if (this.backdrop) ctx.drawImage(this.backdrop, 0, 0, GRID_W, GRID_H);
    else this.drawScenery(ctx);

    this.drawAmbient(ctx);
    this.drawRangePreview(ctx);
    for (const tower of this.engine.towers) this.drawTower(ctx, tower);
    for (const enemy of this.engine.enemies) this.drawEnemy(ctx, enemy);
    this.drawProjectiles(ctx);
    this.drawArcs(ctx);
    this.drawEffects(ctx);
    if (this.selectedTower) this.drawSelection(ctx);
    this.drawPortals(ctx);
    if (this.hyperT > 0) this.drawHyperspace(ctx);
    this.drawSaber(ctx);
    this.drawVignette(ctx);
  }

  // ---------------------------------------------------------------- décor
  private ensureBackdrop(): void {
    const key = `${this.engine.sectorIndex}|${this.engine.seed}|${this.graphicsMode}`;
    if (this.backdrop && this.backdropKey === key) return;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = GRID_W * scale;
    canvas.height = GRID_H * scale;
    const bctx = canvas.getContext('2d');
    if (!bctx) return;
    bctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.drawScenery(bctx);
    this.backdrop = canvas;
    this.backdropKey = key;
  }

  private drawScenery(ctx: CanvasRenderingContext2D): void {
    this.drawSky(ctx);
    this.drawPathAll(ctx);
    if (this.rich) this.drawProps(ctx);
    this.drawBase(ctx);
    if (this.rich) this.drawGroundHaze(ctx);
  }

  /**
   * Sol vu de dessus : plus d'horizon, donc les tourelles ne « flottent » plus.
   * La profondeur vient de la lumière (haut-gauche) et du vignettage.
   */
  private drawSky(ctx: CanvasRenderingContext2D): void {
    const p = this.palette;
    const rng = mulberry32((this.engine.seed + this.engine.sectorIndex * 977) >>> 0);

    ctx.fillStyle = this.grad(ctx, `ground:${this.themeName}`, 0, GRID_H, p.ground);
    ctx.fillRect(0, 0, GRID_W, GRID_H);

    // grandes taches de terrain
    for (let i = 0; i < 26; i++) {
      const x = rng() * GRID_W;
      const y = rng() * GRID_H;
      const rx = 70 + rng() * 190;
      const ry = 26 + rng() * 66;
      ctx.fillStyle = i % 2 ? p.patch : p.patch2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, (rng() - 0.5) * 0.6, 0, TAU);
      ctx.fill();
    }

    this.drawThemeAccents(ctx, rng);
    // grain fin : sans lui, les grands aplats paraissent « plastique »
    for (let i = 0; i < 900; i++) {
      const x = rng() * GRID_W;
      const y = rng() * GRID_H;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(x, y, 1.4, 1.4);
    }

    const bloom = ctx.createRadialGradient(190, 80, 20, 190, 80, 620);
    bloom.addColorStop(0, p.glow);
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, GRID_W, GRID_H);
  }

  private drawThemeAccents(ctx: CanvasRenderingContext2D, rng: () => number): void {
    const p = this.palette;
    switch (this.themeName) {
      case 'desert':
        // dunes allongées, crête éclairée
        for (let i = 0; i < 8; i++) {
          const x = rng() * GRID_W;
          const y = 40 + i * 66 + rng() * 26;
          const w = 210 + rng() * 240;
          ctx.fillStyle = i % 2 ? 'rgba(196, 132, 72, 0.14)' : 'rgba(130, 78, 42, 0.16)';
          ctx.beginPath();
          ctx.ellipse(x, y, w, 26 + rng() * 24, (rng() - 0.5) * 0.2, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 214, 160, 0.09)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(x, y - 8, w * 0.92, 13, 0, Math.PI * 1.05, TAU);
          ctx.stroke();
        }
        for (let i = 0; i < 34; i++) {
          ctx.fillStyle = `rgba(90, 54, 30, ${0.2 + rng() * 0.25})`;
          ctx.beginPath();
          ctx.ellipse(rng() * GRID_W, rng() * GRID_H, 1 + rng() * 2.4, 1 + rng() * 1.5, 0, 0, TAU);
          ctx.fill();
        }
        break;

      case 'ice':
        // vent : longues stries claires
        for (let i = 0; i < 22; i++) {
          const x = rng() * GRID_W;
          const y = rng() * GRID_H;
          const len = 40 + rng() * 110;
          ctx.strokeStyle = `rgba(224, 244, 255, ${0.04 + rng() * 0.07})`;
          ctx.lineWidth = 1 + rng() * 1.6;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + len, y + len * 0.22);
          ctx.stroke();
        }
        // fissures
        for (let i = 0; i < 4; i++) {
          let x = rng() * GRID_W;
          let y = rng() * GRID_H;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let k = 0; k < 5; k++) {
            x += (rng() - 0.5) * 100;
            y += (rng() - 0.5) * 70;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;

      case 'forest':
        // ombres de canopée sur le sol
        for (let i = 0; i < 10; i++) {
          const edge = i < 4 ? rng() * 130 : i < 8 ? GRID_W - rng() * 130 : rng() * GRID_W;
          const y = rng() * GRID_H;
          const r = 58 + rng() * 70;
          ctx.fillStyle = 'rgba(6, 26, 14, 0.5)';
          ctx.beginPath();
          ctx.arc(edge, y, r, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(34, 78, 44, 0.3)';
          ctx.beginPath();
          ctx.arc(edge - 10, y - 10, r * 0.72, 0, TAU);
          ctx.fill();
        }
        for (let i = 0; i < 44; i++) {
          ctx.fillStyle = `rgba(150, 210, 120, ${0.04 + rng() * 0.07})`;
          ctx.beginPath();
          ctx.arc(rng() * GRID_W, rng() * GRID_H, 2 + rng() * 6, 0, TAU);
          ctx.fill();
        }
        break;

      case 'city':
        // dalles métalliques
        ctx.strokeStyle = 'rgba(120, 160, 230, 0.09)';
        ctx.lineWidth = 1;
        for (let x = 0; x < GRID_W; x += 96) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, GRID_H);
          ctx.stroke();
        }
        for (let y = 0; y < GRID_H; y += 96) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(GRID_W, y);
          ctx.stroke();
        }
        for (let i = 0; i < 12; i++) {
          const x = 40 + rng() * (GRID_W - 80);
          const y = 40 + rng() * (GRID_H - 80);
          const w = 22 + rng() * 64;
          const h = 12 + rng() * 30;
          ctx.fillStyle = 'rgba(26, 44, 78, 0.45)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = 'rgba(140, 190, 255, 0.16)';
          ctx.strokeRect(x + 0.5, y + 0.5, w, h);
        }
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = `rgba(120, 200, 255, ${0.18 + rng() * 0.2})`;
          ctx.fillRect(50 + rng() * (GRID_W - 100), rng() * GRID_H, 2, 24 + rng() * 46);
        }
        break;
    }
    void p;
  }

  private drawGroundHaze(ctx: CanvasRenderingContext2D): void {
    // le lointain (haut de l'écran) s'assombrit : profondeur sans horizon
    ctx.fillStyle = this.grad(ctx, 'depth', 0, 170, [
      [0, 'rgba(0, 0, 0, 0.18)'],
      [1, 'rgba(0, 0, 0, 0)'],
    ]);
    ctx.fillRect(0, 0, GRID_W, 170);
  }

  // ---------------------------------------------------------------- chemin
  private drawPathAll(ctx: CanvasRenderingContext2D): void {
    const p = this.palette;
    for (const path of this.engine.paths) {
      const pts = path.pts;
      // ombre portée
      this.strokePoly(ctx, pts, PATH_WIDTH + 16, 'rgba(0, 0, 0, 0.22)', 8);
      // épaisseur (face latérale)
      this.strokePoly(ctx, pts, PATH_WIDTH + 8, p.pathSide, 5);
      // tablier
      this.strokePoly(ctx, pts, PATH_WIDTH, p.pathTop, 0);
      // biseaux : clair au-dessus, sombre en dessous
      this.strokePoly(ctx, pts, 3, p.pathEdge, -(PATH_WIDTH / 2 - 2), 0.5);
      this.strokePoly(ctx, pts, 3, 'rgba(0, 0, 0, 0.35)', PATH_WIDTH / 2 - 3);
      if (this.rich) this.drawPathTexture(ctx, pts);
      // circulation
      ctx.save();
      ctx.strokeStyle = p.pathDash;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 16]);
      ctx.lineDashOffset = -this.t * 14;
      this.strokePoly(ctx, pts, 2, p.pathDash, 0, 0.5);
      ctx.restore();
    }
  }

  private strokePoly(
    ctx: CanvasRenderingContext2D,
    pts: Vec[],
    width: number,
    color: string,
    offsetY: number,
    alpha = 1
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y + offsetY);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y + offsetY);
    ctx.stroke();
    ctx.restore();
  }

  private drawPathTexture(ctx: CanvasRenderingContext2D, pts: Vec[]): void {
    const p = this.palette;
    {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.floor(len / 30);
        const dx = (b.x - a.x) / (len || 1);
        const dy = (b.y - a.y) / (len || 1);
        const angle = Math.atan2(dy, dx);
        for (let s = 1; s < steps; s++) {
          const k = s / steps;
          const x = a.x + (b.x - a.x) * k;
          const y = a.y + (b.y - a.y) * k;
          const hash = (x * 13 + y * 7) % 7;
          ctx.globalAlpha = 0.1 + (hash % 3) * 0.05;
          ctx.fillStyle = p.pathTex;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.fillRect(-2, -PATH_WIDTH * 0.18, 4 + (hash % 3), PATH_WIDTH * 0.36);
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- props
  private drawProps(ctx: CanvasRenderingContext2D): void {
    const theme = this.themeName;
    const spots: Vec[] = [];
    for (let i = 0; i < 16; i++) {
      const p = { x: (i * 173 + 61) % GRID_W, y: (i * 97 + 150) % GRID_H };
      const near = this.engine.paths.some((pg) => {
        for (const pt of pg.pts) if (Math.hypot(pt.x - p.x, pt.y - p.y) < 74) return true;
        return false;
      });
      if (!near) spots.push(p);
    }

    spots.forEach((p, index) => {
      const s = 0.75 + ((index * 7) % 5) / 8;
      ctx.save();
      ctx.translate(p.x, p.y);

      // ombre commune, portée vers le bas-droite
      ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      ctx.beginPath();
      ctx.ellipse(7 * s, 7 * s, 14 * s, 6 * s, 0, 0, TAU);
      ctx.fill();

      if (theme === 'desert') {
        // bloc rocheux : deux volumes
        ctx.fillStyle = this.bodyGrad(ctx, '#8a6038', -16, 4);
        ctx.beginPath();
        ctx.moveTo(-12 * s, 2 * s);
        ctx.lineTo(-7 * s, -13 * s);
        ctx.lineTo(3 * s, -16 * s);
        ctx.lineTo(11 * s, -4 * s);
        ctx.lineTo(9 * s, 3 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 214, 160, 0.22)';
        ctx.beginPath();
        ctx.moveTo(-7 * s, -13 * s);
        ctx.lineTo(3 * s, -16 * s);
        ctx.lineTo(2 * s, -7 * s);
        ctx.lineTo(-6 * s, -6 * s);
        ctx.closePath();
        ctx.fill();
      } else if (theme === 'ice') {
        // éclat de glace
        ctx.fillStyle = this.bodyGrad(ctx, '#b8d8ee', -26, 2);
        ctx.beginPath();
        ctx.moveTo(0, -26 * s);
        ctx.lineTo(9 * s, -2 * s);
        ctx.lineTo(-2 * s, 3 * s);
        ctx.lineTo(-9 * s, -3 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.moveTo(0, -26 * s);
        ctx.lineTo(3 * s, -4 * s);
        ctx.lineTo(-1 * s, -3 * s);
        ctx.closePath();
        ctx.fill();
        const halo = ctx.createRadialGradient(0, -6 * s, 2, 0, -6 * s, 20 * s);
        halo.addColorStop(0, 'rgba(180, 230, 255, 0.22)');
        halo.addColorStop(1, 'rgba(180, 230, 255, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, -6 * s, 20 * s, 0, TAU);
        ctx.fill();
      } else if (theme === 'forest') {
        // buisson / jeune arbre vu de dessus
        ctx.fillStyle = this.bodyGrad(ctx, '#2f6b38', -24, 2);
        for (const [cx, cy, r] of [
          [0, -14, 12],
          [-8, -8, 9],
          [8, -9, 10],
          [0, -4, 8],
        ] as const) {
          ctx.beginPath();
          ctx.arc(cx * s, cy * s, r * s, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(170, 230, 140, 0.18)';
        ctx.beginPath();
        ctx.arc(-4 * s, -17 * s, 6 * s, 0, TAU);
        ctx.fill();
      } else {
        // caisson technique de la cité
        ctx.fillStyle = this.bodyGrad(ctx, '#2a3550', -18, 2);
        ctx.fillRect(-11 * s, -16 * s, 22 * s, 18 * s);
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-11 * s, -16 * s, 22 * s, 18 * s);
        ctx.fillStyle = 'rgba(120, 210, 255, 0.55)';
        ctx.fillRect(-7 * s, -12 * s, 5 * s, 3 * s);
        ctx.fillStyle = 'rgba(255, 180, 120, 0.6)';
        ctx.fillRect(1 * s, -12 * s, 5 * s, 3 * s);
      }
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------- base
  private drawBase(ctx: CanvasRenderingContext2D): void {
    if (this.engine.paths.length === 0) return;
    const ends = this.engine.paths.map((p) => p.pts[p.pts.length - 1]);
    const x = Math.min(...ends.map((e) => e.x)) - 6;
    const minY = Math.min(...ends.map((e) => e.y));
    const maxY = Math.max(...ends.map((e) => e.y));
    if (ends.length > 1) this.drawBaseWall(ctx, x, minY, maxY);
    else this.drawBaseFort(ctx, x, (minY + maxY) / 2);
  }

  private drawBaseFort(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.2);
    const theme = this.themeName;
    ctx.save();
    ctx.translate(Math.min(x, GRID_W - 46), y);
    ctx.scale(1.35, 1.35);

    ctx.fillStyle = SHADOW;
    ctx.beginPath();
    ctx.ellipse(8, 16, 46, 15, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#141c2c';
    ctx.beginPath();
    ctx.ellipse(0, 10, 38, 15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = this.grad(ctx, 'basePlate', -10, 10, [
      [0, '#3b5170'],
      [1, '#182234'],
    ]);
    ctx.beginPath();
    ctx.ellipse(0, 3, 38, 15, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(170, 210, 255, 0.4)';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    const wall =
      theme === 'ice' ? '#9fb4cc' : theme === 'forest' ? '#3d5a35' : theme === 'city' ? '#8f9dc4' : '#c8b090';
    ctx.fillStyle = this.bodyGrad(ctx, wall, -40, 6);
    ctx.beginPath();
    ctx.moveTo(-30, 4);
    ctx.lineTo(-27, -26);
    ctx.lineTo(0, -40);
    ctx.lineTo(27, -26);
    ctx.lineTo(30, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(-27, -26);
    ctx.lineTo(0, -40);
    ctx.lineTo(0, 4);
    ctx.lineTo(-30, 4);
    ctx.closePath();
    ctx.fill();

    // tour + balise
    ctx.fillStyle = this.bodyGrad(ctx, darken(wall, 0.25), -56, -8);
    ctx.fillRect(-7, -56, 14, 30);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(-7, -56, 5, 30);
    ctx.fillStyle = theme === 'forest' ? '#ffd27a' : '#8fdcff';
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.beginPath();
    ctx.arc(0, -58, 3.4 + pulse * 1.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // hublots
    ctx.fillStyle = `rgba(150, 230, 255, ${0.4 + pulse * 0.35})`;
    ctx.fillRect(-20, -14, 6, 8);
    ctx.fillRect(14, -14, 6, 8);

    if (this.rich) {
      const dome = ctx.createRadialGradient(0, -20, 6, 0, -20, 54);
      dome.addColorStop(0, `rgba(120, 210, 255, ${0.05 + pulse * 0.06})`);
      dome.addColorStop(0.72, `rgba(120, 210, 255, ${0.1 + pulse * 0.07})`);
      dome.addColorStop(1, 'rgba(120, 210, 255, 0)');
      ctx.fillStyle = dome;
      ctx.beginPath();
      ctx.arc(0, -16, 54, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = `rgba(150, 225, 255, ${0.22 + pulse * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -16, 48, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      // halo au sol
      const halo = ctx.createRadialGradient(0, 8, 4, 0, 8, 58);
      halo.addColorStop(0, `rgba(120, 200, 255, ${0.1 + pulse * 0.05})`);
      halo.addColorStop(1, 'rgba(120, 200, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.ellipse(0, 8, 58, 24, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBaseWall(ctx: CanvasRenderingContext2D, x: number, minY: number, maxY: number): void {
    const h = Math.max(80, maxY - minY);
    const midY = (minY + maxY) / 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.2);
    ctx.save();
    ctx.translate(Math.min(x, GRID_W - 30), midY);

    ctx.fillStyle = SHADOW;
    ctx.fillRect(-24, -h / 2 + 10, 58, h + 4);

    ctx.fillStyle = this.bodyGrad(ctx, '#33405f', -h / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(-26, -h / 2);
    ctx.lineTo(22, -h / 2 + 8);
    ctx.lineTo(22, h / 2 - 8);
    ctx.lineTo(-26, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 190, 240, 0.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    for (let i = -2; i <= 2; i++) {
      const wy = i * (h / 6);
      ctx.fillStyle = `rgba(140, 220, 255, ${0.35 + pulse * 0.35})`;
      ctx.fillRect(-14, wy - 3, 6, 6);
      ctx.fillRect(2, wy - 3, 6, 6);
    }

    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 - 16);
    ctx.lineTo(14, -h / 2 - 11);
    ctx.lineTo(0, -h / 2 - 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- ambiance
  private drawAmbient(ctx: CanvasRenderingContext2D): void {
    if (this.themeName !== 'forest') {
      for (const s of this.stars) {
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(this.t * s.speed + s.phase));
        ctx.globalAlpha = tw * (this.rich ? 0.9 : 0.6);
        ctx.fillStyle = '#e8f2ff';
        ctx.fillRect(s.x, s.y, s.r * 1.7, s.r * 1.7);
      }
      ctx.globalAlpha = 1;
    }

    switch (this.palette.ambient) {
      case 'snow':
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (const f of this.flakes) {
          f.y += f.vy * this.dt;
          f.x += Math.sin(this.t + f.drift) * 0.35;
          if (f.y > GRID_H) {
            f.y = -4;
            f.x = Math.random() * GRID_W;
          }
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'firefly':
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 16; i++) {
          const phase = this.t * 0.5 + i * 1.7;
          const x = (i * 137 + Math.sin(phase) * 40) % GRID_W;
          const y = 120 + ((i * 83) % 380) + Math.cos(phase * 1.3) * 18;
          ctx.fillStyle = `rgba(190, 255, 150, ${0.25 + 0.35 * Math.abs(Math.sin(phase))})`;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        break;
      case 'dust':
        for (let i = 0; i < 26; i++) {
          const phase = this.t * 0.25 + i;
          const x = ((i * 71 + this.t * 9) % (GRID_W + 40)) - 20;
          const y = 180 + ((i * 53) % 330) + Math.sin(phase) * 6;
          ctx.fillStyle = `rgba(255, 226, 180, ${0.08 + 0.12 * Math.abs(Math.sin(phase))})`;
          ctx.fillRect(x, y, 2, 2);
        }
        break;
      case 'mote':
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 20; i++) {
          const phase = this.t * 0.6 + i * 2.1;
          const x = (i * 97 + Math.sin(phase) * 24) % GRID_W;
          const y = 90 + ((i * 61) % 420);
          ctx.fillStyle = `rgba(130, 190, 255, ${0.07 + 0.1 * Math.abs(Math.sin(phase))})`;
          ctx.fillRect(x, y, 3, 1.5);
        }
        ctx.globalCompositeOperation = 'source-over';
        break;
    }
  }

  private drawVignette(ctx: CanvasRenderingContext2D): void {
    if (!this.vignetteCache) {
      const g = ctx.createRadialGradient(
        GRID_W / 2,
        GRID_H / 2,
        GRID_H * 0.35,
        GRID_W / 2,
        GRID_H / 2,
        GRID_W * 0.72
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, this.palette.vignette);
      this.vignetteCache = g;
    }
    ctx.fillStyle = this.vignetteCache;
    ctx.fillRect(0, 0, GRID_W, GRID_H);
  }

  // ---------------------------------------------------------------- tours
  private drawTower(ctx: CanvasRenderingContext2D, t: Tower): void {
    const { x, y } = t.pos;
    const rich = this.rich;
    const recoil = t.flash > 0 ? -Math.min(3, t.flash * 24) : 0;
    const lift = rich ? 9 : 0;

    ctx.fillStyle = SHADOW;
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 5, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111a29';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.grad(ctx, 'towerPlate', -8, 8, [
      [0, '#526d92'],
      [1, '#1d2839'],
    ]);
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190, 225, 255, 0.55)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(10, 16, 26, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y - lift);

    const bodyR = 9 + t.level * 1.2;
    ctx.fillStyle = this.bodyGrad(ctx, '#374b66', -bodyR, bodyR);
    ctx.beginPath();
    ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 215, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(-bodyR * 0.3, -bodyR * 0.35, bodyR * 0.55, Math.PI * 0.9, Math.PI * 1.6);
    ctx.fill();

    ctx.rotate(t.angle);
    ctx.translate(recoil, 0);
    this.drawBarrel(ctx, t);
    ctx.restore();

    for (let i = 0; i <= t.level; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.55;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 20, y + Math.sin(a) * 20 + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t.kind.kind !== 'income' && this.engine.hasAdjacencyBonus(t)) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.4);
      ctx.strokeStyle = `rgba(124, 240, 160, ${0.22 + pulse * 0.28})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y - 2, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(16, 52, 30, 0.95)';
      ctx.beginPath();
      ctx.arc(x + 14, y - 15, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7cf0a0';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+10', x + 14, y - 12.4);
      ctx.textAlign = 'left';
    }

    if (t.flash > 0 && t.kind.kind !== 'income') {
      const a = Math.min(1, t.flash * 8);
      const mx = x + Math.cos(t.angle) * 26;
      const my = y - lift + Math.sin(t.angle) * 26;
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 12);
      glow.addColorStop(0, `rgba(255, 255, 255, ${a})`);
      glow.addColorStop(0.4, `rgba(255, 220, 140, ${a * 0.55})`);
      glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mx, my, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Canons : silhouettes distinctes, matière commune, reflet supérieur. */
  private drawBarrel(ctx: CanvasRenderingContext2D, t: Tower): void {
    const c = t.kind.color;
    const spec = t.specIndex;
    const metal = this.bodyGrad(ctx, '#2b3a52', -8, 8);
    const accent = t.flash > 0 ? '#ffffff' : t.kind.accent;

    switch (t.id) {
      case 'plasma':
        ctx.fillStyle = metal;
        ctx.fillRect(0, -5, 21, 10);
        ctx.fillStyle = accent;
        ctx.fillRect(17, -2.5, 6, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(0, -5, 21, 2.5);
        if (spec === 0) {
          ctx.fillStyle = metal;
          ctx.fillRect(0, -13, 17, 7);
          ctx.fillStyle = accent;
          ctx.fillRect(15, -11.5, 5, 4);
        }
        if (spec === 1) {
          ctx.fillStyle = '#e8a818';
          for (const cx of [5, 10, 15]) {
            ctx.fillRect(cx, -6.5, 3, 3);
            ctx.fillRect(cx, 3.5, 3, 3);
          }
        }
        break;
      case 'laser':
        ctx.fillStyle = this.bodyGrad(ctx, '#3a2430', -7, 7);
        ctx.fillRect(-2, -6, 25, 12);
        ctx.fillStyle = accent;
        ctx.fillRect(19, -2, 8, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        ctx.fillRect(-2, -6, 25, 2.5);
        if (spec === 0) {
          ctx.fillStyle = '#ffd0d0';
          ctx.beginPath();
          ctx.arc(27, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (spec === 1) {
          ctx.fillStyle = '#583a4a';
          ctx.fillRect(8, -12, 10, 4);
          ctx.fillStyle = '#bfe9ff';
          ctx.fillRect(16, -11.5, 2.5, 3);
        }
        break;
      case 'ion':
        ctx.fillStyle = this.bodyGrad(ctx, '#1f3a3f', -9, 9);
        ctx.beginPath();
        ctx.arc(8, 0, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(16, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(8, 0, 11.5, -0.8, 0.8);
        ctx.stroke();
        if (spec === 0) {
          ctx.fillStyle = '#a8fff4';
          for (const cy of [-9, 9]) {
            ctx.beginPath();
            ctx.moveTo(6, cy);
            ctx.lineTo(9.5, cy + 2);
            ctx.lineTo(6, cy + 4.5);
            ctx.closePath();
            ctx.fill();
          }
        }
        if (spec === 1) {
          ctx.strokeStyle = 'rgba(168, 255, 244, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(8, 0, 14.5, -1.1, 1.1);
          ctx.stroke();
        }
        break;
      case 'missile':
        ctx.fillStyle = this.bodyGrad(ctx, '#3a2f1c', -11, 11);
        ctx.fillRect(-4, -10, 17, 20);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(-4, -10, 17, 3);
        ctx.fillStyle = accent;
        for (const dy of [-6, 0, 6]) ctx.fillRect(9, dy - 1.5, 10, 3);
        if (spec === 0) {
          ctx.fillStyle = '#d64f2a';
          for (const dy of [-6, 0, 6]) ctx.fillRect(17, dy - 2, 5, 4);
        }
        if (spec === 1) {
          ctx.fillStyle = '#4a3c22';
          ctx.fillRect(-2, -17, 12, 6);
          ctx.fillStyle = '#ffe08a';
          ctx.fillRect(0, -15.5, 2, 3);
          ctx.fillRect(4, -15.5, 2, 3);
        }
        break;
      case 'tesla': {
        ctx.fillStyle = this.bodyGrad(ctx, '#2c1f3a', -10, 10);
        ctx.beginPath();
        ctx.arc(4, 0, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.5;
        const rings = spec === 0 ? 5 : spec === 1 ? 3 : 4;
        for (let i = 0; i < rings; i++) {
          ctx.beginPath();
          ctx.arc(4, 0, 6 + i * 3, this.t * 4 + i, this.t * 4 + i + 2);
          ctx.stroke();
        }
        if (spec === 0) {
          ctx.beginPath();
          ctx.moveTo(-4, -8);
          ctx.lineTo(-9, -12);
          ctx.moveTo(-4, 8);
          ctx.lineTo(-9, 12);
          ctx.stroke();
        }
        break;
      }
      case 'rail':
        ctx.fillStyle = this.bodyGrad(ctx, '#33363c', -9, 9);
        ctx.fillRect(-2, -8, 27, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(-2, -8, 27, 3);
        ctx.fillStyle = accent;
        ctx.fillRect(21, -2, 8, 4);
        ctx.strokeStyle = 'rgba(191, 230, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(2, -6);
        ctx.lineTo(22, -6);
        ctx.moveTo(2, 6);
        ctx.lineTo(22, 6);
        ctx.stroke();
        if (spec === 1) {
          ctx.fillRect(26, -1.5, 9, 3);
          ctx.fillStyle = '#4a4f58';
          ctx.fillRect(-2, -11.5, 8, 4);
        }
        if (spec === 0) {
          ctx.fillStyle = '#7de64f';
          for (const cx of [6, 12, 18]) ctx.fillRect(cx, -10.5, 2, 3);
        }
        break;
      case 'tractor':
        ctx.fillStyle = this.bodyGrad(ctx, '#3a3220', -8, 8);
        ctx.fillRect(-2, -7, 23, 14);
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(15 + i * 5, -4 + i * 2);
          ctx.lineTo(25 + i * 5, -1 + i * 2);
          ctx.stroke();
        }
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(10, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        if (spec === 0) {
          ctx.strokeStyle = '#ffe9a8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(14, -6);
          ctx.lineTo(23, -6);
          ctx.moveTo(14, 6);
          ctx.lineTo(23, 6);
          ctx.stroke();
        }
        if (spec === 1) {
          ctx.fillStyle = '#c9a64f';
          ctx.beginPath();
          ctx.arc(10, -6.5, 2.5, 0, Math.PI * 2);
          ctx.arc(10, 6.5, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'axial':
        ctx.fillStyle = this.bodyGrad(ctx, '#1e2a1a', -12, 12);
        ctx.beginPath();
        ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bodyGrad(ctx, '#2c3a24', -11, 11);
        ctx.fillRect(6, -11, 19, 22);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(23, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(216, 255, 176, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, this.t * 2, this.t * 2 + 2);
        ctx.stroke();
        if (spec === 0) {
          const orb = ctx.createRadialGradient(23, 0, 1, 23, 0, 9);
          orb.addColorStop(0, 'rgba(216, 255, 176, 1)');
          orb.addColorStop(1, 'rgba(125, 230, 79, 0)');
          ctx.fillStyle = orb;
          ctx.beginPath();
          ctx.arc(23, 0, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        if (spec === 1) {
          ctx.fillStyle = '#4a5f3a';
          for (const cy of [-8, 8]) ctx.fillRect(2, cy - 2, 11, 4);
        }
        break;
      case 'extractor':
        ctx.rotate(0);
        ctx.fillStyle = this.bodyGrad(ctx, '#2a2f38', -12, 12);
        ctx.beginPath();
        ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, this.t * 1.5, this.t * 1.5 + 2.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, -this.t * 2, -this.t * 2 + 1.6);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5 + Math.sin(this.t * 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  private drawSelection(ctx: CanvasRenderingContext2D): void {
    const t = this.selectedTower!;
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(t.pos.x, t.pos.y, t.stats.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.35)';
    ctx.beginPath();
    ctx.ellipse(t.pos.x, t.pos.y + 4, 20, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---------------------------------------------------------------- ennemis
  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
    const { x, y } = e.pos;
    const rich = this.rich;
    const lift = rich ? 4 : 0;
    const r = e.kind.radius;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + r * 0.62, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y - lift);
    if (e.kind.cloak) ctx.globalAlpha = 0.55;
    ctx.rotate(e.dir);

    const fill = e.hitFlash > 0 ? '#ffffff' : this.bodyGrad(ctx, e.kind.color, -r, r);

    switch (e.kind.shape) {
      case 'drone':
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ff5a4a';
        ctx.beginPath();
        ctx.arc(r * 0.5, 0, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'soldier':
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.75, r * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(20, 24, 34, 0.9)';
        ctx.beginPath();
        ctx.ellipse(r * 0.28, 0, r * 0.34, r * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = darken(e.kind.color, 0.35);
        ctx.fillRect(-r * 0.95, -r * 0.5, r * 0.5, r);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(r * 0.1, -r * 0.92, r * 0.9, r * 0.2);
        break;
      case 'wing': {
        ctx.fillStyle = '#2f3640';
        ctx.beginPath();
        ctx.moveTo(r * 1.7, 0);
        ctx.lineTo(r * 0.4, -r * 0.36);
        ctx.lineTo(r * 0.4, r * 0.36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = fill;
        ctx.fillRect(-r * 0.2, -r * 0.55, r * 0.8, r * 1.1);
        ctx.fillStyle = '#3a4150';
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, -r * 0.5);
        ctx.lineTo(-r * 1.35, -r * 1.2);
        ctx.lineTo(-r * 1.0, -r * 0.35);
        ctx.closePath();
        ctx.moveTo(-r * 0.2, r * 0.5);
        ctx.lineTo(-r * 1.35, r * 1.2);
        ctx.lineTo(-r * 1.0, r * 0.35);
        ctx.closePath();
        ctx.fill();
        const glow = 0.55 + 0.45 * Math.sin(this.t * 12 + e.phase);
        const engine = ctx.createRadialGradient(-r * 1.2, 0, 0, -r * 1.2, 0, r * 1.1);
        engine.addColorStop(0, `rgba(140, 215, 255, ${glow})`);
        engine.addColorStop(1, 'rgba(120, 190, 255, 0)');
        ctx.fillStyle = engine;
        ctx.beginPath();
        ctx.arc(-r * 1.2, 0, r * 1.1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'tank':
        ctx.fillStyle = '#4a3a26';
        ctx.fillRect(-r, -r * 0.5, r * 2, r);
        ctx.fillStyle = fill;
        ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 0.55);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 0.2);
        ctx.fillStyle = '#2c2013';
        for (const wx of [-r * 0.6, 0, r * 0.6]) {
          ctx.beginPath();
          ctx.arc(wx, r * 0.42, r * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#3d2c1a';
        ctx.fillRect(-r * 0.1, -r * 1.05, r * 1.5, r * 0.3);
        break;
      case 'walker': {
        const step = Math.sin(this.t * 5 + e.phase) * r * 0.25;
        ctx.fillStyle = '#3d4450';
        for (const [lx, ly] of [
          [-r * 0.45, r * 0.35],
          [r * 0.45, r * 0.35],
        ] as const) {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(step * (lx > 0 ? 1 : -1) * 0.2);
          ctx.fillRect(-r * 0.12, 0, r * 0.24, r * 0.75);
          ctx.fillRect(-r * 0.3, r * 0.7, r * 0.6, r * 0.14);
          ctx.restore();
        }
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.9);
        ctx.lineTo(r * 0.7, -r * 0.6);
        ctx.lineTo(r * 0.8, r * 0.3);
        ctx.lineTo(-r * 0.5, r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.9);
        ctx.lineTo(r * 0.7, -r * 0.6);
        ctx.lineTo(r * 0.7, -r * 0.35);
        ctx.lineTo(-r * 0.5, -r * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff8a5a';
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 0.3, r * 0.14, 0, Math.PI * 2);
        ctx.arc(r * 0.05, -r * 0.4, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'saucer': {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.22, r * 0.55, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        const halo = ctx.createRadialGradient(0, r * 0.1, 1, 0, r * 0.1, r);
        halo.addColorStop(0, 'rgba(180, 240, 255, 0.3)');
        halo.addColorStop(1, 'rgba(180, 240, 255, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.12, r, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'wedge':
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(r * 1.3, -r * 0.5);
        ctx.lineTo(r * 1.3, r * 0.5);
        ctx.lineTo(-r * 1.5, r * 0.85);
        ctx.lineTo(-r * 1.5, -r * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        ctx.beginPath();
        ctx.moveTo(r * 1.3, -r * 0.5);
        ctx.lineTo(-r * 1.5, -r * 0.85);
        ctx.lineTo(-r * 1.5, -r * 0.4);
        ctx.lineTo(r * 1.3, -r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9aa3c9';
        ctx.fillRect(-r * 1.5, -r * 0.3, r * 2.2, r * 0.6);
        for (const bridge of [-r * 0.55, -r * 0.05, r * 0.45]) {
          ctx.fillStyle = '#2b2f4a';
          ctx.fillRect(bridge, -r * 0.9, r * 0.3, r * 1.8);
        }
        const pod = ctx.createRadialGradient(-r * 1.45, 0, 1, -r * 1.45, 0, r * 0.8);
        pod.addColorStop(0, 'rgba(160, 200, 255, 0.9)');
        pod.addColorStop(1, 'rgba(120, 160, 255, 0)');
        ctx.fillStyle = pod;
        ctx.beginPath();
        ctx.arc(-r * 1.45, 0, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();

    if (e.kind.boss) {
      const glow = 0.35 + 0.3 * Math.sin(this.t * 2);
      ctx.strokeStyle = `rgba(214, 214, 255, ${glow})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y - lift, r * 2.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.hp < e.maxHp || e.shield < e.maxShield) {
      const w = r * 2.6;
      const bx = x - w / 2;
      const by = y - r - (rich ? 16 : 13);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, w + 2, 7);
      if (e.shield > 0) {
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(bx, by, w * (e.shield / e.maxShield), 2);
      }
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = pct > 0.5 ? '#6fe08a' : pct > 0.25 ? '#ffd23f' : '#ff6b6b';
      ctx.fillRect(bx, by + (e.maxShield > 0 ? 2 : 0), w * pct, e.maxShield > 0 ? 3 : 5);
    }
    if (e.slowUntil > 0) {
      ctx.strokeStyle = 'rgba(63, 214, 201, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y - lift, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ---------------------------------------------------------------- projectiles
  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.engine.projectiles) {
      if (p.target) {
        const dx = p.target.pos.x - p.pos.x;
        const dy = p.target.pos.y - p.pos.y;
        const len = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(p.pos.x, p.pos.y);
        ctx.lineTo(p.pos.x - (dx / len) * 14, p.pos.y - (dy / len) * 14);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(p.pos.x - 0.8, p.pos.y - 0.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawArcs(ctx: CanvasRenderingContext2D): void {
    for (const a of this.engine.arcs) {
      const k = Math.max(0, a.life / 0.12);
      ctx.strokeStyle = `rgba(220, 176, 255, ${k * 0.9})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(a.from.x, a.from.y);
      ctx.quadraticCurveTo(a.mid.x, a.mid.y, a.to.x, a.to.y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${k * 0.7})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawEffects(ctx: CanvasRenderingContext2D): void {
    for (const e of this.engine.effects) {
      const k = e.life / e.maxLife;
      const r = e.radius * (1.5 - k * 0.5);
      ctx.strokeStyle = e.color;
      ctx.globalAlpha = k * 0.9;
      ctx.lineWidth = 2.5 * k + 0.5;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = k * 0.22;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- divers
  private drawRangePreview(ctx: CanvasRenderingContext2D): void {
    if (!this.buildPreview) return;
    const { valid, range, bonus } = this.buildPreview;
    const color = valid ? '124, 240, 160' : '255, 96, 96';
    ctx.fillStyle = `rgba(${color}, 0.09)`;
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${color}, ${bonus ? 0.85 : 0.55})`;
    ctx.lineWidth = bonus ? 2 : 1.5;
    if (bonus) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = valid ? 'rgba(160, 230, 255, 0.5)' : 'rgba(255, 120, 120, 0.5)';
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (bonus) {
      ctx.fillStyle = 'rgba(124, 240, 160, 0.95)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+10% portée', this.mouse.x, this.mouse.y - range - 8);
      ctx.textAlign = 'left';
    }
  }

  private drawPortals(ctx: CanvasRenderingContext2D): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 3);
    for (const path of this.engine.paths) {
      const start = path.pts[0];
      const x = start.x < 0 ? 14 : start.x;
      const y = start.y;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 30 + pulse * 6);
      glow.addColorStop(0, `rgba(255, 90, 80, ${0.32 + pulse * 0.25})`);
      glow.addColorStop(1, 'rgba(255, 60, 60, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 30 + pulse * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 120, 100, ${0.5 + pulse * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 13 + pulse * 3, 16 + pulse * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 200, 180, ${0.35 + pulse * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + pulse * 2, 10 + pulse * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawSaber(ctx: CanvasRenderingContext2D): void {
    if (!this.engine.saberActive) return;
    const { x, y } = this.engine.saberPos;
    const on = this.engine.saberEnergy > 0;
    const glow = on ? 1 : 0.35;
    const a = this.t * 7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(x, y, 4, x, y, 26);
    halo.addColorStop(0, `rgba(150, 230, 255, ${0.32 * glow})`);
    halo.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = on ? 'rgba(190, 240, 255, 0.95)' : 'rgba(120, 150, 170, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 20, a, a + Math.PI * 1.55);
    ctx.stroke();
    ctx.strokeStyle = on ? '#ffffff' : 'rgba(200, 220, 235, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, 13, a + Math.PI * 0.15, a + Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  private drawHyperspace(ctx: CanvasRenderingContext2D): void {
    const k = Math.min(1, this.hyperT / 0.35);
    const cx = GRID_W / 2;
    const cy = GRID_H / 2;
    ctx.fillStyle = `rgba(2, 4, 12, ${0.9 * k})`;
    ctx.fillRect(0, 0, GRID_W, GRID_H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy);
    for (let i = 0; i < 80; i++) {
      const angle = (i * 137.5 * Math.PI) / 180;
      const len = 50 + ((i * 31) % 110) * k;
      const r0 = 26 + ((i * 17) % 130) * (1 - k * 0.25);
      ctx.strokeStyle = `rgba(190, 225, 255, ${0.25 + 0.6 * k})`;
      ctx.lineWidth = 1 + k * 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r0, Math.sin(angle) * r0);
      ctx.lineTo(Math.cos(angle) * (r0 + len), Math.sin(angle) * (r0 + len));
      ctx.stroke();
    }
    ctx.restore();
  }
}

// --------------------------------------------------------------------------
// Couleurs
// --------------------------------------------------------------------------

function lighten(hex: string, amount: number): string {
  return mix(hex, '#ffffff', amount);
}

function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount);
}

function mix(hex: string, target: string, amount: number): string {
  const a = parseHex(hex);
  const b = parseHex(target);
  if (!a || !b) return hex;
  const r = Math.round(a[0] + (b[0] - a[0]) * amount);
  const g = Math.round(a[1] + (b[1] - a[1]) * amount);
  const bl = Math.round(a[2] + (b[2] - a[2]) * amount);
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
