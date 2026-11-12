/* ==========================================================================
   gore.js — variante « manga gore » de la scène (désactivée par défaut)
   Un condamné est déjà pendu ; chaque erreur sectionne un membre, le corps
   se balance au bout de la corde, le sang gicle en style manga (aplats,
   onomatopées, traits de vitesse, trame de papier).
   ========================================================================== */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  const PAPER = "#ece6da";
  const INK = "#141216";
  const BLOOD = "#d21f2b";
  const BLOOD_DARK = "#8d1119";
  const SKIN = "#f0dccd";
  const SHIRT = "#f8f4ea";
  const PANTS = "#2c2b33";

  const EDGE = 2.1;
  const OTOMA = ["ZAWA", "GUSA", "DOSA", "ZAKU", "BATSU", "ZAN"];

  /* Ordre de sectionnement : le plus distal d'abord. */
  const SEQUENCE = [
    "handL", "handR", "footL", "footR",
    "forearmL", "forearmR", "calfL", "calfR",
    "upperArmL", "upperArmR", "thighL", "thighR",
  ];

  const LABEL = {
    handL: "main gauche", handR: "main droite",
    footL: "pied gauche", footR: "pied droit",
    forearmL: "avant-bras gauche", forearmR: "avant-bras droit",
    calfL: "mollet gauche", calfR: "mollet droit",
    upperArmL: "bras gauche", upperArmR: "bras droit",
    thighL: "cuisse gauche", thighR: "cuisse droite",
  };

  class GoreBody {
    constructor(scene) {
      this.scene = scene;
      this.reset();
    }

    reset() {
      this.cuts = 0;
      this.angle = 0.04;
      this.omega = 0;
      this.jerk = 0;
      this.sag = 0;
      this.debris = [];
      this.blood = [];
      this.splats = [];
      this.drips = [];
      this.otoma = [];
      this.speed = [];
      this.stains = [];
      this.shock = [];
      this.pool = 0;
      this.groundY = 0;
      this.t = 0;
      this.flashCut = 0;
      this.won = false;
      this.lost = false;
      this.exploded = false;
      this.bodyGone = false;
      this.boom = 0;
      this.drop = 0;
    }

    /** Unité de dessin : le corps occupe ~3 unités de haut. */
    unit() {
      const sc = this.scene;
      return Math.min(sc.h * 0.17, sc.w * 0.19, 118);
    }

    /** Nombre de membres sectionnés (0 = corps intact). */
    setCuts(n) {
      n = clamp(n | 0, 0, SEQUENCE.length);
      while (this.cuts < n) this._cutOne(this.cuts);
      if (n < this.cuts) this.cuts = n;
    }

    isCut(id) {
      const i = SEQUENCE.indexOf(id);
      return i >= 0 && i < this.cuts;
    }

    _anchor() {
      return { x: this.scene.w * 0.5, y: this.scene.h * 0.4 };
    }

    _cutOne(index) {
      const id = SEQUENCE[index];
      if (!id) return;
      const u = this.unit();
      const a = this._anchor();
      const local = this._jointLocal(id, u);
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      const px = a.x + local.x * cos - local.y * sin;
      const py = a.y + local.x * sin + local.y * cos + this.sag;

      this.cuts = index + 1;
      this.omega += (index % 2 === 0 ? 1 : -1) * rand(2.1, 3.2);
      this.jerk = 1;
      this.flashCut = 1;
      this._spawnCut(px, py, id, u);
    }

    /** Point d'articulation d'un membre, en coordonnées locales du corps. */
    _jointLocal(id, u) {
      const P = {
        handL: [-0.54 * u, 1.24 * u], handR: [0.54 * u, 1.24 * u],
        forearmL: [-0.5 * u, 0.78 * u], forearmR: [0.5 * u, 0.78 * u],
        footL: [-0.21 * u, 2.16 * u], footR: [0.21 * u, 2.16 * u],
        calfL: [-0.25 * u, 1.58 * u], calfR: [0.25 * u, 1.58 * u],
        upperArmL: [-0.36 * u, 0.2 * u], upperArmR: [0.36 * u, 0.2 * u],
        thighL: [-0.16 * u, 0.98 * u], thighR: [0.16 * u, 0.98 * u],
      };
      return { x: (P[id] || [0, 0])[0], y: (P[id] || [0, 0])[1] };
    }

    _spawnCut(x, y, id, u) {
      const dir = id.endsWith("R") ? 1 : -1;
      for (let i = 0; i < 12; i++) {
        const a = rand(-Math.PI, Math.PI);
        const sp = rand(30, 170) * (u / 100);
        this.blood.push({
          x, y, vx: Math.cos(a) * sp + dir * 24, vy: Math.sin(a) * sp - 30,
          r: rand(1.2, 3.4), life: rand(0.45, 1.1), g: 640,
        });
      }
      for (let i = 0; i < 2; i++) {
        this.splats.push({
          x, y, rot: rand(0, TAU), w: rand(7, 15) * (u / 100), h: rand(2, 5),
          life: 0.45, max: 0.45,
        });
      }
      for (let i = 0; i < 2; i++) {
        this.drips.push({ x: x + rand(-5, 5), y: y + rand(0, 6), vy: rand(26, 60), r: rand(1.3, 2.6) });
      }
      // onomatopée : deux au maximum à l'écran
      if (this.otoma.length > 1) this.otoma.shift();
      this.otoma.push({
        text: OTOMA[(Math.random() * OTOMA.length) | 0],
        x: x + dir * rand(0.42, 0.62) * u,
        y: y - rand(0.05, 0.3) * u,
        rot: rand(-0.3, 0.3), life: 1.05, max: 1.05, size: rand(16, 24) * (u / 100),
      });
      for (let i = 0; i < 12; i++) {
        this.speed.push({ x, y, a: rand(0, TAU), len: rand(24, 80) * (u / 100), life: 0.26, max: 0.26 });
      }
      const seg = this._segmentOf(id, u);
      if (seg) {
        this.debris.push({
          x, y, vx: dir * rand(15, 55), vy: rand(-35, 5),
          rot: rand(-0.3, 0.3), vr: dir * rand(1.4, 3.4),
          len: seg.len, w: seg.w, color: seg.color, life: 1.6,
        });
      }
    }

    _segmentOf(id, u) {
      if (id === "handL" || id === "handR") return { len: 0.22 * u, w: 0.17 * u, color: SKIN };
      if (id === "footL" || id === "footR") return { len: 0.3 * u, w: 0.18 * u, color: PANTS };
      if (id === "forearmL" || id === "forearmR") return { len: 0.5 * u, w: 0.13 * u, color: SKIN };
      if (id === "calfL" || id === "calfR") return { len: 0.58 * u, w: 0.18 * u, color: PANTS };
      if (id === "upperArmL" || id === "upperArmR") return { len: 0.58 * u, w: 0.16 * u, color: SHIRT };
      return { len: 0.64 * u, w: 0.22 * u, color: PANTS };
    }

    /** Le corps se balance plus fort (défaite). */
    impulse(strength) {
      this.omega += (Math.random() < 0.5 ? -1 : 1) * (strength || 2.2);
    }

    /** Victoire : on coupe la corde, le corps tombe. */
    release() {
      this.won = true;
      this.drop = 0;
      this.omega += 1.4;
    }

    lose() {
      this.lost = true;
      this.impulse(3);
      if (!this.exploded) this.explode();
    }

    /** Dernier coup : le corps explose (planche manga). */
    explode() {
      if (this.exploded) return;
      this.exploded = true;
      this.bodyGone = true;
      this.boom = 1;
      const u = this.unit();
      const a = this._anchor();
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const cx = a.x + (-0.0 * ca - 0.7 * u * sa);
      const cy = a.y + this.sag + (0.0 * sa + 0.7 * u * ca);

      // grandes taches d'encre rouge sur le papier (permanentes)
      for (let i = 0; i < 6; i++) {
        this.stains.push({
          x: cx + rand(-0.55, 0.55) * u,
          y: cy + rand(-0.45, 0.55) * u,
          r: rand(0.18, 0.55) * u,
          rot: rand(0, TAU),
          lobes: 1 + ((Math.random() * 3) | 0),
        });
      }

      // morceaux du corps projetés
      const colors = [SHIRT, PANTS, SKIN, SHIRT, PANTS, SKIN, SHIRT, PANTS, SHIRT];
      for (let i = 0; i < 11; i++) {
        const ang = rand(0, TAU);
        const sp = rand(110, 640) * (u / 100);
        this.debris.push({
          x: cx, y: cy,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 190,
          rot: rand(0, TAU), vr: rand(-10, 10),
          len: rand(0.16, 0.46) * u, w: rand(0.09, 0.2) * u,
          color: colors[i % colors.length], life: 2.6,
        });
      }
      // giclée massive
      for (let i = 0; i < 110; i++) {
        const ang = rand(0, TAU);
        const sp = rand(60, 520) * (u / 100);
        this.blood.push({
          x: cx + rand(-0.15, 0.15) * u, y: cy + rand(-0.15, 0.15) * u,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 120,
          r: rand(1.6, 6.5), life: rand(0.6, 1.8), g: 660,
        });
      }
      // éclaboussures en lames
      for (let i = 0; i < 10; i++) {
        this.splats.push({
          x: cx + rand(-0.3, 0.3) * u, y: cy + rand(-0.3, 0.3) * u,
          rot: rand(0, TAU), w: rand(14, 40) * (u / 100), h: rand(3, 9),
          life: 0.7, max: 0.7,
        });
      }
      // onomatopée géante
      this.otoma.push({
        text: "DOGAAN", x: cx + 0.08 * u, y: cy - 0.5 * u,
        rot: -0.09, life: 2.6, max: 2.6, size: Math.min(2.15 * u, 92), big: true,
      });
      // traits de vitesse radiaux
      for (let i = 0; i < 30; i++) {
        this.speed.push({
          x: cx, y: cy, a: rand(0, TAU), len: rand(0.5, 1.6) * u,
          life: 0.42, max: 0.42,
        });
      }
      // onde de choc
      this.shock.push({ x: cx, y: cy, t: 0 });
      this.pool = Math.min(u * 1.1, this.pool + u * 0.45);
      this.impulse(6);
    }

    update(dt) {
      this.t += dt;
      const k = 26;
      const damp = 1.45;
      this.omega += (-k * this.angle - damp * this.omega) * dt;
      this.angle += this.omega * dt;
      this.angle = clamp(this.angle, -0.55, 0.55);
      this.jerk = Math.max(0, this.jerk - dt * 2.4);
      this.flashCut = Math.max(0, this.flashCut - dt * 2.6);
      this.boom = Math.max(0, this.boom - dt * 1.15);
      this.shock.forEach((s) => { s.t += dt; });
      this.shock = this.shock.filter((s) => s.t < 0.7);
      if (this.won) this.drop += (this.scene.h * 0.32 - this.drop) * Math.min(1, dt * 2.2);
      if (this.lost) this.sag += (this.scene.h * 0.02 - this.sag) * Math.min(1, dt * 3);
      this.groundY = this._ground();

      this.blood = this.blood.filter((p) => {
        p.life -= dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > this.groundY) {
          this.pool = Math.min(this.unit() * 1.1, this.pool + p.r * 0.9);
          return false;
        }
        return p.life > 0;
      });

      this.drips = this.drips.filter((d) => {
        d.vy += 540 * dt;
        d.y += d.vy * dt;
        if (d.y > this.groundY) {
          this.pool = Math.min(this.unit() * 1.1, this.pool + d.r * 2.4);
          return false;
        }
        return true;
      });

      this.debris = this.debris.filter((p) => {
        p.life -= dt;
        p.vy += 760 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        return p.life > 0 && p.y < this.scene.h + 80;
      });

      this.splats.forEach((p) => { p.life -= dt; });
      this.splats = this.splats.filter((p) => p.life > 0);
      this.otoma.forEach((o) => { o.life -= dt; });
      this.otoma = this.otoma.filter((o) => o.life > 0);
      this.speed.forEach((p) => { p.life -= dt; });
      this.speed = this.speed.filter((p) => p.life > 0);
    }

    _ground() {
      return this.scene.h * 0.9;
    }

    /* ------------------------------------------------------------ dessin */
    draw(ctx) {
      const u = this.unit();
      const a = this._anchor();

      this._paper(ctx);
      this._stains(ctx);
      this._speedLines(ctx);
      this._gallows(ctx, a, u);
      this._pool(ctx, this._ground(), u);

      if (!this.bodyGone) {
        ctx.save();
        const jerkY = Math.sin(this.t * 26) * this.jerk * 0.028 * u;
        if (!this.won) this._rope(ctx, u, a);
        ctx.translate(a.x, a.y + this.sag + this.drop + jerkY);
        ctx.rotate(this.angle + Math.sin(this.t * 1.1) * 0.01);
        this._body(ctx, u);
        ctx.restore();
      } else {
        this._brokenRope(ctx, u, a);
      }

      this._shock(ctx);
      this._debris(ctx);
      this._blood(ctx);
      this._splats(ctx);
      this._boom(ctx);
      this._otoma(ctx);
      this._frame(ctx);
    }

    /** Éclats de sang séchés sur le papier (après l'explosion). */
    _stains(ctx) {
      ctx.save();
      for (const s of this.stains) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.fillStyle = "rgba(190,26,38,0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, s.r, s.r * 0.62, 0, 0, TAU);
        ctx.fill();
        for (let i = 0; i < s.lobes; i++) {
          const ang = (i / s.lobes) * TAU + 0.6;
          ctx.beginPath();
          ctx.ellipse(Math.cos(ang) * s.r * 0.9, Math.sin(ang) * s.r * 0.5, s.r * 0.42, s.r * 0.26, ang, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    _brokenRope(ctx, u, a) {
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 1.35 * u);
      ctx.quadraticCurveTo(a.x + 3 + Math.sin(this.t * 2) * 5, a.y - 0.7 * u, a.x + Math.sin(this.t * 2) * 9, a.y - 0.32 * u);
      ctx.stroke();
      // filoche
      for (let i = 0; i < 4; i++) {
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const bx = a.x + Math.sin(this.t * 2) * 9;
        const by = a.y - 0.32 * u;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + rand(-8, 8), by + rand(4, 14));
        ctx.stroke();
      }
      ctx.restore();
    }

    _shock(ctx) {
      ctx.save();
      for (const s of this.shock) {
        const k = s.t / 0.7;
        ctx.globalAlpha = (1 - k) * 0.55;
        ctx.strokeStyle = "#d21f2b";
        ctx.lineWidth = 6 * (1 - k) + 0.8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 20 + k * this.unit() * 3.6, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = (1 - k) * 0.35;
        ctx.strokeStyle = "#141216";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 26 + k * this.unit() * 3.6, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    /** Flash d'impact manga : blanc + traits noirs radiaux. */
    _boom(ctx) {
      if (this.boom <= 0.001) return;
      const { w, h } = this.scene;
      const k = this.boom;
      const a = this._anchor();
      const cy = a.y + this.unit() * 0.7;
      ctx.save();
      const g = ctx.createRadialGradient(a.x, cy, 0, a.x, cy, Math.max(w, h) * 0.5);
      g.addColorStop(0, `rgba(255,255,255,${0.55 * k})`);
      g.addColorStop(0.35, `rgba(255,255,255,${0.18 * k})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = k * 0.85;
      ctx.strokeStyle = INK;
      ctx.lineCap = "round";
      for (let i = 0; i < 30; i++) {
        const ang = (i / 30) * TAU + 0.15;
        const r0 = Math.max(w, h) * 0.07;
        const r1 = Math.max(w, h) * (0.3 + 0.16 * (1 - k));
        ctx.lineWidth = 5 * k + 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
        ctx.lineTo(a.x + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.stroke();
      }
      ctx.restore();
    }

    _paper(ctx) {
      const w = this.scene.w;
      const h = this.scene.h;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.72);
      g.addColorStop(0, "rgba(255,255,255,0.32)");
      g.addColorStop(0.62, "rgba(120,110,96,0.10)");
      g.addColorStop(1, "rgba(40,34,28,0.32)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // trame de manga
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = INK;
      const step = Math.max(8, this.scene.s * 0.11);
      for (let y = step * 0.5; y < h; y += step) {
        for (let x = ((y / step) % 2) * step * 0.5 + step * 0.5; x < w; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.1, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();

      // halo rouge derrière le corps
      const a = this._anchor();
      const rg = ctx.createRadialGradient(a.x, a.y + this.unit(), 0, a.x, a.y + this.unit(), this.unit() * 2.8);
      rg.addColorStop(0, "rgba(210,31,43,0.18)");
      rg.addColorStop(1, "rgba(210,31,43,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }

    _speedLines(ctx) {
      const { w, h } = this.scene;
      const cx = w / 2;
      const cy = h * 0.42;
      ctx.save();
      ctx.strokeStyle = "rgba(20,18,22,0.08)";
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 54; i++) {
        const a = (i / 54) * TAU + 0.2;
        const r0 = Math.max(w, h) * 0.24;
        const r1 = Math.max(w, h) * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();
    }

    _gallows(ctx, a, u) {
      const beamY = a.y - 1.35 * u;
      const beamLeft = a.x - 1.65 * u;
      const beamRight = a.x + 1.2 * u;
      const footY = this._ground();
      const postX = beamRight - 10;

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // poteau
      ctx.strokeStyle = INK;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(postX, beamY);
      ctx.lineTo(postX, footY);
      ctx.stroke();
      ctx.strokeStyle = "#d8d0c1";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(postX - 3, beamY + 8);
      ctx.lineTo(postX - 3, footY - 4);
      ctx.stroke();

      // poutre
      ctx.strokeStyle = INK;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(beamLeft, beamY);
      ctx.lineTo(beamRight, beamY);
      ctx.stroke();
      ctx.strokeStyle = "#d8d0c1";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(beamLeft + 4, beamY - 3);
      ctx.lineTo(beamRight - 4, beamY - 3);
      ctx.stroke();

      // hachures
      ctx.strokeStyle = "rgba(20,18,22,0.35)";
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 6; i++) {
        const x = postX - 12 + i * 2;
        ctx.beginPath();
        ctx.moveTo(x, beamY + 12 + i * 20);
        ctx.lineTo(x + 6, beamY + 17 + i * 20);
        ctx.stroke();
      }
      // pied de la potence
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(postX - 26, footY);
      ctx.lineTo(postX + 14, footY);
      ctx.stroke();

      // sol
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(this.scene.w * 0.06, footY);
      ctx.lineTo(this.scene.w * 0.94, footY);
      ctx.stroke();
      ctx.restore();
    }

    _rope(ctx, u, a) {
      ctx.save();
      const beamY = a.y - 1.35 * u;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(a.x, beamY);
      ctx.quadraticCurveTo(a.x + 1, a.y - 0.7 * u, a.x, a.y - 0.12 * u);
      ctx.stroke();
      // nœud coulant
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(a.x, a.y - 0.02 * u, 0.15 * u, 0.09 * u, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(a.x + 0.12 * u, a.y + 0.02 * u);
      ctx.lineTo(a.x + 0.15 * u, a.y + 0.28 * u);
      ctx.stroke();
      ctx.restore();
    }

    _body(ctx, u) {
      const cut = (id) => this.isCut(id);
      this._leg(ctx, u, -1, cut("thighL"), cut("calfL"), cut("footL"));
      this._leg(ctx, u, 1, cut("thighR"), cut("calfR"), cut("footR"));
      this._torso(ctx, u);
      this._arm(ctx, u, -1, cut("upperArmL"), cut("forearmL"), cut("handL"));
      this._arm(ctx, u, 1, cut("upperArmR"), cut("forearmR"), cut("handR"));
      this._head(ctx, u);
    }

    _torso(ctx, u) {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-0.33 * u, 0.14 * u);
      ctx.quadraticCurveTo(-0.37 * u, 0.6 * u, -0.21 * u, 1.0 * u);
      ctx.lineTo(0.21 * u, 1.0 * u);
      ctx.quadraticCurveTo(0.37 * u, 0.6 * u, 0.33 * u, 0.14 * u);
      ctx.quadraticCurveTo(0, 0.02 * u, -0.33 * u, 0.14 * u);
      ctx.closePath();
      ctx.fillStyle = SHIRT;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = EDGE;
      ctx.stroke();

      // col
      ctx.beginPath();
      ctx.moveTo(-0.12 * u, 0.13 * u);
      ctx.lineTo(0, 0.26 * u);
      ctx.lineTo(0.12 * u, 0.13 * u);
      ctx.stroke();

      // plis + hachures
      ctx.strokeStyle = "rgba(20,18,22,0.5)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-0.18 * u, 0.4 * u);
      ctx.quadraticCurveTo(-0.04 * u, 0.48 * u, 0.15 * u, 0.42 * u);
      ctx.moveTo(-0.15 * u, 0.62 * u);
      ctx.quadraticCurveTo(0, 0.68 * u, 0.13 * u, 0.62 * u);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0.08 * u + i * 0.03 * u, 0.3 * u);
        ctx.lineTo(0.04 * u + i * 0.03 * u, 0.5 * u);
        ctx.stroke();
      }

      // ceinture
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-0.22 * u, 0.96 * u);
      ctx.lineTo(0.22 * u, 0.96 * u);
      ctx.stroke();

      // tache de sang qui grandit
      const k = Math.min(1, this.cuts / 6);
      if (k > 0) {
        ctx.save();
        ctx.fillStyle = BLOOD;
        ctx.beginPath();
        ctx.ellipse(-0.05 * u, (0.46 + k * 0.08) * u, (0.035 + k * 0.06) * u, (0.05 + k * 0.09) * u, 0.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = BLOOD_DARK;
        ctx.beginPath();
        ctx.ellipse(-0.04 * u, (0.5 + k * 0.1) * u, (0.02 + k * 0.03) * u, (0.03 + k * 0.05) * u, 0.2, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = BLOOD_DARK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-0.05 * u, 0.6 * u);
        ctx.quadraticCurveTo(-0.04 * u, 0.72 * u, -0.07 * u, 0.84 * u);
        ctx.stroke();
      }
      ctx.restore();
    }

    _head(ctx, u) {
      const cy = -0.34 * u;
      const r = 0.26 * u;
      ctx.save();
      // cou
      ctx.fillStyle = SKIN;
      ctx.strokeStyle = INK;
      ctx.lineWidth = EDGE;
      ctx.beginPath();
      ctx.roundRect(-0.085 * u, -0.1 * u, 0.17 * u, 0.24 * u, 4);
      ctx.fill();
      ctx.stroke();
      // visage
      ctx.beginPath();
      ctx.arc(0, cy, r, 0, TAU);
      ctx.fillStyle = SKIN;
      ctx.fill();
      ctx.stroke();
      // oreille
      ctx.beginPath();
      ctx.arc(-r * 0.92, cy + r * 0.05, r * 0.15, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // cheveux
      ctx.beginPath();
      ctx.moveTo(-r * 0.98, cy - r * 0.05);
      ctx.quadraticCurveTo(-r * 1.05, cy - r * 0.95, -r * 0.2, cy - r * 1.02);
      ctx.quadraticCurveTo(r * 0.5, cy - r * 1.05, r * 0.95, cy - r * 0.35);
      ctx.lineTo(r * 1.05, cy - r * 0.02);
      ctx.lineTo(r * 0.7, cy - r * 0.42);
      ctx.lineTo(r * 0.55, cy - r * 0.1);
      ctx.lineTo(r * 0.3, cy - r * 0.5);
      ctx.lineTo(r * 0.1, cy - r * 0.12);
      ctx.lineTo(-r * 0.12, cy - r * 0.52);
      ctx.lineTo(-r * 0.35, cy - r * 0.14);
      ctx.lineTo(-r * 0.55, cy - r * 0.5);
      ctx.closePath();
      ctx.fillStyle = INK;
      ctx.fill();
      // yeux fermés + bouche
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, cy + r * 0.02);
      ctx.quadraticCurveTo(-r * 0.34, cy + r * 0.14, -r * 0.14, cy + r * 0.02);
      ctx.moveTo(r * 0.14, cy + r * 0.02);
      ctx.quadraticCurveTo(r * 0.34, cy + r * 0.14, r * 0.52, cy + r * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, cy + r * 0.42);
      ctx.quadraticCurveTo(0, cy + r * 0.48, r * 0.15, cy + r * 0.42);
      ctx.stroke();
      // filet de sang
      ctx.strokeStyle = BLOOD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.12, cy + r * 0.44);
      ctx.quadraticCurveTo(r * 0.18, cy + r * 0.6, r * 0.12, cy + r * 0.7);
      ctx.stroke();
      ctx.restore();
    }

    _arm(ctx, u, side, cutUpper, cutFore, cutHand) {
      const sh = [side * 0.36 * u, 0.2 * u];
      const el = [side * 0.5 * u, 0.78 * u];
      const wr = [side * 0.54 * u, 1.24 * u];
      ctx.save();
      ctx.lineCap = "round";
      if (!cutUpper) this._limb(ctx, sh, el, 0.16 * u, SHIRT);
      if (!cutUpper && !cutFore) this._limb(ctx, el, wr, 0.13 * u, SKIN);
      if (!cutUpper && !cutFore && !cutHand) this._hand(ctx, wr, u, side);
      if (cutUpper) this._stump(ctx, sh, u);
      else if (cutFore) this._stump(ctx, el, u);
      else if (cutHand) this._stump(ctx, wr, u);
      ctx.restore();
    }

    _leg(ctx, u, side, cutThigh, cutCalf, cutFoot) {
      const hip = [side * 0.16 * u, 0.98 * u];
      const knee = [side * 0.23 * u, 1.58 * u];
      const ank = [side * 0.19 * u, 2.16 * u];
      ctx.save();
      ctx.lineCap = "round";
      if (!cutThigh) this._limb(ctx, hip, knee, 0.2 * u, PANTS);
      if (!cutThigh && !cutCalf) this._limb(ctx, knee, ank, 0.18 * u, PANTS);
      if (!cutThigh && !cutCalf && !cutFoot) this._foot(ctx, ank, u, side);
      if (cutThigh) this._stump(ctx, hip, u);
      else if (cutCalf) this._stump(ctx, knee, u);
      else if (cutFoot) this._stump(ctx, ank, u);
      ctx.restore();
    }

    _limb(ctx, p1, p2, w, color) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = w + EDGE * 2;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = Math.max(1, w * 0.16);
      ctx.beginPath();
      ctx.moveTo(p1[0] - w * 0.2, p1[1] + 2);
      ctx.lineTo(p2[0] - w * 0.2, p2[1]);
      ctx.stroke();
    }

    _hand(ctx, wr, u, side) {
      ctx.save();
      ctx.fillStyle = SKIN;
      ctx.strokeStyle = INK;
      ctx.lineWidth = EDGE;
      ctx.beginPath();
      ctx.ellipse(wr[0], wr[1] + 0.06 * u, 0.08 * u, 0.11 * u, side * 0.2, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(wr[0] + side * (i - 1) * 0.04 * u, wr[1] + 0.13 * u);
        ctx.lineTo(wr[0] + side * (i - 1) * 0.045 * u, wr[1] + 0.23 * u);
        ctx.stroke();
      }
      ctx.restore();
    }

    _foot(ctx, ank, u, side) {
      ctx.save();
      ctx.fillStyle = PANTS;
      ctx.strokeStyle = INK;
      ctx.lineWidth = EDGE;
      ctx.beginPath();
      ctx.moveTo(ank[0] - 0.065 * u, ank[1]);
      ctx.lineTo(ank[0] + 0.065 * u, ank[1]);
      ctx.quadraticCurveTo(ank[0] + side * 0.16 * u, ank[1] + 0.2 * u, ank[0] + side * 0.09 * u, ank[1] + 0.28 * u);
      ctx.lineTo(ank[0] - 0.07 * u, ank[1] + 0.26 * u);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    _stump(ctx, p, u) {
      ctx.save();
      ctx.fillStyle = BLOOD;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], 0.085 * u, 0.045 * u, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = BLOOD_DARK;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], 0.038 * u, 0.02 * u, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    _pool(ctx, groundY, u) {
      if (this.pool <= 0.5) return;
      const w = this.pool;
      ctx.save();
      ctx.fillStyle = "rgba(210,31,43,0.85)";
      ctx.strokeStyle = "rgba(141,17,25,0.9)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(this.scene.w * 0.5, groundY + 2, w, Math.max(2, w * 0.14), 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(141,17,25,0.9)";
      ctx.beginPath();
      ctx.ellipse(this.scene.w * 0.5, groundY + 2, w * 0.55, Math.max(1.2, w * 0.07), 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    _debris(ctx) {
      ctx.save();
      for (const p of this.debris) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.lineCap = "round";
        ctx.strokeStyle = INK;
        ctx.lineWidth = p.w + 4;
        ctx.beginPath();
        ctx.moveTo(0, -p.len * 0.5);
        ctx.lineTo(0, p.len * 0.5);
        ctx.stroke();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(0, -p.len * 0.5);
        ctx.lineTo(0, p.len * 0.5);
        ctx.stroke();
        ctx.strokeStyle = BLOOD;
        ctx.lineWidth = p.w * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -p.len * 0.5);
        ctx.lineTo(0, -p.len * 0.5 + p.w * 0.6);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    _blood(ctx) {
      ctx.save();
      for (const p of this.blood) {
        ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
        ctx.fillStyle = BLOOD;
        const ang = Math.atan2(p.vy, p.vx);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * (1 + Math.min(1.4, Math.hypot(p.vx, p.vy) / 240)), ang, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    _splats(ctx) {
      ctx.save();
      for (const p of this.splats) {
        const k = 1 - p.life / p.max;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = BLOOD;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(p.w * (0.6 + k), -p.h);
        ctx.lineTo(p.w * (1.05 + k), 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    _otoma(ctx) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const o of this.otoma) {
        const k = o.life / o.max;
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.rot);
        ctx.globalAlpha = Math.min(1, k * 1.7);
        if (o.big) {
          // éclat blanc dentelé façon manga
          ctx.beginPath();
          const n = 16;
          for (let i = 0; i < n * 2; i++) {
            const ang = (i / (n * 2)) * TAU;
            const rr = (i % 2 ? 1.0 : 0.72) * o.size * 1.08;
            const px = Math.cos(ang) * rr;
            const py = Math.sin(ang) * rr * 0.7;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
        ctx.font = `900 ${Math.round(o.size)}px "Bahnschrift", "Segoe UI", sans-serif`;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = o.big ? 9 : 5;
        ctx.strokeText(o.text, 0, 0);
        ctx.fillStyle = INK;
        ctx.fillText(o.text, 0, 0);
        ctx.restore();
      }
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = INK;
      ctx.lineCap = "round";
      for (const p of this.speed) {
        const k = p.life / p.max;
        ctx.globalAlpha = k * 0.7;
        ctx.lineWidth = 2 * k + 0.6;
        const r1 = 6;
        const r2 = 6 + p.len * (0.5 + (1 - k));
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(p.a) * r1, p.y + Math.sin(p.a) * r1);
        ctx.lineTo(p.x + Math.cos(p.a) * r2, p.y + Math.sin(p.a) * r2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _frame(ctx) {
      const { w, h } = this.scene;
      ctx.save();
      ctx.strokeStyle = "#0f0d10";
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, w - 10, h - 10);
      ctx.strokeStyle = "rgba(236,230,218,0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(11, 11, w - 22, h - 22);
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.78);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(40,30,22,0.3)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  window.GoreBody = GoreBody;
  window.GORE_LABEL = LABEL;
})();
