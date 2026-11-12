import { GRID_H, GRID_W, SECTORS } from './game/config';
import { DIFFICULTIES } from './game/difficulty';
import { Engine } from './game/engine';
import { clearRun, loadRun, restoreRun, saveRun, type RunSnapshot } from './game/run';
import { loadSettings, saveSettings, type Settings } from './game/settings';
import { flushAll } from './game/storage';
import type { TowerKindId, Vec } from './game/types';
import { Renderer } from './render';
import { mustGet } from './ui/dom';
import { Hud } from './ui/hud';
import { bindInput } from './ui/input';
import { Modals } from './ui/modal';
import {
  buildEndOverlay,
  buildHelpPanel,
  buildPerksPanel,
  buildSectorPanel,
  buildSettingsPanel,
  showSectorIntro,
} from './ui/overlays';

const HELP_KEY = 'tdwars_help_seen';
const NARROW_MAX = 760; // doit rester aligné sur le breakpoint de style.css
const SIDE_PANEL_W = 240;
const BOTTOM_BAR_H = 118;
const MOBILE_BOTTOM_H = 250;

const canvas = mustGet<HTMLCanvasElement>('game');
const holder = mustGet<HTMLDivElement>('canvas-holder');
const appEl = mustGet<HTMLElement>('app');
const wrap = mustGet<HTMLDivElement>('game-wrap');
const hudEl = mustGet<HTMLElement>('hud');
const btnSpeed = mustGet<HTMLButtonElement>('btn-speed');
const btnSound = mustGet<HTMLButtonElement>('btn-sound');
const btnSector = mustGet<HTMLButtonElement>('btn-sector');
const btnMeta = mustGet<HTMLButtonElement>('btn-meta');
const btnFullscreen = mustGet<HTMLButtonElement>('btn-fullscreen');
const btnHelp = mustGet<HTMLButtonElement>('btn-help');
const btnSettings = mustGet<HTMLButtonElement>('btn-settings');

const settings: Settings = loadSettings();
const engine = new Engine(settings.difficulty);
const renderer = new Renderer(canvas, engine);

// --- reprise éventuelle de la partie en cours -------------------------------
let resumed: RunSnapshot | null = null;
const savedRun = loadRun();
if (savedRun) {
  restoreRun(engine, savedRun);
  resumed = savedRun;
}

const hud = new Hud(engine, {
  onSelectBuild: (id) => {
    renderer.buildPreview = id ? buildPreview(id, renderer.mouse) : null;
  },
  onSelectTower: (tower) => {
    renderer.selectedTower = tower;
  },
});

const modals = new Modals(engine, holder, (paused) => {
  if (!paused) return;
  engine.saberActive = false;
  engine.sfx.stopSaberHum();
});

// --- audio -----------------------------------------------------------------
let audioUnlocked = false;
let lastAudible: { sfx: boolean; music: boolean } | null = null;

function commitAudio(): void {
  const muted = !settings.sfx && !settings.music;
  engine.sfx.setSfxEnabled(settings.sfx);
  // la musique attend le premier geste : autoplay policy des navigateurs
  engine.sfx.setMusicEnabled(audioUnlocked ? settings.music : false);
  engine.sfx.setVolume(settings.volume);
  btnSound.textContent = muted ? '🔇' : '🔊';
  btnSound.setAttribute('aria-pressed', String(muted));
  btnSound.setAttribute('aria-label', muted ? 'Rétablir le son' : 'Couper le son');
}

function commitSettings(): void {
  saveSettings(settings);
  renderer.graphicsMode = settings.graphics;
  engine.setDifficulty(settings.difficulty);
  commitAudio();
}

function toggleMute(): void {
  const muted = !settings.sfx && !settings.music;
  if (!muted) {
    lastAudible = { sfx: settings.sfx, music: settings.music };
    settings.sfx = false;
    settings.music = false;
  } else {
    const previous = lastAudible ?? { sfx: true, music: true };
    settings.sfx = previous.sfx;
    settings.music = previous.music;
  }
  commitSettings();
}

window.addEventListener(
  'pointerdown',
  () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    engine.sfx.setMusicEnabled(settings.music);
  },
  { once: true, capture: true }
);

