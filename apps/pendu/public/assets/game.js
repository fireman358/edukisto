/* ==========================================================================
   game.js — moteur et interface du jeu du pendu
   Modes : classique, catégorie, phrases, indices, chrono, inversé,
           dedans-dehors, diabolique. Solo ou à deux (meneur / devineur).
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ utils */
  const APP_VERSION = "1.3.0";
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);
  const isLetter = (c) => typeof c === "string" && c.length === 1 && c >= "A" && c <= "Z";

  function stripAccents(s) {
    return String(s)
      .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/Œ/g, "OE").replace(/Æ/g, "AE")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function normalizePhrase(s) {
    return stripAccents(s)
      .toUpperCase()
      .replace(/[’'`´]/g, " ")
      .replace(/[^A-Z]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const store = {
    get(k, d) {
      try {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : d;
      } catch (_) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* quota */ }
    },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} },
  };

  /* --------------------------------------------------------------- réglages */
  const K_SET = "pendu.settings.v1";
  const K_STATS = "pendu.stats.v1";
  const K_DECK = "pendu.deck.v1";

  const DEFAULTS = {
    difficulty: "mixte",
    maxErrors: 8,
    timer: 20,
    noRepeat: false,
    offerEnds: false,
    limitedVowels: false,
    hintPenalty: true,
    guessMode: "once",
    sound: true,
    gore: false,
  };
  let S = Object.assign({}, DEFAULTS, store.get(K_SET, {}));
  const saveSettings = () => store.set(K_SET, S);

  let STATS = Object.assign({ wins: 0, losses: 0, streak: 0, best: 0, played: 0 }, store.get(K_STATS, {}));
  const saveStats = () => store.set(K_STATS, STATS);

  /* ------------------------------------------------------------------ audio */
  const Sound = {
    ctx: null,
    master: null,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    },
    ready() { return S.sound && this.ctx; },
    tone(freq, dur, opts) {
      if (!this.ready()) return;
      const o = opts || {};
      const t0 = this.ctx.currentTime + (o.delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(freq, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
      const peak = (o.gain == null ? 0.16 : o.gain);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },
    noise(dur, gain) {
      if (!this.ready()) return;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      g.gain.value = gain || 0.12;
      const f = this.ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1800;
      src.buffer = buf;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
    },
    click() { this.tone(520, 0.06, { type: "triangle", gain: 0.08 }); },
    ok() {
      this.tone(659, 0.09, { type: "sine", gain: 0.13 });
      this.tone(880, 0.12, { type: "sine", gain: 0.1, delay: 0.06 });
    },
    bad() {
      this.tone(180, 0.22, { type: "sawtooth", gain: 0.12, to: 90 });
      this.noise(0.16, 0.05);
    },
    slice() {
      this.noise(0.2, 0.17);
      this.tone(520, 0.14, { type: "sawtooth", gain: 0.1, to: 120 });
      this.tone(84, 0.3, { type: "sine", gain: 0.16, to: 55 });
    },
    explode() {
      this.noise(0.6, 0.3);
      this.tone(72, 0.75, { type: "sine", gain: 0.32, to: 30 });
      this.tone(160, 0.3, { type: "square", gain: 0.12, to: 55 });
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.26, { gain: 0.13, delay: i * 0.1 }));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, { type: "triangle", gain: 0.12, delay: i * 0.12 }));
    },
    tick() { this.tone(1200, 0.03, { type: "square", gain: 0.04 }); },
    whoosh() { this.noise(0.25, 0.07); },
  };

  /* ----------------------------------------------------------------- données */
  const LEX = window.PENDU_LEXIQUE || { version: "0", words: [] };
  const ANN = window.PENDU_ANNEXES || { themes: {}, modes: [], pays: [], films: [], expressions: [] };
  const DATA_VERSION = LEX.version || "0";

  const byBucket = { facile: [], moyen: [], difficile: [] };
  const byTheme = {};
  const byLength = {};
  for (const w of LEX.words) {
    (byBucket[w.b] || byBucket.moyen).push(w);
    (w.t || []).forEach((t) => {
      (byTheme[t] = byTheme[t] || []).push(w);
    });
    (byLength[w.l] = byLength[w.l] || []).push(w);
  }
  const poolFor = (diff) => {
    if (diff === "mixte") return LEX.words;
    return byBucket[diff] && byBucket[diff].length ? byBucket[diff] : LEX.words;
  };
  const allWords = (diff) => poolFor(diff);

  /* ------------------------------------------------------------------ scène */
  const scene = new HangmanScene($("#scene"));
  scene.onPick = (i) => pickStroke(i);

  /* ------------------------------------------------------------------ état */
  let state = null;
  let selectedMode = "classique";
  let players = 1;
  let lastMode = "classique";
  let lastRoundWon = false;
  let roles = { meneur: 1, devineur: 2 };
  let score2p = { meneur: 0, devineur: 0 };
  let timerId = null;
  let lastTick = 0;
  let busy = false;

  function freshState() {
    return {
      mode: "classique",
      players: 1,
      word: "",
      letters: [],
      def: "",
      theme: "",
      themeLabel: "",
      kind: "mot",
      source: "Wiktionnaire",
      max: 8,
      wrong: 0,
      guessed: new Set(),
      found: new Set(),
      hinted: new Set(),
      over: false,
      won: false,
      startedAt: 0,
      elapsed: 0,
      timeLeft: 0,
      timeTotal: 0,
      removeMode: false,
      dedansNext: "in",
      vowelsUsed: 0,
      hintLevel: 0,
      freeHintUsed: false,
      guessUsed: 0,
      contestUsed: false,
      evil: null,
      timerOn: false,
    };
  }

  /* --------------------------------------------------------- paquet de mots */
  const orderCache = new Map();
  function orderFor(seed, n) {
    const key = seed + ":" + n;
    if (orderCache.has(key)) return orderCache.get(key);
    const arr = Array.from({ length: n }, (_, i) => i);
    let a = seed >>> 0;
    const rnd = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    orderCache.set(key, arr);
    return arr;
  }

  function pickWord(pool, key) {
    if (!pool || !pool.length) return null;
    const decks = store.get(K_DECK, {});
    let d = decks[key];
    if (!d || d.n !== pool.length || d.v !== DATA_VERSION) {
      d = decks[key] = { seed: (Math.random() * 1e9) | 0, i: 0, n: pool.length, v: DATA_VERSION };
    }
    const order = orderFor(d.seed, pool.length);
    if (d.i >= order.length) {
      d.seed = (Math.random() * 1e9) | 0;
      d.i = 0;
    }
    const idx = order[d.i++];
    store.set(K_DECK, decks);
    return pool[idx];
  }

  /* ------------------------------------------------------------- rendu mots */
  function currentPattern() {
    if (state.evil) return state.evil.pattern;
    return state.word.split("").map((c) => {
      if (!isLetter(c)) return c;
      if (state.found.has(c)) return c;
      return null;
    });
  }

  function wordLetters() {
    if (state.evil) {
      return Array.from(new Set(state.evil.pattern.filter((c) => isLetter(c))));
    }
    return Array.from(new Set(state.word.split("").filter(isLetter)));
  }

  function checkWin() {
    const p = currentPattern();
    return p.length > 0 && p.every((c) => c !== null);
  }

  /* ------------------------------------------------------------------ render */
  function renderWord(newLetters) {
    const host = $("#word");
    const pat = currentPattern();
    const isPhrase = pat.includes(" ");
    host.style.setProperty("--n", String(Math.max(1, pat.length)));
    host.classList.toggle("is-phrase", isPhrase);

    const makeTile = (c) => {
      const el = document.createElement("span");
      el.className = "tile";
      if (c === null) {
        el.classList.add("is-empty");
        el.textContent = "";
        el.setAttribute("aria-label", "lettre inconnue");
      } else if (c === " ") {
        el.classList.add("is-space");
      } else if (!isLetter(c)) {
        el.classList.add("is-punct");
        el.textContent = c;
      } else {
        el.classList.add("is-filled");
        if (newLetters && newLetters.has(c)) el.classList.add("is-new");
        if (state.hinted.has(c)) el.classList.add("is-hint");
        el.textContent = c;
      }
      return el;
    };

    const frag = document.createDocumentFragment();
    if (!isPhrase) {
      // un mot ne doit jamais être coupé : une seule ligne, cases ajustées
      pat.forEach((c) => frag.appendChild(makeTile(c)));
    } else {
      // phrase : les coupures se font uniquement entre les mots
      let group = null;
      pat.forEach((c) => {
        if (c === " ") {
          if (group) { frag.appendChild(group); group = null; }
          return;
        }
        if (!group) {
          group = document.createElement("span");
          group.className = "wgroup";
        }
        group.appendChild(makeTile(c));
      });
      if (group) frag.appendChild(group);
    }
    host.replaceChildren(frag);
    host.setAttribute("aria-label", "Mot à deviner : " + pat.map((c) => (c === null ? "tiret" : c)).join(" "));
  }

  function renderKeyboard() {
    $$(".key", $("#keyboard")).forEach((btn) => {
      const L = btn.dataset.letter;
      btn.classList.remove("is-ok", "is-bad", "is-target");
      const known = state.guessed.has(L);
      const inWord = state.evil ? state.evil.pattern.includes(L) : state.letters.includes(L);
      if (known) btn.classList.add(inWord ? "is-ok" : "is-bad");
      const vowelBlocked = S.limitedVowels && VOWELS.has(L) && state.vowelsUsed >= 3 && !known;
      btn.disabled = state.over || state.removeMode || vowelBlocked;
      if (vowelBlocked) btn.title = "Voyelles limitées à 3 par partie";
      else btn.removeAttribute("title");
    });
    $("#keyboard").classList.toggle("is-locked", state.over || state.removeMode);
  }

  function renderChips() {
    const modeDef = (ANN.modes || []).find((m) => m.id === state.mode);
    $("#chip-mode span").textContent = modeDef ? modeDef.name : "Classique";
    const th = $("#chip-theme");
    if (state.themeLabel) {
      th.hidden = false;
      th.querySelector("span").textContent = state.themeLabel;
    } else {
      th.hidden = true;
    }
    const max = state.max;
    $("#errors-label").textContent = `${state.wrong} / ${max} erreurs`;
    $("#chip-errors").classList.toggle("is-warn", state.wrong >= max - 1);

    const strokes = $("#strokes");
    if (strokes.childElementCount !== max) {
      strokes.replaceChildren();
      for (let i = 0; i < max; i++) {
        const s = document.createElement("i");
        s.className = "stroke-pip";
        strokes.appendChild(s);
      }
    }
    $$(".stroke-pip", strokes).forEach((s, i) => s.classList.toggle("used", i < state.wrong));

    const meta = $("#word-meta");
    const nLetters = state.evil
      ? state.evil.pattern.length
      : state.word.split("").filter(isLetter).length;
    if (state.kind === "phrase" || state.kind === "film" || state.kind === "expression") {
      const nWords = state.word.split(" ").filter(Boolean).length;
      meta.textContent = `${nLetters} lettres · ${nWords} mot${nWords > 1 ? "s" : ""}`;
    } else if (state.evil) {
      meta.textContent = `${state.evil.pattern.length} lettres · mot changeant`;
    } else {
      meta.textContent = `${nLetters} lettres${state.themeLabel ? " · " + state.themeLabel : ""}`;
    }

    const gore = !!(S.gore && state.mode !== "inverse");
    const goreChip = $("#chip-gore");
    if (goreChip) goreChip.hidden = !gore;

    const noteMode = (ANN.modes || []).find((m) => m.id === state.mode);
    const noteTitle = $("#note-title");
    if (noteTitle && noteMode) {
      noteTitle.textContent = noteMode.name;
      $("#note-desc").textContent = noteMode.desc;
      $("#console-note use").setAttribute("href", "#" + noteMode.icon);
    }
    const diffLabel = { facile: "facile", moyen: "moyenne", difficile: "difficile", mixte: "mixte" }[S.difficulty] || "mixte";
    const noteMeta = $("#note-meta");
    if (noteMeta) {
      noteMeta.textContent = `Difficulté ${diffLabel} · ${state.max} erreurs` +
        (state.players === 2 ? " · 2 joueurs" : "") +
        (gore ? " · manga gore" : "");
    }
  }

  function renderButtons() {
    const hintBtn = $("#btn-hint");
    const guessBtn = $("#btn-guess");
    const unhook = $("#btn-unhook");
    const inverse = state.mode === "inverse";
    hintBtn.querySelector("span").textContent = inverse ? "Bluffer" : "Indice";
    hintBtn.querySelector("use").setAttribute("href", inverse ? "#i-mode-inverse" : "#i-bulb");
    hintBtn.disabled = state.over || state.removeMode ||
      (inverse ? state.contestUsed
        : (state.hintLevel >= 3 || (!(state.mode === "indices") && !S.hintPenalty)));
    guessBtn.disabled = state.over || state.removeMode || S.guessMode === "off" ||
      (S.guessMode === "once" && state.guessUsed >= 1);
    unhook.hidden = !state.removeMode;
    $("#btn-giveup").disabled = state.over;
    hintBtn.title = inverse
      ? "Crier au bluff : une fois par manche, 50 % de chance d’annuler une erreur."
      : state.mode === "indices" && state.wrong >= 3 && !state.freeHintUsed
        ? "Indice gratuit (après 3 erreurs)"
        : (S.hintPenalty ? "Indice : coûte un trait" : "Indice");
  }

  function setTurn(text, hot) {
    const el = $("#turn-label");
    el.textContent = text;
    el.classList.toggle("is-hot", !!hot);
  }

  function updateUI(newLetters) {
    renderWord(newLetters);
    renderKeyboard();
    renderChips();
    renderButtons();
    if (!state.over) {
      if (state.removeMode) setTurn("Choisis un trait à retirer sur le dessin", true);
      else if (state.mode === "dedans") setTurn(state.dedansNext === "in" ? "Propose une lettre DANS le mot" : "Propose une lettre HORS du mot", true);
      else if (state.players === 2) setTurn(`Au devineur ${roles.devineur} de jouer`);
      else setTurn("À toi de jouer");
    }
  }

  /* ------------------------------------------------------------------ toast */
  let toastTimer = null;
  function toast(msg, kind) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast show" + (kind === "bad" ? " is-bad" : kind === "good" ? " is-good" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = "toast"; }, 2600);
  }

  /* ------------------------------------------------------------- sons/haptique */
  function vibrate(ms) {
    if (navigator.vibrate && S.sound) { try { navigator.vibrate(ms); } catch (_) {} }
  }

  /* ---------------------------------------------------------------- manche */
  function beginRound() {
    state.over = false;
    state.won = false;
    state.startedAt = Date.now();
    state.elapsed = 0;
    state.wrong = 0;
    state.removeMode = false;

    if (state.mode === "inverse") {
      /* pendu inversé : la potence (4 tracés) est le décor, les 7 crochets
         du personnage sont déjà dessinés et se retirent un à un. */
      state.max = clamp(S.maxErrors, 6, 11);
      scene.setGore(false);
      scene.setup(11);
      scene.predrawn = 4;
      scene.setInitial(11);
    } else if (S.gore) {
      /* variante manga : le condamné est déjà pendu, entier. */
      scene.setGore(true);
      scene.setup(11);
      scene.setGoreCuts(0);
    } else {
      scene.setGore(false);
      scene.predrawn = 11 - state.max;
      scene.setup(state.max);
      scene.showTo((11 - state.max) + state.wrong);
    }
    document.documentElement.classList.toggle("is-gore", !!(S.gore && state.mode !== "inverse"));

    $("#keyboard").classList.remove("is-locked");
    renderKeyboard();
    updateUI(new Set());
    setTurn(state.players === 2 ? `Au devineur ${roles.devineur} de jouer` : "À toi de jouer");
    $("#hint").className = "hint";
    $("#hint").innerHTML = '<span class="hint-key">Indice</span> ' +
      (state.mode === "indices"
        ? "Un indice gratuit après 3 erreurs, ou tout de suite contre un trait."
        : state.mode === "inverse"
          ? "Le dessin est complet : chaque lettre trouvée te laisse retirer un trait."
          : state.themeLabel
            ? `Thème : ${state.themeLabel}.`
            : "Aucun indice pour l’instant.");

    stopTimer();
    if (state.mode === "chrono") startTimer();
    scene.pickable = false;
    busy = false;
  }

  function applyEntry(entry, opts) {
    const o = opts || {};
    state.word = entry.w;
    state.def = entry.d || "";
    state.source = o.source || "Wiktionnaire";
    state.kind = o.kind || "mot";
    state.theme = o.theme || "";
    state.themeLabel = o.themeLabel || "";
    state.letters = wordLetters();
    state.found = new Set();
    state.guessed = new Set();
    state.hinted = new Set();
    state.hintLevel = 0;
    state.freeHintUsed = false;
    state.guessUsed = 0;
    state.vowelsUsed = 0;
    state.dedansNext = "in";
    state.max = clamp(S.maxErrors, 6, 11);
    if (S.offerEnds) offerEnds();
  }

  function offerEnds() {
    const w = state.word;
    const idx = [];
    for (let i = 0; i < w.length; i++) if (isLetter(w[i])) idx.push(i);
    if (idx.length < 3) return;
    [idx[0], idx[idx.length - 1]].forEach((i) => {
      const c = w[i];
      state.found.add(c);
      state.guessed.add(c);
      state.hinted.add(c);
    });
  }

  /* ------------------------------------------------------------ choix du mot */
  function pickSoloContent(mode) {
    const diff = S.difficulty;
    if (mode === "theme") {
      const decks = ["animaux", "pays", "metiers", "nourriture", "films"];
      let last = store.get("pendu.theme.last", "");
      let theme = decks[(Math.random() * decks.length) | 0];
      if (theme === last) theme = decks[(decks.indexOf(theme) + 1) % decks.length];
      store.set("pendu.theme.last", theme);
      const meta = (ANN.themes || {})[theme] || { label: theme };
      if (theme === "pays") {
        const e = pickWord(ANN.pays, "annexe:pays");
        if (e) return applyEntry(e, { theme, themeLabel: "Pays", source: "Edukisto", kind: "pays" });
      } else if (theme === "films") {
        const e = pickWord(ANN.films, "annexe:films");
        if (e) return applyEntry(e, { theme, themeLabel: "Films", source: "Edukisto", kind: "film" });
      } else {
        let pool = byTheme[theme] || [];
        if (pool.length < 8) pool = poolFor(diff).filter((w) => (w.t || []).includes(theme));
        const e = pickWord(pool, "theme:" + theme + ":" + diff);
        if (e) return applyEntry(e, { theme, themeLabel: meta.label, source: "Wiktionnaire", kind: "mot" });
      }
      // repli
    }
    if (mode === "phrases") {
      const pool = ANN.expressions.concat(ANN.films).map((e) => ({
        w: normalizePhrase(e.w), d: e.d, a: e.a,
      })).filter((e) => e.w.replace(/ /g, "").length >= 4);
      const e = pickWord(pool, "annexe:phrases");
      if (e) {
        return applyEntry(e, { theme: e.a.toLowerCase(), themeLabel: e.a, source: "Edukisto", kind: "phrase" });
      }
    }
    if (mode === "diabolique") return setupEvil();
    const e = pickWord(poolFor(diff), "pool:" + diff);
    if (e) {
      const label = (e.t && e.t[0] && (ANN.themes || {})[e.t[0]]) ? ANN.themes[e.t[0]].label : "";
      applyEntry(e, { theme: (e.t || [])[0] || "", themeLabel: label, kind: "mot" });
    }
  }

  function setupEvil() {
    const all = allWords(S.difficulty);
    const groups = {};
    all.forEach((w) => { (groups[w.l] = groups[w.l] || []).push(w); });
    let bestLen = 0;
    let bestN = -1;
    [6, 7, 8, 9].forEach((l) => {
      const n = (groups[l] || []).length;
      if (n > bestN && n > 60) { bestN = n; bestLen = l; }
    });
    if (!bestLen) bestLen = 7;
    const pool = groups[bestLen] || all;
    state.evil = { pool: pool.slice(), pattern: new Array(bestLen).fill(null), len: bestLen };
    state.word = "";
    state.def = "";
    state.letters = [];
    state.kind = "mot";
    state.themeLabel = "";
    state.found = new Set();
    state.guessed = new Set();
    state.hinted = new Set();
    state.hintLevel = 0;
    state.guessUsed = 0;
    state.vowelsUsed = 0;
    state.max = clamp(S.maxErrors, 6, 11);
  }

  /* --------------------------------------------------------------- démarrage */
  function startGame(mode, opts) {
    const o = opts || {};
    state = freshState();
    state.mode = mode;
    state.players = players;
    state.max = clamp(S.maxErrors, 6, 11);
    lastMode = mode;
    hideScreens();
    pickSoloContent(mode);
    beginRound();
    Sound.init();
    if (state.players === 2) toast("Le devineur propose une lettre.", "good");
  }

  function startTwoPlayer(cfg) {
    state = freshState();
    state.mode = cfg.mode || "classique";
    state.players = 2;
    state.max = clamp(cfg.max || S.maxErrors, 6, 11);
    state.word = cfg.word;
    state.def = cfg.hint || "";
    state.source = cfg.hint ? "Le meneur" : "";
    state.kind = "2p";
    state.themeLabel = cfg.theme || "";
    state.letters = wordLetters();
    state.max = clamp(cfg.max || S.maxErrors, 6, 11);
    lastMode = state.mode;
    if (S.offerEnds) offerEnds();
    hideScreens();
    beginRound();
    Sound.init();
    toast("À toi, devineur " + roles.devineur + " !", "good");
  }

  /* ------------------------------------------------------------------ erreur */
  function addError(reason) {
    if (state.over) return;
    state.wrong++;
    const gore = !!(S.gore && state.mode !== "inverse");
    const finalHit = state.wrong >= state.max;
    if (gore) {
      Sound.slice();
      scene.setGoreCuts(finalHit ? state.wrong - 1 : state.wrong);
      if (finalHit) {
        scene.goreExplode();
        Sound.explode();
      }
      scene.flash("#d21f2b");
    } else {
      Sound.bad();
    }
    vibrate(30);
    scene.shakeIt();
    if (!gore) scene.flash("#ff6b6b");
    if (gore) {
      // le membre sectionné remplace le trait du dessin
    } else if (state.mode !== "inverse") {
      scene.showTo((11 - state.max) + state.wrong);
    } else {
      // une erreur remet un crochet déjà retiré
      const off = scene.parts
        .map((p, i) => (i >= scene.predrawn && !p.on ? i : -1))
        .filter((i) => i >= 0);
      if (off.length) {
        const pick = off[(Math.random() * off.length) | 0];
        scene.addStrokeAt(pick);
        if (reason === "miss") toast("Le meneur remet un crochet en place.", "bad");
      }
    }
    if (!gore) scene.popText("+1", "#ff8a8a");

    if (state.wrong >= state.max) {
      endRound(false);
      return;
    }
    if (reason === "repeat") toast("Lettre déjà dite : une erreur de plus.", "bad");
    else if (reason === "timeout") toast("Temps écoulé : un trait s’ajoute.", "bad");
    else if (reason === "hint") toast("Indice acheté : un trait de pénalité.", "bad");
    else if (reason === "guess") toast("Mauvaise réponse : un trait de pénalité.", "bad");
    updateUI();
  }

  /* ---------------------------------------------------------------- proposer */
  function propose(letter) {
    if (!state || state.over || state.removeMode || busy) return;
    if (!isLetter(letter)) return;

    if (state.guessed.has(letter)) {
      if (S.noRepeat) {
        toast(`« ${letter} » a déjà été proposée : erreur !`, "bad");
        addError("repeat");
      } else {
        toast(`« ${letter} » a déjà été proposée.`);
      }
      return;
    }
    if (S.limitedVowels && VOWELS.has(letter) && state.vowelsUsed >= 3) {
      toast("Voyelles limitées : trois maximum par partie.", "bad");
      return;
    }

    const inWord = state.evil
      ? state.evil.pool.some((w) => w.w.includes(letter))
      : state.letters.includes(letter);

    if (state.mode === "dedans" && !state.evil) {
      const wantIn = state.dedansNext === "in";
      if (inWord !== wantIn) {
        toast(`Raté : il fallait une lettre ${wantIn ? "DANS" : "HORS du"} mot.`, "bad");
        state.dedansNext = wantIn ? "out" : "in";
        addError("rule");
        return;
      }
      state.dedansNext = wantIn ? "out" : "in";
    }

    state.guessed.add(letter);
    if (VOWELS.has(letter)) state.vowelsUsed++;
    resetTimer();

    if (state.evil) { proposeEvil(letter); return; }

    if (inWord) {
      state.found.add(letter);
      Sound.ok();
      scene.popText("+" + (state.word.split(letter).length - 1), "#6fe08a");
      vibrate(12);
      updateUI(new Set([letter]));
      if (checkWin()) { endRound(true); return; }
      if (state.mode === "inverse" && !state.over) {
        enterRemoveMode();
        return;
      }
    } else {
      addError("miss");
    }
  }

  function proposeEvil(letter) {
    const ev = state.evil;
    const groups = new Map();
    for (const w of ev.pool) {
      let key = "";
      for (let i = 0; i < ev.pattern.length; i++) {
        const p = ev.pattern[i];
        if (p !== null) key += p;
        else if (w[i] === letter) key += letter;
        else key += "_";
      }
      let g = groups.get(key);
      if (!g) { g = { key, words: [], hit: key.includes(letter) }; groups.set(key, g); }
      g.words.push(w);
    }
    let best = null;
    for (const g of groups.values()) {
      if (!best) { best = g; continue; }
      if (g.words.length > best.words.length) best = g;
      else if (g.words.length === best.words.length && !g.hit && best.hit) best = g;
    }
    if (!best) return;
    ev.pool = best.words;
    ev.pattern = best.key.split("").map((c) => (c === "_" ? null : c));
    if (ev.pool.length === 1) {
      const w = ev.pool[0];
      ev.pattern = w.w.split("");
      state.found = new Set(w.w.split(""));
    }
    if (!best.hit) {
      addError("miss");
    } else {
      Sound.ok();
      updateUI(new Set([letter]));
      if (checkWin()) endRound(true, ev.pool[0]);
    }
  }

  /* -------------------------------------------------------- mode inversé */
  function enterRemoveMode() {
    if (!scene.hookCount) return;
    state.removeMode = true;
    scene.pickable = true;
    updateUI();
    toast("Lettre trouvée ! Choisis un trait à retirer sur le dessin.", "good");
    Sound.whoosh();
  }

  function pickStroke(i) {
    if (!state || !state.removeMode) return;
    if (!scene.removeStroke(i)) return;
    state.removeMode = false;
    scene.pickable = false;
    Sound.click();
    if (scene.hookCount === 0) {
      endRound(true, null, "cleared");
      return;
    }
    updateUI();
    if (checkWin()) endRound(true);
  }

  function unhookLast() {
    if (!state || !state.removeMode) return;
    let i = -1;
    for (let k = scene.parts.length - 1; k >= 0; k--) {
      if (scene.parts[k].on && k >= scene.predrawn) { i = k; break; }
    }
    if (i >= 0) pickStroke(i);
  }

  /** Pendu inversé : « crier au bluff » une fois par manche. */
  function bluff() {
    if (!state || state.over) return;
    if (state.contestUsed) { toast("Bluff déjà tenté dans cette manche."); return; }
    state.contestUsed = true;
    Sound.whoosh();
    if (Math.random() < 0.5) {
      state.wrong = Math.max(0, state.wrong - 1);
      const hooks = scene.parts.filter((p, i) => i >= scene.predrawn && p.on);
      if (hooks.length) scene.removeStroke(scene.parts.indexOf(hooks[0]));
      toast("Le meneur bluffait ! Une erreur annulée, un crochet en moins.", "good");
      Sound.win();
    } else {
      toast("Le meneur ne bluffait pas : une erreur de plus.", "bad");
      addError("bluff");
    }
    updateUI();
  }

  /* ------------------------------------------------------------------ indice */
  function useHint() {
    if (!state || state.over || state.removeMode) return;
    if (state.mode === "inverse") { bluff(); return; }
    if (state.hintLevel >= 3) { toast("Plus d’indice disponible."); return; }
    const free = state.mode === "indices" && state.wrong >= 3 && !state.freeHintUsed;
    if (!free && !S.hintPenalty && state.mode !== "indices") {
      toast("Les indices sont désactivés dans les réglages.");
      return;
    }
    if (free) state.freeHintUsed = true;
    else if (S.hintPenalty) addError("hint");
    if (state.over) return;

    state.hintLevel++;
    const el = $("#hint");
    el.classList.add("is-solid");
    let text = "";
    if (state.hintLevel === 1) {
      text = state.themeLabel ? `Catégorie : ${state.themeLabel}.` :
        (state.kind === "phrase" ? "C’est une expression, un proverbe ou un titre." : "Aucune catégorie pour ce mot.");
      if (state.kind === "phrase" || state.kind === "film") {
        text = `${state.themeLabel || "Expression"} · ${state.word.split(" ").length} mots.`;
      }
    } else if (state.hintLevel === 2) {
      const letters = state.word.split("").filter(isLetter);
      const first = letters[0];
      if (first && !state.found.has(first)) {
        state.found.add(first);
        state.guessed.add(first);
        state.hinted.add(first);
        text = `La première lettre est « ${first} ».`;
        updateUI(new Set([first]));
        if (checkWin()) { endRound(true); return; }
      } else {
        const last = letters[letters.length - 1];
        state.found.add(last);
        state.guessed.add(last);
        state.hinted.add(last);
        text = `La dernière lettre est « ${last} ».`;
        updateUI(new Set([last]));
        if (checkWin()) { endRound(true); return; }
      }
    } else {
      text = state.def ? `Définition : ${state.def}` : "Pas de définition disponible pour ce mot.";
    }
    el.innerHTML = '<span class="hint-key">Indice</span> ' + text;
    Sound.click();
    updateUI();
  }

  /* -------------------------------------------------------- deviner le mot */
  function openGuessModal() {
    if (!state || state.over) return;
    if (S.guessMode === "off") { toast("Deviner le mot entier est désactivé."); return; }
    if (S.guessMode === "once" && state.guessUsed >= 1) { toast("Une seule tentative par partie."); return; }
    $("#guess-error").hidden = true;
    $("#guess-input").value = "";
    $("#guess-sub").textContent = S.guessMode === "once"
      ? "Une seule tentative. Si tu te trompes, tu prends un trait."
      : "Chaque erreur coûte un trait. Tu peux réessayer.";
    showModal("modal-guess");
    setTimeout(() => $("#guess-input").focus(), 60);
  }

  function submitGuess() {
    const value = normalizePhrase($("#guess-input").value);
    if (!value) {
      const e = $("#guess-error");
      e.textContent = "Écris au moins une lettre.";
      e.hidden = false;
      return;
    }
    state.guessUsed++;
    hideModal("modal-guess");
    const target = state.evil ? state.evil.pool.map((w) => w.w) : [state.word];
    if (target.includes(value)) {
      if (state.evil) {
        const w = state.evil.pool[0];
        state.evil.pattern = w.w.split("");
        state.found = new Set(w.w.split(""));
        endRound(true, w);
      } else {
        state.word.split("").forEach((c) => { if (isLetter(c)) state.found.add(c); });
        endRound(true);
      }
    } else {
      toast("Ce n’est pas le mot…", "bad");
      addError("guess");
      updateUI();
    }
  }

  /* ---------------------------------------------------------------- chrono */
  function startTimer() {
    stopTimer();
    state.timerOn = true;
    state.timeTotal = S.timer || 20;
    state.timeLeft = state.timeTotal;
    lastTick = performance.now();
    updateTimerUI();
    timerId = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      if (state.over) { stopTimer(); return; }
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        updateTimerUI();
        stopTimer();
        toast("Temps écoulé !", "bad");
        addError("timeout");
        if (!state.over) startTimer();
        return;
      }
      updateTimerUI();
    }, 100);
  }

  function resetTimer() {
    if (state.mode !== "chrono" || state.over) return;
    state.timeLeft = state.timeTotal;
    lastTick = performance.now();
    updateTimerUI();
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    state.timerOn = false;
  }

  function updateTimerUI() {
    const chip = $("#chip-timer");
    if (state.mode !== "chrono") { chip.hidden = true; return; }
    chip.hidden = false;
    const pct = state.timeTotal ? (state.timeLeft / state.timeTotal) * 100 : 0;
    chip.style.setProperty("--t", String(clamp(pct, 0, 100)));
    $("#timer-label").textContent = Math.ceil(state.timeLeft) + " s";
    chip.classList.toggle("is-low", state.timeLeft <= 5);
  }

  /* --------------------------------------------------------------- fin */
  function endRound(won, entry, reason) {
    if (state.over) return;
    state.over = true;
    state.won = won;
    state.elapsed = Math.round((Date.now() - state.startedAt) / 1000);
    stopTimer();
    state.removeMode = false;
    scene.pickable = false;

    if (entry && entry.w) {
      state.word = entry.w;
      if (entry.d) state.def = entry.d;
    }
    if (state.evil) {
      const w = (entry && entry.w) ? entry : (state.evil.pool[0] || null);
      if (w) {
        state.word = w.w;
        state.def = w.d || state.def;
        state.evil.pattern = w.w.split("");
      }
    }
    if (!state.evil) {
      state.word.split("").forEach((c) => { if (isLetter(c)) state.found.add(c); });
    }
    updateUI(new Set(state.word.split("")));
    renderChips();
    renderButtons();

    if (won) {
      Sound.win();
      scene.celebrate();
      setTurn(reason === "cleared" ? "Dessin effacé : l’astronaute est libre !" : "Gagné !", true);
    } else {
      Sound.lose();
      scene.sad();
      setTurn(S.gore && state.mode !== "inverse"
        ? "Le corps explose !"
        : "Perdu… le dessin est terminé.");
    }

    if (state.players === 1) {
      STATS.played++;
      if (won) {
        STATS.wins++;
        STATS.streak++;
        const pts = 100 + 12 * (state.max - state.wrong) + Math.max(0, 60 - state.elapsed);
        STATS.best = Math.max(STATS.best, pts);
        STATS.lastScore = pts;
      } else {
        STATS.losses++;
        STATS.streak = 0;
      }
      saveStats();
    } else {
      if (won) score2p.devineur = (score2p.devineur || 0) + 1;
      else score2p.meneur = (score2p.meneur || 0) + 1;
    }

    setTimeout(() => showResult(won, reason), S.gore && state.mode !== "inverse" ? 1700 : 700);
  }

  function showResult(won, reason) {
    const card = $("#result-card");
    card.classList.toggle("is-lose", !won);
    $("#result-badge").style.opacity = "1";
    $("#result-kicker").textContent = state.players === 2
      ? (won ? "Le devineur l’emporte" : "Le meneur l’emporte")
      : S.gore && !won
        ? "Le condamné est en pièces"
        : (won ? "Manche gagnée" : "Manche perdue");
    $("#result-title").textContent = won
      ? (reason === "cleared" ? "Libre !" : "Bien joué !")
      : "Perdu…";
    $("#result-word").textContent = state.word || "—";

    const defText = state.def || (state.players === 2
      ? "Le meneur n’a pas fourni de définition."
      : "Pas de définition disponible pour ce mot.");
    $("#result-def-text").textContent = defText;
    $("#result-def-meta").textContent = state.source
      ? "Source : " + state.source + (state.themeLabel ? " · " + state.themeLabel : "")
      : (state.themeLabel || "");

    const stats = [];
    stats.push(`<li><b>${state.wrong}</b> / ${state.max} erreurs</li>`);
    stats.push(`<li><b>${state.elapsed || 0} s</b></li>`);
    if (state.word) stats.push(`<li><b>${wordLetters().length}</b> lettres</li>`);
    if (state.players === 1) {
      stats.push(`<li>Série : <b>${STATS.streak}</b></li>`);
      stats.push(`<li>Record : <b>${STATS.best}</b> pts</li>`);
    } else {
      stats.push(`<li>Meneur ${roles.meneur} : <b>${score2p.meneur}</b></li>`);
      stats.push(`<li>Devineur ${roles.devineur} : <b>${score2p.devineur || 0}</b></li>`);
    }
    $("#result-stats").innerHTML = stats.join("");

    const rolesBtn = $("#btn-roles");
    rolesBtn.hidden = state.players !== 2;
    showModal("modal-result");
  }

  /* ----------------------------------------------------------------- écrans */
  function hideScreens() {
    $$(".screen").forEach((s) => { s.hidden = true; });
    $("#curtain").hidden = true;
  }

  function showScreen(id) {
    hideScreens();
    $(id).hidden = false;
  }

  function showModal(id) {
    $$(".modal").forEach((m) => { m.hidden = true; });
    const el = $(id.startsWith("#") ? id : "#" + id);
    if (el) el.hidden = false;
  }

  function hideModal(id) {
    const el = $(id.startsWith("#") ? id : "#" + id);
    if (el) el.hidden = true;
  }

  /* --------------------------------------------------------------- accueil */
  function buildHome() {
    const host = $("#modes");
    host.replaceChildren();
    (ANN.modes || []).forEach((m) => {
      const b = document.createElement("button");
      b.className = "mode" + (m.id === selectedMode ? " is-on" : "");
      b.dataset.mode = m.id;
      b.type = "button";
      b.innerHTML = `
        <span class="mode-ico"><svg viewBox="0 0 24 24" width="19" height="19"><use href="#${m.icon}"/></svg></span>
        <span class="mode-tag">${m.tag}</span>
        <b>${m.name}</b>
        <small>${m.desc}</small>`;
      b.addEventListener("click", () => {
        selectedMode = m.id;
        $$(".mode", host).forEach((x) => x.classList.toggle("is-on", x.dataset.mode === m.id));
        Sound.click();
      });
      b.addEventListener("dblclick", () => { selectedMode = m.id; startFromHome(); });
      host.appendChild(b);
    });

    const rulesGrid = $("#rules-modes");
    rulesGrid.replaceChildren();
    (ANN.modes || []).forEach((m) => {
      const d = document.createElement("div");
      d.className = "rule-card";
      d.innerHTML = `<b>${m.name}</b><span>${m.desc}</span>`;
      rulesGrid.appendChild(d);
    });

    $$("#seg-difficulty button").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.diff === S.difficulty);
      b.addEventListener("click", () => setDifficulty(b.dataset.diff));
    });
    $$("#set-difficulty button").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.diff === S.difficulty);
      b.addEventListener("click", () => setDifficulty(b.dataset.diff));
    });

    $$(".tab[data-players]").forEach((t) => {
      t.addEventListener("click", () => setPlayers(Number(t.dataset.players)));
    });
    setPlayers(1, true);
  }

  /** Applique (ou désactive) la variante gore sans casser la manche en cours. */
  function applyGoreSetting() {
    const inGame = !!(state && state.startedAt && !state.over);
    document.documentElement.classList.toggle(
      "is-gore", !!S.gore && !(state && state.mode === "inverse"));
    if (inGame) {
      toast(S.gore
        ? "Version gore : appliquée à la prochaine manche."
        : "Version classique : appliquée à la prochaine manche.");
    } else {
      toast(S.gore ? "Version gore activée." : "Version classique rétablie.",
        S.gore ? "bad" : "good");
    }
    Sound.click();
  }

  function setDifficulty(diff) {    S.difficulty = diff;
    saveSettings();
    $$("#seg-difficulty button, #set-difficulty button").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.diff === diff);
    });
    Sound.click();
  }

  function setPlayers(n, silent) {
    players = n;
    $$(".tab[data-players]").forEach((t) => {
      const on = Number(t.dataset.players) === n;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    $("#start-label").textContent = n === 1 ? "Nouvelle partie" : "Créer la manche";
    if (!silent) Sound.click();
  }

  function startFromHome() {
    Sound.init();
    if (players === 1) {
      startGame(selectedMode);
    } else {
      openSetup();
    }
  }

  /* ------------------------------------------------------------ 2 joueurs */
  function openSetup() {
    $("#setup-word").value = "";
    $("#setup-theme").value = "";
    $("#setup-hint").value = "";
    $("#setup-errors").value = String(S.maxErrors);
    $("#setup-error").hidden = true;
    showModal("modal-setup");
    setTimeout(() => $("#setup-word").focus(), 80);
  }

  function validSetup() {
    const raw = $("#setup-word").value;
    const word = normalizePhrase(raw);
    const lettersOnly = word.replace(/ /g, "");
    const err = $("#setup-error");
    if (lettersOnly.length < 3) {
      err.textContent = "Il faut au moins 3 lettres.";
      err.hidden = false;
      return;
    }
    if (lettersOnly.length > 26) {
      err.textContent = "C’est un peu long : 26 lettres maximum.";
      err.hidden = false;
      return;
    }
    const max = Number($("#setup-errors").value) || 8;
    const cfg = {
      word,
      theme: $("#setup-theme").value.trim(),
      hint: $("#setup-hint").value.trim(),
      max,
      mode: selectedMode === "diabolique" ? "classique" : selectedMode,
    };
    hideModal("modal-setup");
    $("#curtain").hidden = false;
    showCurtain("Passe l’écran au devineur", "Le mot est prêt. Aucun coup d’œil&nbsp;!", "Je suis prêt", () => {
      $("#curtain").hidden = true;
      startTwoPlayer(cfg);
    });
  }

  let curtainCb = null;
  function showCurtain(title, sub, btn, cb) {
    const c = $("#curtain");
    c.querySelector(".curtain-title").textContent = title;
    c.querySelector(".curtain-sub").innerHTML = sub;
    let b = c.querySelector(".curtain-btn");
    if (!b) {
      b = document.createElement("button");
      b.className = "btn btn-primary curtain-btn";
      b.style.marginTop = "18px";
      c.querySelector(".curtain-inner").appendChild(b);
      b.addEventListener("click", () => { if (curtainCb) curtainCb(); });
    }
    b.textContent = btn;
    curtainCb = cb;
    c.hidden = false;
  }

  /* --------------------------------------------------------------- réglages */
  const TOGGLES_GAME = [
    ["noRepeat", "Compter les répétitions", "Une lettre déjà dite = une erreur."],
    ["offerEnds", "Première et dernière offertes", "Version facilitée pour les enfants."],
    ["limitedVowels", "Voyelles limitées", "Trois voyelles maximum par partie."],
    ["hintPenalty", "Indice contre pénalité", "Chaque indice coûte un trait."],
  ];
  const TOGGLES_AMBIANCE = [
    ["sound", "Sons et vibrations", "Retours audio synthétisés."],
  ];
  const TOGGLES_GORE = [
    ["gore", "Activer la version gore", "Condamné pendu, membres sectionnés, sang stylisé."],
  ];

  function makeToggle(key, title, sub, danger) {
    const lab = document.createElement("label");
    lab.className = "toggle" + (danger ? " is-danger" : "");
    lab.innerHTML = `<input type="checkbox" ${S[key] ? "checked" : ""} data-key="${key}">
      <span class="sw"></span><span><b>${title}</b><small>${sub}</small></span>`;
    const input = lab.querySelector("input");
    input.addEventListener("change", () => {
      if (key === "gore" && input.checked) {
        const ok = window.confirm(
          "Version gore (manga)\n\n" +
          "Le personnage est déjà pendu ; chaque erreur sectionne un membre, " +
          "avec des éclats de sang stylisés et le corps qui se balance.\n\n" +
          "Contenu déconseillé aux jeunes enfants. Activer cette version ?");
        if (!ok) { input.checked = false; return; }
      }
      S[key] = input.checked;
      saveSettings();
      if (key === "gore") applyGoreSetting();
      else Sound.click();
    });
    return lab;
  }

  function buildSettings() {
    // onglets
    $$(".set-tab").forEach((tab) => {
      tab.addEventListener("click", () => selectSettingsTab(tab.dataset.setTab));
    });

    // difficulté (le panneau d'accueil est synchronisé dans setDifficulty)
    $$("#set-difficulty button").forEach((b) => {
      b.addEventListener("click", () => setDifficulty(b.dataset.diff));
    });

    // nombre d'erreurs
    $("#set-errors").addEventListener("input", (e) => {
      S.maxErrors = Number(e.target.value);
      $("#set-errors-value").textContent = S.maxErrors;
      saveSettings();
    });

    // temps par proposition
    $$("#set-timer button").forEach((b) => {
      b.addEventListener("click", () => {
        S.timer = Number(b.dataset.timer);
        saveSettings();
        syncSettingsUI();
        Sound.click();
      });
    });

    // options de partie
    const gameHost = $("#set-toggles-game");
    gameHost.replaceChildren();
    TOGGLES_GAME.forEach(([k, t, s]) => gameHost.appendChild(makeToggle(k, t, s)));

    const ambHost = $("#set-toggles-ambiance");
    ambHost.replaceChildren();
    TOGGLES_AMBIANCE.forEach(([k, t, s]) => ambHost.appendChild(makeToggle(k, t, s)));

    const goreHost = $("#set-toggles-gore");
    goreHost.replaceChildren();
    TOGGLES_GORE.forEach(([k, t, s]) => goreHost.appendChild(makeToggle(k, t, s, true)));

    // deviner le mot entier
    const guessBlock = $("#set-guess-block");
    guessBlock.innerHTML = `
      <h3>Deviner le mot entier</h3>
      <div class="segmented segmented-wide" id="set-guess">
        <button data-guess="once">Une tentative</button>
        <button data-guess="penalty">Illimité, 1 trait</button>
        <button data-guess="off">Interdit</button>
      </div>`;
    $$("#set-guess button").forEach((b) => {
      b.addEventListener("click", () => {
        S.guessMode = b.dataset.guess;
        saveSettings();
        syncSettingsUI();
        Sound.click();
      });
    });

    syncSettingsUI();
    renderInstallUI();
  }

  /** Active un onglet du panneau de réglages. */
  function selectSettingsTab(name) {
    $$(".set-tab").forEach((t) => {
      const on = t.dataset.setTab === name;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".set-panel").forEach((p) => { p.hidden = p.dataset.panel !== name; });
    if (name === "data") renderStats();
    Sound.click();
  }

  /** Reflète l'état courant de S dans tous les contrôles des réglages. */
  function syncSettingsUI() {
    $("#set-errors").value = S.maxErrors;
    $("#set-errors-value").textContent = S.maxErrors;
    $$("#set-difficulty button").forEach((b) => b.classList.toggle("is-on", b.dataset.diff === S.difficulty));
    $$("#seg-difficulty button").forEach((b) => b.classList.toggle("is-on", b.dataset.diff === S.difficulty));
    $$("#set-timer button").forEach((b) => b.classList.toggle("is-on", Number(b.dataset.timer) === S.timer));
    $$("#set-guess button").forEach((b) => b.classList.toggle("is-on", b.dataset.guess === S.guessMode));
    $$("#set-toggles-game input, #set-toggles-ambiance input, #set-toggles-gore input").forEach((i) => {
      i.checked = !!S[i.dataset.key];
    });
    $("#btn-sound").setAttribute("aria-pressed", S.sound ? "true" : "false");
    $("#btn-sound").querySelector("use").setAttribute("href", S.sound ? "#i-sound" : "#i-mute");
    renderStats();
    renderInstallUI();
  }

  function renderStats() {
    const host = $("#stats-grid");
    if (!host) return;
    const cells = [
      ["Parties", STATS.played || 0],
      ["Victoires", STATS.wins || 0],
      ["Série", STATS.streak || 0],
      ["Record", `${STATS.best || 0} pts`],
    ];
    host.innerHTML = cells
      .map(([label, value]) => `<div class="stat-cell"><b>${value}</b><span>${label}</span></div>`)
      .join("");
  }

  /* ------------------------------------------------------------- installation */
  let installPrompt = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function renderInstallUI() {
    const top = $("#btn-install-top");
    const card = $("#btn-install-app");
    const note = $("#install-note");
    if (!top || !card) return;
    const installed = isStandalone();
    const can = !!installPrompt && !installed;
    top.hidden = !can;
    card.disabled = !can;
    card.textContent = installed ? "Installée" : can ? "Installer" : "Indisponible";
    if (note) {
      note.textContent = installed
        ? "L’application est déjà installée sur cet appareil."
        : can
          ? "Ajoute le jeu à ton écran d’accueil pour le lancer en plein écran."
          : "Ouvre le jeu dans Chrome, Edge ou Safari pour l’installer.";
    }
  }

  async function installApp() {
    if (!installPrompt) {
      renderInstallUI();
      return;
    }
    installPrompt.prompt();
    try {
      const choice = await installPrompt.userChoice;
      if (choice && choice.outcome === "accepted") toast("Installation lancée…", "good");
      else toast("Installation annulée.");
    } catch (_) { /* ignore */ }
    installPrompt = null;
    renderInstallUI();
  }

  /** Vide le cache de l'application puis recharge la dernière version. */
  async function forceUpdate() {
    toast("Mise à jour en cours…");
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (_) { /* ignore */ }
    location.reload();
  }

  function registerServiceWorker() {    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) {
      const st = $("#sw-status");
      if (st) st.textContent = "Hors ligne : disponible une fois le jeu servi en ligne (https).";
      return;
    }
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      const st = $("#sw-status");
      if (st) st.textContent = "Hors ligne : prêt — le jeu fonctionne sans connexion.";
      if (reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }).catch(() => {
      const st = $("#sw-status");
      if (st) st.textContent = "Hors ligne : indisponible sur ce navigateur.";
    });
  }

  /* --------------------------------------------------------------- clavier */
  function buildKeyboard() {
    const host = $("#keyboard");
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    host.replaceChildren();
    letters.forEach((L) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "key" + (VOWELS.has(L) ? " is-vowel" : "");
      b.dataset.letter = L;
      b.textContent = L;
      b.setAttribute("aria-label", "Lettre " + L);
      b.addEventListener("click", () => { Sound.init(); propose(L); });
      host.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- navigation */
  function bind() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const a = el.dataset.action;
      switch (a) {
        case "home": e.preventDefault(); showScreen("#screen-home"); stopTimer(); break;
        case "rules": showScreen("#screen-rules"); break;
        case "settings": showScreen("#screen-settings"); break;
        case "close-screen":
          $("#screen-rules").hidden = true;
          $("#screen-settings").hidden = true;
          if (!state || !state.startedAt) showScreen("#screen-home");
          break;
        case "sound": toggleSound(); break;
        case "fullscreen": toggleFullscreen(); break;
        case "install": installApp(); break;
        case "force-update": forceUpdate(); break;
        case "start": startFromHome(); break;
        case "hint": useHint(); break;
        case "guess": openGuessModal(); break;
        case "giveup": giveUp(); break;
        case "cancel-setup": hideModal("modal-setup"); break;
        case "valid-setup": validSetup(); break;
        case "cancel-guess": hideModal("modal-guess"); break;
        case "valid-guess": submitGuess(); break;
        case "result-again": hideModal("modal-result"); replay(); break;
        case "result-menu": hideModal("modal-result"); showScreen("#screen-home"); break;
        case "result-roles":
          hideModal("modal-result");
          roles = { meneur: roles.devineur, devineur: roles.meneur };
          openSetup();
          break;
        case "reset-deck":
          store.del(K_DECK);
          toast("Mots déjà vus réinitialisés.", "good");
          break;
        case "reset-stats":
          STATS = { wins: 0, losses: 0, streak: 0, best: 0, played: 0 };
          saveStats();
          renderStats();
          toast("Statistiques effacées.", "good");
          break;
        case "reset-settings":
          if (!window.confirm("Rétablir tous les réglages par défaut ?\n\nLes statistiques et les mots déjà vus sont conservés.")) break;
          S = Object.assign({}, DEFAULTS);
          saveSettings();
          syncSettingsUI();
          applyGoreSetting();
          toast("Réglages réinitialisés.", "good");
          break;
        case "reset-all":
          if (!window.confirm("Tout effacer ?\n\nRéglages, statistiques et mots déjà vus seront perdus. Cette action est définitive.")) break;
          S = Object.assign({}, DEFAULTS);
          saveSettings();
          STATS = { wins: 0, losses: 0, streak: 0, best: 0, played: 0 };
          saveStats();
          store.del(K_DECK);
          syncSettingsUI();
          applyGoreSetting();
          toast("Données effacées.", "good");
          break;
        default: break;
      }
    });

    $("#btn-unhook").addEventListener("click", unhookLast);

    $("#modal-guess").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitGuess(); }
    });
    $("#modal-setup").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") { e.preventDefault(); validSetup(); }
    });

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        if (!$("#modal-result").hidden) { hideModal("modal-result"); showScreen("#screen-home"); }
        else if (!$("#modal-guess").hidden) hideModal("modal-guess");
        else if (!$("#modal-setup").hidden) hideModal("modal-setup");
        else if (!$("#screen-rules").hidden || !$("#screen-settings").hidden) {
          $("#screen-rules").hidden = true;
          $("#screen-settings").hidden = true;
        }
        return;
      }
      if (!$("#screen-home").hidden && !$$(".modal").some((m) => !m.hidden) &&
          (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        startFromHome();
        return;
      }
      const k = e.key.toUpperCase();
      if (/^[A-Z]$/.test(k)) { Sound.init(); propose(k); }
    });
  }

  function toggleSound() {
    S.sound = !S.sound;
    saveSettings();
    $("#btn-sound").setAttribute("aria-pressed", S.sound ? "true" : "false");
    $("#btn-sound").querySelector("use").setAttribute("href", S.sound ? "#i-sound" : "#i-mute");
    $$('input[data-key="sound"]').forEach((i) => { i.checked = S.sound; });
    if (S.sound) { Sound.init(); Sound.click(); }
    toast(S.sound ? "Son activé." : "Son coupé.");
  }

  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
    }
  }

  function giveUp() {
    if (!state || state.over) return;
    if (!confirm("Abandonner cette manche ? Le mot sera révélé.")) return;
    endRound(false);
  }

  function replay() {
    if (players === 2 && state && state.players === 2) {
      openSetup();
      return;
    }
    startGame(lastMode);
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    // Chaque bloc est isolé : une erreur dans les réglages ne doit pas
    // empêcher l'accueil et le jeu de s'afficher.
    try { buildHome(); } catch (err) { console.error("Accueil :", err); }
    try { buildSettings(); } catch (err) { console.error("Réglages :", err); }
    try { buildKeyboard(); } catch (err) { console.error("Clavier :", err); }
    try { bind(); } catch (err) { console.error("Navigation :", err); }
    $("#btn-sound").setAttribute("aria-pressed", S.sound ? "true" : "false");
    $("#btn-sound").querySelector("use").setAttribute("href", S.sound ? "#i-sound" : "#i-mute");
    $("#curtain").hidden = true;
    const ver = $("#app-version");
    if (ver) ver.textContent = APP_VERSION;
    // Détecte un HTML et des scripts désynchronisés (cache d'une ancienne version).
    const htmlVersion = document.documentElement.dataset.version;
    if (htmlVersion && htmlVersion !== APP_VERSION) {
      toast("Mise à jour disponible : recharge la page (Ctrl+Maj+R).", "bad");
    }
    if (!LEX.words.length) {
      toast("Lexique absent : lancez tools/build_mots.py --build", "bad");
    }
    showScreen("#screen-home");
    try {
      scene.setup(8);
      // aperçu animé derrière l'accueil
      scene.showTo(11);
      setTimeout(() => { if (!state || !state.startedAt) scene.showTo(11); }, 60);
    } catch (err) { console.error("Scène :", err); }
    registerServiceWorker();
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      installPrompt = e;
      renderInstallUI();
    });
    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      renderInstallUI();
      toast("Application installée.", "good");
    });
    window.matchMedia("(display-mode: standalone)").addEventListener?.("change", renderInstallUI);
    runDemo();
  }

  /* Modes de démonstration (captures d'écran, tests) :
     ?demo=1&mode=classique&word=MAISON&letters=A,S,O,N           */
  function runDemo() {
    const p = new URLSearchParams(location.search);
    if (p.has("probe")) {
      setTimeout(() => {
        const s = state || {};
        document.title = `probe ${window.innerWidth}x${window.innerHeight} ` +
          `over=${s.over} won=${s.won} wrong=${s.wrong}/${s.max} ` +
          `word=${s.word} mode=${s.mode} modal=${!$("#modal-result").hidden} ` +
          `gore=${!!S.gore} cuts=${scene.gore ? scene.body.cuts : "-"} ` +
          `expl=${scene.gore ? scene.body.exploded : "-"} ` +
          `def=${(s.def || "").slice(0, 40)}`;
      }, 3600);
    }
    const screen = p.get("screen");
    if (screen) {
      const map = { rules: "#screen-rules", settings: "#screen-settings", home: "#screen-home" };
      if (map[screen]) {
        showScreen(map[screen]);
        if (screen === "settings" && p.get("tab")) selectSettingsTab(p.get("tab"));
      }
      else if (screen === "setup") showModal("modal-setup");
      else if (screen === "guess") showModal("modal-guess");
      else if (screen === "result") {
        state = freshState();
        state.word = "BIBLIOTHEQUE";
        state.def = "Lieu où l’on conserve et prête des livres.";
        state.letters = wordLetters();
        state.max = 8;
        state.wrong = 2;
        state.elapsed = 47;
        state.source = "Wiktionnaire";
        state.played = 1;
        showResult(true);
      }
      return;
    }
    if (!p.has("demo")) return;
    const mode = p.get("mode") || "classique";
    const letters = (p.get("letters") || "").toUpperCase().split("").filter(isLetter);
    const custom = p.get("word");
    if (p.has("gore")) S.gore = true;
    if (p.get("errors")) S.maxErrors = clamp(Number(p.get("errors")) || S.maxErrors, 6, 11);
    setTimeout(() => {
      if (p.get("two")) {
        roles = { meneur: 1, devineur: 2 };
        startTwoPlayer({
          word: normalizePhrase(custom || "MAISON"),
          hint: "Le lieu où l’on habite.",
          max: 8,
          mode: mode === "diabolique" ? "classique" : mode,
        });
      } else if (custom) {
        state = freshState();
        state.mode = mode;
        state.players = 1;
        state.max = clamp(S.maxErrors, 6, 11);
        state.word = normalizePhrase(custom);
        state.def = "";
        state.source = "";
        state.kind = "mot";
        state.letters = wordLetters();
        hideScreens();
        beginRound();
      } else {
        startGame(mode);
      }
      let i = 0;
      const step = () => {
        if (i < letters.length && state && !state.over && !state.removeMode) {
          propose(letters[i++]);
          setTimeout(step, 320);
        }
      };
      step();
    }, 350);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
