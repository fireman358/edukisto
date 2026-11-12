/* ==========================================================================
   scene.js — rendu 2.5D isométrique du pendu (canvas 2D, sans dépendance)
   Lumière unique venue de la gauche, socle extrudé, potence en acier,
   astronaute en apesanteur, particules et projecteur.
   ========================================================================== */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const COS30 = Math.cos(Math.PI / 6);
  const SIN30 = 0.5;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  };

  /* ------------------------------------------------------------------------
     Les 11 tracés, dans l'ordre où ils apparaissent.
     Les 5 premiers forment la potence ; les 6 suivants, le personnage.
     ------------------------------------------------------------------------ */
  const STROKES = [
    { id: "base", label: "le socle" },
    { id: "montant", label: "le poteau" },
    { id: "poutre", label: "la poutre" },
    { id: "corde", label: "la corde" },
    { id: "echelle", label: "l’échelle" },
    { id: "tete", label: "la tête" },
    { id: "corps", label: "le torse" },
    { id: "brasG", label: "le bras gauche" },
    { id: "brasD", label: "le bras droit" },
    { id: "jambeG", label: "la jambe gauche" },
    { id: "jambeD", label: "la jambe droite" },
  ];

  const MATERIAL = {
    deck: { top: "#16294a", front: "#0d1b33", side: "#0a1426", edge: "#2c4a7a" },
    steel: { top: "#3c5b8c", front: "#223a61", side: "#162641", edge: "#7fb2ea" },
    bronze: { top: "#d0a352", front: "#96712f", side: "#61481b", edge: "#ffe08a" },
    rope: { top: "#d9b878", front: "#a98a53", side: "#6f5730", edge: "#f6dfa8" },
    suit: { top: "#f0f6ff", front: "#c6d4e8", side: "#8fa3c2", edge: "#ffffff" },
  };

  class Scene {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.w = 0;
      this.h = 0;
      this.dpr = 1;
      this.s = 60;
      this.ox = 0;
      this.oy = 0;
      this.t = 0;
      this.last = 0;
      this.parts = STROKES.map((s) => ({ ...s, on: false, p: 0, flash: 0 }));
      this.predrawn = 0;
      this.max = 8;
      this.shake = 0;
      this.flashColor = null;
      this.flashA = 0;
      this.win = false;
      this.lose = false;
      this.winT = 0;
      this.loseT = 0;
      this.sag = 0;
      this.hover = -1;
      this.pickable = false;
      this.removing = -1;
      this.accent = "#38bdf8";
      this.parallax = { x: 0, y: 0, tx: 0, ty: 0 };
      this.particles = [];
      this.motes = [];
      this.stars = [];
      this.confetti = [];
      this.popups = [];
      this.gore = false;
      this.body = new window.GoreBody(this);

      this._initMotes();
      this._initStars();

      this.resize();
      if (typeof ResizeObserver !== "undefined") {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(canvas.parentElement || canvas);
      } else {
        window.addEventListener("resize", () => this.resize());
      }
      this.canvas.addEventListener("pointermove", (e) => this._onMove(e));
      this.canvas.addEventListener("pointerleave", () => { this.hover = -1; this.canvas.style.cursor = "default"; });
      this.canvas.addEventListener("click", (e) => this._onClick(e));

      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    /* ------------------------------------------------------------- utilities */
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.s = Math.min(this.w / 8.2, this.h / 8.4);
      this.ox = this.w * 0.5;
      this.oy = this.h * 0.62;
      this._initStars();
    }

    project(x, y, z) {
      return {
        x: this.ox + (x - y) * COS30 * this.s,
        y: this.oy + (x + y) * SIN30 * this.s - z * this.s * 1.02,
      };
    }

    _initStars() {
      this.stars = [];
      const n = Math.round((this.w * this.h) / 14000);
      let seed = 1234567;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
      for (let i = 0; i < n; i++) {
        this.stars.push({
          x: rnd() * this.w,
          y: rnd() * this.h * 0.8,
          r: 0.3 + rnd() * 1.3,
          a: 0.15 + rnd() * 0.6,
          tw: rnd() * TAU,
          sp: 0.4 + rnd() * 1.6,
        });
      }
    }

    _initMotes() {
      this.motes = [];
      for (let i = 0; i < 42; i++) {
        this.motes.push({
          x: Math.random(),
          y: Math.random(),
          z: 0.2 + Math.random() * 0.8,
          r: 0.5 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.006,
          vy: -0.004 - Math.random() * 0.012,
          a: 0.1 + Math.random() * 0.5,
          ph: Math.random() * TAU,
        });
      }
    }

    /* --------------------------------------------------------------- contrôle */
    /** Active la variante manga gore (scene papier + corps démembré). */
    setGore(on) {
      this.gore = !!on;
      if (this.gore) {
        this.body.reset();
        this.particles.length = 0;
        this.confetti.length = 0;
        this.popups.length = 0;
      }
    }

    /** Nombre de membres sectionnés (0 = corps intact). */
    setGoreCuts(n) {
      if (!this.gore) return;
      this.body.setCuts(n | 0);
    }

    /** Dernier coup : le corps explose. */
    goreExplode() {
      if (!this.gore) return;
      this.body.explode();
      this.shakeIt();
      this.flash("#d21f2b");
    }

    setup(maxStrokes) {
      this.max = clamp(maxStrokes | 0, 6, 11);
      this.predrawn = 11 - this.max;
      this.parts.forEach((p, i) => {
        p.on = i < this.predrawn;
        p.p = p.on ? 1 : 0;
        p.flash = 0;
      });
      this.win = false;
      this.lose = false;
      this.winT = 0;
      this.loseT = 0;
      this.sag = 0;
      this.pickable = false;
      this.hover = -1;
      this.removing = -1;
      this.particles.length = 0;
      this.confetti.length = 0;
      this.popups.length = 0;
      this.shake = 0;
      this.flashA = 0;
      if (this.gore) this.body.reset();
    }

    /** Nombre de tracés visibles (hors potence pré-dessinée). */
    get visibleCount() {
      return this.parts.filter((p) => p.on).length;
    }

    /** Nombre de crochets encore accrochés (mode inversé). */
    get hookCount() {
      return this.parts.filter((p, i) => p.on && i >= this.predrawn).length;
    }

    /** Affiche les `count` premiers tracés sans animation (début de manche). */
    setInitial(count) {
      this.parts.forEach((p, i) => {
        p.on = i < count;
        p.p = p.on ? 1 : 0;
        p.flash = 0;
      });
    }

    /** Aligne le dessin sur `count` tracés, en animant les ajouts/retraits. */
    showTo(count) {
      this.parts.forEach((p, i) => {
        if (i < count && !p.on) this._spawnStroke(i);
        else if (i >= count && p.on) this.removeStroke(i);
      });
    }

    indexOf(id) { return this.parts.findIndex((p) => p.id === id); }

    /** Ajoute le prochain tracé libre ; renvoie son index ou -1. */
    addStroke() {
      const i = this.parts.findIndex((p) => !p.on);
      if (i < 0) return -1;
      this._spawnStroke(i);
      return i;
    }

    /** Ajoute un tracé précis (mode inversé / pénalité). */
    addStrokeAt(i) {
      if (i < 0 || this.parts[i].on) return false;
      this._spawnStroke(i);
      return true;
    }

    _spawnStroke(i) {
      const p = this.parts[i];
      p.on = true;
      p.p = 0;
      p.flash = 1;
      const anchor = this._anchorOf(p.id);
      if (anchor) this._burst(anchor, "#ffd23f", 12);
    }

    removeStroke(i) {
      const p = this.parts[i];
      if (!p || !p.on) return false;
      p.on = false;
      p.p = 0;
      const anchor = this._anchorOf(p.id);
      if (anchor) this._burst(anchor, "#38bdf8", 10);
      return true;
    }

    /** Retire le dernier tracé ajouté (hors potence). */
    removeLast() {
      for (let i = this.parts.length - 1; i >= this.predrawn; i--) {
        if (this.parts[i].on) {
          this.removeStroke(i);
          return i;
        }
      }
      return -1;
    }

    _anchorOf(id) {
      const P = {
        base: [0, 0.5, 0.2],
        montant: [1.25, 0.45, 3.4],
        poutre: [-0.4, 0.45, 4.2],
        corde: [-1.0, 0.45, 3.4],
        echelle: [0.85, 0.45, 1.6],
        tete: [-1.0, 0.45, 3.02],
        corps: [-1.0, 0.45, 2.4],
        brasG: [-1.34, 0.45, 2.12],
        brasD: [-0.66, 0.45, 2.12],
        jambeG: [-1.19, 0.45, 1.2],
        jambeD: [-0.81, 0.45, 1.2],
      }[id];
      if (!P) return null;
      const q = this.project(P[0], P[1], P[2]);
      return { x: q.x, y: q.y };
    }

    shakeIt() { this.shake = 1; }
    flash(color) { this.flashColor = color; this.flashA = 1; }

    celebrate() {
      if (this.gore) { this.body.release(); this.win = true; this.winT = 0; return; }
      this.win = true;
      this.winT = 0;
      for (let i = 0; i < 90; i++) {
        this.confetti.push({
          x: this.w * (0.2 + Math.random() * 0.6),
          y: this.h * (0.25 + Math.random() * 0.2),
          vx: (Math.random() - 0.5) * 260,
          vy: -140 - Math.random() * 220,
          g: 220 + Math.random() * 160,
          r: Math.random() * TAU,
          vr: (Math.random() - 0.5) * 9,
          c: ["#ffd23f", "#38bdf8", "#6fe08a", "#ffffff", "#a78bfa"][i % 5],
          s: 3 + Math.random() * 5,
          life: 1,
        });
      }
    }

    sad() {
      this.lose = true;
      this.loseT = 0;
      this.shakeIt();
      this.flash("#ff6b6b");
      if (this.gore) this.body.lose();
    }

    setAccent(c) { this.accent = c; }

    /* --------------------------------------------------------------- picking */
    _hitPart(cx, cy) {
      let best = -1;
      let bestD = 46;
      this.parts.forEach((p, i) => {
        if (!p.on || i < this.predrawn) return;
        const a = this._anchorOf(p.id);
        if (!a) return;
        const d = Math.hypot(a.x - cx, a.y - cy);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    _onMove(e) {
      const r = this.canvas.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      this.parallax.tx = (px - 0.5) * 2;
      this.parallax.ty = (py - 0.5) * 2;
      if (this.pickable) {
        const hit = this._hitPart(e.clientX - r.left, e.clientY - r.top);
        this.hover = hit;
        this.canvas.style.cursor = hit >= 0 ? "pointer" : "default";
      } else {
        this.hover = -1;
        this.canvas.style.cursor = "default";
      }
    }

    _onClick(e) {
      if (!this.pickable) return;
      const r = this.canvas.getBoundingClientRect();
      const hit = this._hitPart(e.clientX - r.left, e.clientY - r.top);
      if (hit >= 0 && this.onPick) this.onPick(hit);
    }

    /* --------------------------------------------------------------- loop */
    loop(ts) {
      // La boucle ne doit jamais s'arrêter : une exception dans la mise à jour
      // ou le rendu est journalisée une fois, et la frame suivante repart.
      const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000 || 0.016));
      this.last = ts;
      this._guard(() => this._update(dt), "maj");
      this._guard(() => this.render(), "rendu");
      requestAnimationFrame(this.loop);
    }

    _guard(fn, label) {
      try {
        fn();
      } catch (err) {
        if (!this._errs) this._errs = new Set();
        const key = label + "|" + (err && err.message);
        if (!this._errs.has(key)) {
          this._errs.add(key);
          console.error("Scène (" + label + ") :", err);
        }
      }
    }

    _update(dt) {
      this.t += dt;
      this.parallax.x += (this.parallax.tx - this.parallax.x) * Math.min(1, dt * 4);
      this.parallax.y += (this.parallax.ty - this.parallax.y) * Math.min(1, dt * 4);

      this.parts.forEach((p) => {
        if (p.on && p.p < 1) p.p = Math.min(1, p.p + dt * 3.4);
        if (!p.on && p.p > 0) p.p = Math.max(0, p.p - dt * 4);
        if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 1.8);
      });
      this.shake = Math.max(0, this.shake - dt * 3.2);
      this.flashA = Math.max(0, this.flashA - dt * 3.4);
      if (this.win) this.winT += dt;
      if (this.lose) this.loseT += dt;
      this.sag = this.lose ? lerp(this.sag, 0.16, Math.min(1, dt * 4)) : lerp(this.sag, 0, Math.min(1, dt * 4));

      this.motes.forEach((m) => {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.ph += dt * 1.6;
        if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
        if (m.x < -0.05) m.x = 1.05;
        if (m.x > 1.05) m.x = -0.05;
      });

      this.particles = this.particles.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.g * dt;
        return p.life > 0;
      });
      this.confetti = this.confetti.filter((c) => {
        c.life -= dt * 0.45;
        c.vy += c.g * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.r += c.vr * dt;
        return c.life > 0 && c.y < this.h + 40;
      });
      this.popups = this.popups.filter((p) => {
        p.life -= dt;
        p.y -= dt * 34;
        return p.life > 0;
      });

      if (this.gore) this.body.update(dt);
    }

    /* --------------------------------------------------------------- render */
    render() {
      const ctx = this.ctx;
      const w = this.w;
      const h = this.h;
      ctx.clearRect(0, 0, w, h);

      if (this.gore) { this._renderGore(ctx); return; }

      this._drawBackdrop(ctx, w, h);
      ctx.save();
      if (this.shake > 0.001) {
        const k = this.shake * 9;
        ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      }

      this._drawSpotlight(ctx);
      this._drawPlatform(ctx);
      this._drawShadows(ctx);

      // potence pré-dessinée (décor) puis tracés actifs
      for (let i = 0; i < this.predrawn; i++) this._drawPart(ctx, this.parts[i], 1);
      for (let i = this.predrawn; i < this.parts.length; i++) {
        const p = this.parts[i];
        // un tracé actif est toujours visible, même si l'animation est en retard
        if (p.on) this._drawPart(ctx, p, Math.max(0.35, p.p));
        else if (p.p > 0.001) this._drawPart(ctx, p, p.p);
      }

      this._drawParticles(ctx);
      ctx.restore();

      this._drawForeground(ctx, w, h);

      if (this.flashA > 0.001 && this.flashColor) {
        ctx.save();
        ctx.globalAlpha = this.flashA * 0.16;
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      if (this.win) this._drawConfetti(ctx);
      this._drawPopups(ctx);
    }

    /* --------------------------------------------------------- variante gore */
    _renderGore(ctx) {
      const w = this.w;
      const h = this.h;
      ctx.save();
      if (this.shake > 0.001) {
        const k = this.shake * 10;
        ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      }
      this.body.draw(ctx);
      ctx.restore();

      if (this.flashA > 0.001 && this.flashColor) {
        ctx.save();
        ctx.globalAlpha = this.flashA * 0.22;
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }

    _drawBackdrop(ctx, w, h) {      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0a1426");
      g.addColorStop(0.55, "#070e1c");
      g.addColorStop(1, "#04070f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const px = this.parallax.x * 10;
      const py = this.parallax.y * 6;

      // nébuleuses
      const neb1 = ctx.createRadialGradient(w * 0.2 + px, h * 0.18 + py, 0, w * 0.2, h * 0.18, w * 0.55);
      neb1.addColorStop(0, "rgba(56,189,248,0.13)");
      neb1.addColorStop(0.5, "rgba(56,189,248,0.04)");
      neb1.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, w, h);

      const neb2 = ctx.createRadialGradient(w * 0.86 + px * 1.4, h * 0.1 + py, 0, w * 0.86, h * 0.1, w * 0.42);
      neb2.addColorStop(0, "rgba(167,139,250,0.12)");
      neb2.addColorStop(1, "rgba(167,139,250,0)");
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, w, h);

      // étoiles
      ctx.save();
      for (const s of this.stars) {
        const a = s.a * (0.65 + 0.35 * Math.sin(this.t * s.sp + s.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#cfe6ff";
        ctx.beginPath();
        ctx.arc(s.x + px * 0.4, s.y + py * 0.4, s.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // planète
      const pR = Math.min(w, h) * 0.13;
      const pcx = w * 0.88 + px * 0.6;
      const pcy = h * 0.14 + py * 0.6;
      const pg = ctx.createRadialGradient(pcx - pR * 0.4, pcy - pR * 0.45, pR * 0.1, pcx, pcy, pR * 1.05);
      pg.addColorStop(0, "rgba(120,190,255,0.30)");
      pg.addColorStop(0.55, "rgba(46,92,160,0.16)");
      pg.addColorStop(1, "rgba(10,20,40,0)");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(pcx, pcy, pR, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(120,190,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(pcx, pcy, pR * 1.5, pR * 0.32, -0.35, 0, TAU);
      ctx.stroke();
      ctx.restore();

      // poussière
      ctx.save();
      for (const m of this.motes) {
        const a = m.a * (0.6 + 0.4 * Math.sin(m.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#9fd8ff";
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawSpotlight(ctx) {
      const top = this.project(0, 0.4, 6.4);
      const a = this.project(-2.6, 0.4, 0);
      const b = this.project(2.2, 0.4, 0);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const g = ctx.createLinearGradient(top.x, top.y, 0, a.y);
      g.addColorStop(0, "rgba(190,230,255,0.16)");
      g.addColorStop(0.6, "rgba(120,190,255,0.07)");
      g.addColorStop(1, "rgba(120,190,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(top.x - 10, top.y);
      ctx.lineTo(top.x + 10, top.y);
      ctx.lineTo(b.x + 60, b.y + 20);
      ctx.lineTo(a.x - 60, a.y + 20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    /* ----------------------------------------------------------- plateforme */
    _drawPlatform(ctx) {
      const A = 2.85;
      const B = 3.55;
      const TH = 0.75;
      const corners = [
        this.project(0, -A, 0),
        this.project(B, 0, 0),
        this.project(0, A, 0),
        this.project(-B, 0, 0),
      ];
      const lower = [
        this.project(0, -A, -TH),
        this.project(B, 0, -TH),
        this.project(0, A, -TH),
        this.project(-B, 0, -TH),
      ];

      // halo sous le socle
      const cen = this.project(0, 0, -0.3);
      const halo = ctx.createRadialGradient(cen.x, cen.y, 0, cen.x, cen.y, this.s * 4.4);
      halo.addColorStop(0, "rgba(56,189,248,0.20)");
      halo.addColorStop(0.45, "rgba(56,189,248,0.06)");
      halo.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.ellipse(cen.x, cen.y, this.s * 4.6, this.s * 2.6, 0, 0, TAU);
      ctx.fill();

      // faces latérales
      const faces = [
        { a: 0, b: 1, light: 0.55 },
        { a: 1, b: 2, light: 1.0 },
        { a: 2, b: 3, light: 0.32 },
        { a: 3, b: 0, light: 0.18 },
      ];
      for (const f of faces) {
        const p0 = corners[f.a];
        const p1 = corners[f.b];
        const q0 = lower[f.a];
        const q1 = lower[f.b];
        const g = ctx.createLinearGradient(p0.x, p0.y, q0.x, q0.y);
        const base = f.light > 0.5 ? [13, 27, 51] : [8, 17, 33];
        g.addColorStop(0, `rgb(${base.map((v) => Math.round(v * (1 + f.light * 0.5))).join(",")})`);
        g.addColorStop(1, `rgb(${base.map((v) => Math.round(v * 0.55)).join(",")})`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(q1.x, q1.y);
        ctx.lineTo(q0.x, q0.y);
        ctx.closePath();
        ctx.fill();
      }

      // face supérieure
      const tg = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
      tg.addColorStop(0, "#1a3055");
      tg.addColorStop(0.5, "#122444");
      tg.addColorStop(1, "#0b1730");
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.fill();

      // grille
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = "rgba(86,160,230,0.18)";
      ctx.lineWidth = 1;
      for (let i = -4; i <= 4; i++) {
        const a1 = this.project(i * 0.8, -A - 1, 0);
        const a2 = this.project(i * 0.8, A + 1, 0);
        ctx.beginPath();
        ctx.moveTo(a1.x, a1.y);
        ctx.lineTo(a2.x, a2.y);
        ctx.stroke();
        const b1 = this.project(-B - 1, i * 0.8, 0);
        const b2 = this.project(B + 1, i * 0.8, 0);
        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.stroke();
      }
      ctx.restore();

      // liseré lumineux
      ctx.save();
      ctx.strokeStyle = "rgba(56,189,248,0.55)";
      ctx.lineWidth = 1.6;
      ctx.shadowColor = "rgba(56,189,248,0.8)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    _drawShadows(ctx) {
      const groundY = 0;
      const spots = [
        { x: -1.0, y: 0.45, r: 0.9, a: 0.5 },
        { x: 1.25, y: 0.45, r: 0.55, a: 0.42 },
        { x: 0, y: 0.45, r: 0.7, a: 0.3 },
      ];
      for (const sp of spots) {
        const p = this.project(sp.x, sp.y, groundY);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sp.r * this.s);
        g.addColorStop(0, `rgba(0,0,0,${sp.a})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, sp.r * this.s, sp.r * this.s * 0.42, 0, 0, TAU);
        ctx.fill();
      }
    }

    /* -------------------------------------------------------------- tracés */
    _drawPart(ctx, part, p) {
      const e = easeOut(p);
      const bob = Math.sin(this.t * 1.4 + part.label.length) * 0.006;
      const sag = part.id === "tete" || part.id === "corps" || part.id.startsWith("bras") ||
        part.id.startsWith("jambe") ? this.sag : 0;
      const alpha = clamp(e * 1.2, 0, 1);
      const flash = part.flash;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (p < 1) {
        const a = this._anchorOf(part.id);
        const sc = 0.82 + 0.18 * easeBack(clamp(p, 0, 1));
        if (a) {
          ctx.translate(a.x, a.y);
          ctx.scale(sc, sc);
          ctx.translate(-a.x, -a.y);
        }
      }

      switch (part.id) {
        case "base":
          this._box(ctx, 0, 0.45, 0, 1.75, 0.42, 0.26, MATERIAL.bronze);
          this._box(ctx, 0, 0.45, 0.26, 1.9, 0.5, 0.06, MATERIAL.steel);
          break;
        case "montant":
          this._box(ctx, 1.25, 0.45, 0, 0.34, 0.34, 4.25, MATERIAL.steel);
          this._box(ctx, 1.25, 0.45, 4.25, 0.46, 0.46, 0.1, MATERIAL.bronze);
          break;
        case "poutre": {
          const a = this.project(1.25, 0.45, 4.2);
          const b = this.project(-1.15, 0.45, 4.2);
          this._beam(ctx, a, b, 0.26, MATERIAL.bronze);
          // petit retour en bout
          const c = this.project(-1.15, 0.45, 4.02);
          this._beam(ctx, b, c, 0.16, MATERIAL.bronze);
          break;
        }
        case "corde": {
          const top = this.project(-1.0, 0.45, 4.12);
          const bot = this.project(-1.0, 0.45, 3.3);
          this._rope(ctx, top, bot, 3, 5);
          break;
        }
        case "echelle":
          this._ladder(ctx);
          break;
        case "tete":
          this._head(ctx, -1.0, 0.45, 3.02 + bob - sag);
          break;
        case "corps":
          this._torso(ctx, -1.0, 0.45, 2.76 + bob - sag);
          break;
        case "brasG":
          this._limb(ctx, [-1.17, 0.45, 2.66 - sag], [-1.34, 0.45, 2.1 - sag], 0.095, "#e8f1fd", "#a7bbd8");
          this._glove(ctx, -1.34, 0.45, 2.08 - sag);
          break;
        case "brasD":
          this._limb(ctx, [-0.83, 0.45, 2.66 - sag], [-0.66, 0.45, 2.1 - sag], 0.095, "#e8f1fd", "#a7bbd8");
          this._glove(ctx, -0.66, 0.45, 2.08 - sag);
          break;
        case "jambeG":
          this._limb(ctx, [-1.11, 0.45, 2.12 - sag], [-1.19, 0.45, 1.24 - sag], 0.105, "#dbe6f6", "#93a8c6");
          this._boot(ctx, -1.19, 0.45, 1.2 - sag, -1);
          break;
        case "jambeD":
          this._limb(ctx, [-0.89, 0.45, 2.12 - sag], [-0.81, 0.45, 1.24 - sag], 0.105, "#dbe6f6", "#93a8c6");
          this._boot(ctx, -0.81, 0.45, 1.2 - sag, 1);
          break;
        default:
          break;
      }

      // éclat de validation
      if (flash > 0.01) {
        const a = this._anchorOf(part.id);
        if (a) {
          const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 46);
          g.addColorStop(0, `rgba(255,230,140,${flash * 0.5})`);
          g.addColorStop(1, "rgba(255,210,63,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(a.x, a.y, 46, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();

      // surbrillance au survol (mode inversé)
      const idx = this.parts.indexOf(part);
      if (this.pickable && this.hover === idx) {
        const a = this._anchorOf(part.id);
        if (a) {
          ctx.save();
          ctx.strokeStyle = "#ffd23f";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.arc(a.x, a.y, 24 + Math.sin(this.t * 5) * 2, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    /* ---------------------------------------------------------- primitives 3D */
    _box(ctx, x, y, z0, w, d, hgt, mat) {
      const z1 = z0 + hgt;
      const hw = w / 2;
      const hd = d / 2;
      const P = (a, b, c) => this.project(a, b, c);
      const top = [P(x - hw, y - hd, z1), P(x + hw, y - hd, z1), P(x + hw, y + hd, z1), P(x - hw, y + hd, z1)];
      const fy = [P(x - hw, y + hd, z1), P(x + hw, y + hd, z1), P(x + hw, y + hd, z0), P(x - hw, y + hd, z0)];
      const fx = [P(x + hw, y - hd, z1), P(x + hw, y + hd, z1), P(x + hw, y + hd, z0), P(x + hw, y - hd, z0)];

      this._poly(ctx, fy, mat.front);
      this._poly(ctx, fx, mat.side);
      this._poly(ctx, top, mat.top);

      // arêtes
      ctx.save();
      ctx.strokeStyle = mat.edge;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      this._strokePoly(ctx, top);
      ctx.restore();
    }

    _beam(ctx, a, b, thick, mat) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const t = thick * this.s;
      const p1 = { x: a.x + (nx * t) / 2, y: a.y + (ny * t) / 2 };
      const p2 = { x: b.x + (nx * t) / 2, y: b.y + (ny * t) / 2 };
      const p3 = { x: b.x - (nx * t) / 2, y: b.y - (ny * t) / 2 };
      const p4 = { x: a.x - (nx * t) / 2, y: a.y - (ny * t) / 2 };
      const g = ctx.createLinearGradient(p1.x, p1.y, p4.x, p4.y);
      g.addColorStop(0, mat.top);
      g.addColorStop(0.45, mat.front);
      g.addColorStop(1, mat.side);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = mat.edge;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }

    _rope(ctx, a, b, wpx, sagPx) {
      const mx = (a.x + b.x) / 2 + 2;
      const my = (a.y + b.y) / 2 + sagPx;
      ctx.save();
      ctx.strokeStyle = "#e8cf9a";
      ctx.lineWidth = wpx;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255,220,150,0.35)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(120,90,50,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
      // boucle
      ctx.strokeStyle = "#f0d9a4";
      ctx.lineWidth = wpx * 0.8;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 7, 6, 8, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    _ladder(ctx) {
      const a = this.project(0.55, 0.45, 0.02);
      const b = this.project(0.98, 0.45, 3.0);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 11;
      const ny = (dx / len) * 11;
      ctx.save();
      ctx.strokeStyle = "#9a7a44";
      ctx.lineWidth = 4.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x - nx, a.y - ny);
      ctx.lineTo(b.x - nx, b.y - ny);
      ctx.moveTo(a.x + nx, a.y + ny);
      ctx.lineTo(b.x + nx, b.y + ny);
      ctx.stroke();
      ctx.strokeStyle = "#c9a568";
      ctx.lineWidth = 3;
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        const mx = lerp(a.x, b.x, t);
        const my = lerp(a.y, b.y, t);
        ctx.beginPath();
        ctx.moveTo(mx - nx, my - ny);
        ctx.lineTo(mx + nx, my + ny);
        ctx.stroke();
      }
      ctx.restore();
    }

    _head(ctx, x, y, z) {
      const p = this.project(x, y, z);
      const r = 0.27 * this.s;
      const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r * 1.05);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.55, "#e4eefa");
      g.addColorStop(1, "#93a9c8");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fill();

      // casque
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.96, -2.5, -0.7);
      ctx.stroke();
      ctx.restore();

      // visière
      ctx.save();
      const vg = ctx.createLinearGradient(p.x - r * 0.6, p.y - r * 0.5, p.x + r * 0.6, p.y + r * 0.4);
      vg.addColorStop(0, "#0b2b45");
      vg.addColorStop(0.55, "#123f63");
      vg.addColorStop(1, "#071a2c");
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - r * 0.04, r * 0.66, r * 0.5, -0.08, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(56,189,248,0.65)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // reflets
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(180,235,255,0.9)";
      ctx.beginPath();
      ctx.ellipse(p.x - r * 0.26, p.y - r * 0.2, r * 0.16, r * 0.09, -0.5, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(p.x + r * 0.2, p.y + r * 0.12, r * 0.1, r * 0.06, -0.4, 0, TAU);
      ctx.fill();
      ctx.restore();

      // yeux
      ctx.save();
      const eyeY = p.y - r * 0.02;
      ctx.fillStyle = this.lose ? "#ff8080" : "#7ff0ff";
      ctx.shadowColor = this.lose ? "#ff6b6b" : "#38bdf8";
      ctx.shadowBlur = 10;
      if (this.lose) {
        const e = r * 0.11;
        ctx.strokeStyle = "#ff8080";
        ctx.lineWidth = 2;
        [[-0.26, 0], [0.26, 0]].forEach(([ox]) => {
          const cx = p.x + r * ox;
          ctx.beginPath();
          ctx.moveTo(cx - e, eyeY - e);
          ctx.lineTo(cx + e, eyeY + e);
          ctx.moveTo(cx + e, eyeY - e);
          ctx.lineTo(cx - e, eyeY + e);
          ctx.stroke();
        });
      } else {
        [[-0.26], [0.26]].forEach(([ox]) => {
          ctx.beginPath();
          ctx.ellipse(p.x + r * ox, eyeY, r * 0.09, r * 0.13, 0, 0, TAU);
          ctx.fill();
        });
      }
      ctx.restore();

      // joues / sourire
      ctx.save();
      ctx.strokeStyle = this.lose ? "rgba(255,140,140,0.8)" : "rgba(120,210,255,0.65)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (this.lose) {
        ctx.arc(p.x, p.y + r * 0.34, r * 0.16, Math.PI * 1.15, Math.PI * 1.85);
      } else {
        ctx.arc(p.x, p.y + r * 0.2, r * 0.17, 0.25, Math.PI - 0.25);
      }
      ctx.stroke();
      ctx.restore();

      // anneau de harnais
      ctx.save();
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y - r * 0.98, r * 0.2, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    _torso(ctx, x, y, z) {
      const top = this.project(x, y, z);
      const bot = this.project(x, y, z - 0.66);
      const wdt = 0.23 * this.s;
      const hgt = bot.y - top.y;
      ctx.save();
      // sac à dos
      ctx.fillStyle = "#7f94b5";
      ctx.beginPath();
      ctx.roundRect(top.x + wdt * 0.45, top.y + 7, wdt * 0.9, hgt - 16, 5);
      ctx.fill();
      // combinaison
      const g = ctx.createLinearGradient(top.x - wdt, 0, top.x + wdt, 0);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.45, "#dde9f8");
      g.addColorStop(1, "#93a9c8");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(top.x - wdt, top.y, wdt * 2, hgt, wdt * 0.55);
      ctx.fill();
      // panneau de poitrine
      ctx.fillStyle = "rgba(56,189,248,0.85)";
      ctx.beginPath();
      ctx.roundRect(top.x - wdt * 0.42, top.y + hgt * 0.22, wdt * 0.84, hgt * 0.18, 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,210,63,0.9)";
      ctx.beginPath();
      ctx.arc(top.x - wdt * 0.2, top.y + hgt * 0.32, 1.7, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(top.x + wdt * 0.05, top.y + hgt * 0.32, 1.7, 0, TAU);
      ctx.fill();
      // ceinture dorée
      ctx.fillStyle = "rgba(255,210,63,0.9)";
      ctx.beginPath();
      ctx.roundRect(top.x - wdt, bot.y - 8, wdt * 2, 5, 2.5);
      ctx.fill();
      // ombre portée
      ctx.fillStyle = "rgba(30,50,80,0.16)";
      ctx.beginPath();
      ctx.roundRect(top.x + wdt * 0.25, top.y + 4, wdt * 0.7, hgt - 12, wdt * 0.35);
      ctx.fill();
      ctx.restore();
    }

    _glove(ctx, x, y, z) {
      const p = this.project(x, y, z);
      const r = 0.085 * this.s;
      ctx.save();
      ctx.fillStyle = "#b9c9e2";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,210,63,0.85)";
      ctx.beginPath();
      ctx.arc(p.x, p.y + r * 0.15, r * 0.55, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    _limb(ctx, p1, p2, r, c1, c2) {
      const a = this.project(p1[0], p1[1], p1[2]);
      const b = this.project(p2[0], p2[1], p2[2]);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const w = r * this.s;
      ctx.save();
      ctx.lineCap = "round";
      const g = ctx.createLinearGradient(a.x + nx * w, a.y + ny * w, a.x - nx * w, a.y - ny * w);
      g.addColorStop(0, c1);
      g.addColorStop(0.55, c2);
      g.addColorStop(1, "#5b7093");
      ctx.strokeStyle = g;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // reflet
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = Math.max(1, w * 0.16);
      ctx.beginPath();
      ctx.moveTo(a.x + nx * w * 0.22, a.y + ny * w * 0.22);
      ctx.lineTo(b.x + nx * w * 0.22, b.y + ny * w * 0.22);
      ctx.stroke();
      ctx.restore();
    }

    _boot(ctx, x, y, z, dir) {
      const p = this.project(x, y, z);
      const w = this.s * 0.11;
      const h = this.s * 0.06;
      ctx.save();
      ctx.fillStyle = "#a9bcd8";
      ctx.beginPath();
      ctx.roundRect(p.x - w * (dir < 0 ? 0.2 : 1.1), p.y - h * 0.4, w * 1.3, h, h * 0.6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,210,63,0.9)";
      ctx.beginPath();
      ctx.roundRect(p.x - w * (dir < 0 ? 0.2 : 1.1), p.y + h * 0.45, w * 1.3, h * 0.4, 1.5);
      ctx.fill();
      ctx.restore();
    }

    _poly(ctx, pts, fill) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fill();
    }

    _strokePoly(ctx, pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();
    }

    /* --------------------------------------------------------------- effets */
    _burst(anchor, color, n) {
      const count = 8 + Math.floor(Math.random() * n);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const sp = 30 + Math.random() * 120;
        this.particles.push({
          x: anchor.x,
          y: anchor.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 30,
          g: 140,
          life: 0.5 + Math.random() * 0.6,
          max: 1.1,
          color,
          r: 1 + Math.random() * 2.6,
        });
      }
    }

    _drawParticles(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of this.particles) {
        const a = clamp(p.life, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * a, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawConfetti(ctx) {
      ctx.save();
      for (const c of this.confetti) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.r);
        ctx.globalAlpha = clamp(c.life, 0, 1);
        ctx.fillStyle = c.c;
        ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
        ctx.restore();
      }
      ctx.restore();
      // halo doré
      const g = ctx.createRadialGradient(this.w / 2, this.h * 0.42, 0, this.w / 2, this.h * 0.42, this.w * 0.5);
      g.addColorStop(0, `rgba(255,210,63,${0.17 * Math.min(1, this.winT * 2)})`);
      g.addColorStop(1, "rgba(255,210,63,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    popText(text, color) {
      this.popups.push({ text, color: color || "#ffd23f", x: this.w / 2, y: this.h * 0.38, life: 1.4 });
    }

    _drawPopups(ctx) {
      ctx.save();
      ctx.textAlign = "center";
      for (const p of this.popups) {
        const a = clamp(p.life, 0, 1);
        ctx.globalAlpha = a;
        ctx.font = `800 ${Math.round(Math.min(30, this.w * 0.045))}px "Bahnschrift", "Segoe UI", sans-serif`;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 18;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.restore();
    }

    _drawForeground(ctx, w, h) {
      // vignette
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.78);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(2,4,9,0.72)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);

      // ligne d'horizon douce
      const hz = this.project(0, 4.6, -0.75);
      const g = ctx.createLinearGradient(0, hz.y, 0, hz.y + 30);
      g.addColorStop(0, "rgba(56,189,248,0)");
      g.addColorStop(0.5, "rgba(56,189,248,0.12)");
      g.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, hz.y, w, 30);
    }
  }

  window.HangmanScene = Scene;
  window.HANGMAN_STROKES = STROKES;
})();