// --- événements du moteur ---------------------------------------------------
engine.onEvent = (event) => {
  switch (event.type) {
    case 'credits':
    case 'lives':
      hud.refreshResources();
      break;
    case 'wave':
      hud.refresh();
      saveRun(engine);
      break;
    case 'waveEnd':
      hud.recap(engine.waveNumber, event);
      break;
    case 'sector':
      renderer.hyperT = engine.sectorIndex > 0 ? 1.4 : 0;
      showSectorIntro(engine);
      hud.refresh();
      saveRun(engine);
      break;
    case 'speed':
    case 'buildbar':
      hud.refresh();
      break;
    case 'info':
      hud.refreshTowerPanel();
      break;
    case 'victory':
      clearRun();
      modals.show('over', buildEndOverlay('victory', engine), { sticky: true });
      break;
    case 'defeat':
      clearRun();
      modals.show('over', buildEndOverlay('defeat', engine), { sticky: true });
      break;
  }
};

// --- entrées ----------------------------------------------------------------
/** Aperçu de pose : validité + portée réelle, bonus d'adjacence inclus. */
function buildPreview(kindId: TowerKindId, pos: Vec) {
  const { range, bonus } = engine.previewRange(kindId, pos);
  return { kindId, valid: engine.canPlace(kindId, pos), range, bonus };
}

function onTap(pos: Vec): void {
  const tower = engine.towerAt(pos);
  if (tower) {
    hud.selectBuild(null);
    renderer.buildPreview = null;
    hud.showTower(tower);
    return;
  }
  const selected = hud.buildSelection;
  if (selected) {
    if (engine.placeTower(selected, pos)) {
      saveRun(engine);
      hud.refresh();
    }
    return;
  }
  hud.hideTower();
}

bindInput({
  canvas,
  engine,
  handlers: {
    move: (pos, pressed) => {
      renderer.mouse = pos;
      if (!pressed) engine.saberActive = false;
      const selected = hud.buildSelection;
      renderer.buildPreview = selected ? buildPreview(selected, pos) : null;
    },
    tap: onTap,
    saber: (active) => {
      if (active) engine.sfx.startSaberHum();
      else engine.sfx.stopSaberHum();
    },
    swing: (speed) => engine.sfx.saberSwing(speed),
    cancel: () => {
      hud.selectBuild(null);
      renderer.buildPreview = null;
      hud.hideTower();
    },
  },
});

// --- panneaux ---------------------------------------------------------------
function showHelp(): void {
  modals.show(
    'help',
    buildHelpPanel((dontShow) => {
      modals.close();
      if (dontShow) {
        try {
          localStorage.setItem(HELP_KEY, '1');
        } catch {
          /* stockage indisponible */
        }
      }
    })
  );
}

btnSpeed.addEventListener('click', () => engine.toggleSpeed());
btnSound.addEventListener('click', () => toggleMute());
btnHelp.addEventListener('click', () => modals.toggle('help', () => buildHelpPanel(() => modals.close())));
btnMeta.addEventListener('click', () => modals.toggle('perks', () => buildPerksPanel(engine, () => modals.close())));
btnSettings.addEventListener('click', () =>
  modals.toggle('settings', () =>
    buildSettingsPanel(
      settings,
      (next) => {
        const changed = next.difficulty !== settings.difficulty;
        Object.assign(settings, next);
        commitSettings();
        if (changed) {
          hud.notice(`Difficulté : ${DIFFICULTIES[settings.difficulty].label} — s'applique aux vagues suivantes`);
        }
      },
      () => modals.close()
    )
  )
);
btnSector.addEventListener('click', () =>
  modals.toggle('sector', () =>
    buildSectorPanel((index) => {
      engine.jumpToSector(index);
      hud.selectBuild(null);
      hud.hideTower();
      modals.close();
      showSectorIntro(engine);
      hud.refresh();
      saveRun(engine);
    })
  )
);
btnFullscreen.addEventListener('click', () => {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void appEl.requestFullscreen().catch(() => {
      /* plein écran refusé par le navigateur */
    });
  }
});

// --- mise en page -----------------------------------------------------------
const bottomBar = mustGet<HTMLElement>('bottom-bar');
const sidePanel = mustGet<HTMLElement>('side-panel');
const SIDE_BELOW_MAX = 900; // aligné sur le breakpoint 900px de style.css

function resizeCanvas(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const sideBelow = window.innerWidth <= SIDE_BELOW_MAX;
  const compact = window.innerWidth <= NARROW_MAX;
  const sideW = sideBelow ? 0 : SIDE_PANEL_W;
  const sideH = sideBelow ? sidePanel.offsetHeight : 0;
  const bottomH = bottomBar.offsetHeight || (compact ? MOBILE_BOTTOM_H : BOTTOM_BAR_H);
  const availW = Math.max(320, (wrap.clientWidth || GRID_W) - sideW);
  const availH = Math.max(200, window.innerHeight - (hudEl.offsetHeight || 90) - bottomH - sideH - 30);
  const scale = Math.max(0.4, Math.min(availW / GRID_W, availH / GRID_H));
  const cssW = Math.max(160, Math.round(GRID_W * scale));
  const cssH = Math.max(90, Math.round(GRID_H * scale));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  // 960×540 logiques -> cssW*dpr × cssH*dpr physiques
  renderer.ctx.setTransform((cssW * dpr) / GRID_W, 0, 0, (cssH * dpr) / GRID_H, 0, 0);
  renderer.ctx.imageSmoothingEnabled = true;
}

let resizeQueued = false;
function queueResize(): void {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    resizeCanvas();
  });
}

resizeCanvas();
window.addEventListener('resize', queueResize);
document.addEventListener('fullscreenchange', () => window.setTimeout(resizeCanvas, 60));
// on observe le HUD et le panneau latéral (jamais le canvas : pas de boucle)
if (typeof ResizeObserver !== 'undefined') {
  const observer = new ResizeObserver(() => queueResize());
  observer.observe(hudEl);
  observer.observe(sidePanel);
}

// --- cycle de vie -----------------------------------------------------------
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    engine.saberActive = false;
    engine.sfx.stopSaberHum();
    engine.sfx.suspend();
  } else {
    engine.sfx.resume();
  }
});

window.addEventListener('blur', () => {
  engine.saberActive = false;
  engine.sfx.stopSaberHum();
});

const persist = (): void => {
  flushAll();
  saveRun(engine);
};
window.addEventListener('pagehide', persist);
window.addEventListener('beforeunload', persist);

// --- easter egg : triple clic sur le nom de l'auteur ------------------------
let creditClicks = 0;
let creditTimer = 0;
mustGet<HTMLElement>('credit-name').addEventListener('click', () => {
  creditClicks += 1;
  window.clearTimeout(creditTimer);
  creditTimer = window.setTimeout(() => {
    creditClicks = 0;
  }, 2000);
  if (creditClicks < 3) return;
  creditClicks = 0;
  btnSector.classList.remove('is-hidden');
  btnSector.classList.add('primary');
  btnSector.title = 'Mode test';
  engine.devMode = true;
  engine.sfx.build();
});

// --- démarrage --------------------------------------------------------------
commitAudio();
renderer.graphicsMode = settings.graphics;
hud.refresh();
showSectorIntro(engine);

let helpSeen = false;
try {
  helpSeen = localStorage.getItem(HELP_KEY) === '1';
} catch {
  /* stockage indisponible */
}
if (!helpSeen) showHelp();
if (resumed) hud.notice(`Partie reprise — ${SECTORS[resumed.sector].name}, vague ${resumed.wave + 1}`);

let last = performance.now();
let hudTick = 0;
let saveTick = 0;
let crashed = false;

/** Affiche une erreur bloquante plutôt qu'un canvas figé sans explication. */
function showCrash(error: unknown): void {
  const panel = document.createElement('div');
  panel.id = 'crash';
  const title = document.createElement('h3');
  title.textContent = 'Le jeu s’est arrêté';
  const message = document.createElement('p');
  message.textContent = error instanceof Error ? `${error.name} : ${error.message}` : String(error);
  const reload = document.createElement('button');
  reload.className = 'btn primary';
  reload.textContent = 'Recharger';
  reload.addEventListener('click', () => window.location.reload());
  panel.append(title, message, reload);
  holder.appendChild(panel);
}

function loop(now: number): void {
  if (crashed) return;
  try {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    engine.update(dt);
    renderer.draw(dt);
    hudTick += dt;
    if (hudTick >= 0.25) {
      hudTick = 0;
      hud.refresh();
    }
    saveTick += dt;
    if (saveTick >= 5) {
      saveTick = 0;
      saveRun(engine);
    }
    requestAnimationFrame(loop);
  } catch (error) {
    crashed = true;
    console.error('[TD Wars] boucle interrompue :', error);
    showCrash(error);
  }
}

requestAnimationFrame(loop);
