import { SECTORS } from '../game/config';
import { DIFFICULTIES, DIFFICULTY_ORDER, normalizeDifficulty } from '../game/difficulty';
import type { Engine } from '../game/engine';
import { PERK_DEFS, perkCost, resetAll, respecPoints, saveMeta, type PerkId } from '../game/meta';
import type { Settings } from '../game/settings';
import { make } from './dom';

const PERK_ICONS: Record<string, string> = {
  credits: '💠',
  lives: '🛡️',
  saber: '⚔️',
  shield: '🔵',
};

/** Panneau « Comment jouer ». Renvoie aussi le choix « ne plus afficher ». */
export function buildHelpPanel(onClose: (dontShow: boolean) => void): HTMLElement {
  const panel = make('div');
  panel.id = 'help-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'help-title');
  panel.innerHTML = `
    <div class="help-scroll">
      <h3 id="help-title">TD WARS — Comment jouer</h3>
      <div class="help-box">
      <h4>🎯 Objectif</h4>
      La flotte du Nova Empire attaque votre base. Empêchez les ennemis d'atteindre
      la base à droite du parcours : chaque fuite coûte des vies (le bouclier absorbe en premier
      si vous avez le perk). Survivez aux <b>60 vagues</b> réparties sur <b>4 secteurs</b> :
      désert, glace, jungle et cité-planète.
      <h4>🏗️ Construire</h4>
      Sélectionnez une arme dans la barre en bas, puis cliquez sur le terrain à côté du chemin.
      Chaque arme se débloque par secteur (T1-T8), se <b>améliore</b> sur 3 niveaux, puis choisit une
      <b>spécialisation</b>. Cliquez sur une tour placée pour l'améliorer, changer son <b>ciblage</b>
      ou la vendre. L'Extracteur de moindal génère des crédits <b>pendant les vagues uniquement</b>.
      <h4>⚔️ Sabrelaser</h4>
      <b>Maintenez le clic</b> (ou le doigt) pour faire tournoyer un sabrelaser autour du curseur :
      il endommage les ennemis proches. Énergie limitée, recharge automatique.
      <h4>⏩ Vagues</h4>
      La vague suivante démarre automatiquement 6 s après la dernière mort — <b>lancez-la en avance</b>
      pour un bonus de crédits. L'aperçu dans le panneau de droite montre la composition de la vague
      suivante. La vitesse du jeu va jusqu'à x4 (x10 en mode test).
      <h4>⭐ Perks</h4>
      En fin de partie vous gagnez des points (1 pt / 2 vagues, +10 en victoire) à dépenser dans
      la boutique ⭐ Perks : crédits, vies, énergie du sabre, bouclier de la base. Effets permanents.
      <h4>💡 Subtilités</h4>
      <b>Adjacence</b> : une tour gagne +10% de portée si une tour d'un <b>autre type</b> est
      placée juste à côté — mélangez vos armes plutôt que d'empiler le même modèle.
      <br><b>Bonus d'anticipation</b> : lancer la vague en avance rapporte des crédits
      proportionnels au temps restant.
      <br><b>Ennemis spéciaux</b> : les <b>furtifs</b> ne sont bien ciblés que par les canons
      ionique et DEMP ; les <b>régénérateurs</b> soignent leurs alliés proches — éliminez-les
      en premier (mode ciblage « plus fort ») ; les ennemis blindés ont un <b>bouclier d'énergie</b>
      bleu (15% des PV) que les grosses frappes percent plus vite que la mitraille.
      <br><b>Changement de secteur</b> : vous changez de planète — <b>toutes vos tours sont retirées</b>
      et remboursées à 70%, et vos crédits sont plafonnés (600/900/1300) pour que chaque secteur
      redémarre avec un vrai défi économique.
      <br><b>Reprise</b> : la partie en cours est sauvegardée entre deux vagues — fermer l'onglet
      ne fait plus perdre la run.
      <br><b>Difficulté</b> : réglable dans ⚙️ Paramètres (Facile / Moyen / Difficile) — elle change
      les PV et la vitesse des ennemis, les vies et les crédits de départ.
      <br><b>Mode test</b> 🧪 : sautez directement à un secteur pour l'explorer, avec des
      crédits bonus de départ.
      <br><b>Rejouabilité</b> : le labyrinthe est <b>régénéré aléatoirement</b> à chaque partie —
      chaque run demande de nouveaux placements.
      </div>
    </div>
    <div class="help-footer">
      <label class="help-check"><input type="checkbox" id="help-dont-show"> Ne plus afficher au lancement</label>
      <button id="btn-help-close" class="btn primary">Commencer la partie</button>
    </div>`;
  panel.querySelector('#btn-help-close')?.addEventListener('click', () => {
    const box = panel.querySelector<HTMLInputElement>('#help-dont-show');
    onClose(box?.checked ?? false);
  });
  return panel;
}

export function buildSettingsPanel(
  settings: Settings,
  onChange: (next: Settings) => void,
  close: () => void
): HTMLElement {
  const panel = make('div');
  panel.id = 'settings-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'settings-title');
  panel.innerHTML = `
    <h3 id="settings-title">PARAMÈTRES</h3>
    <div class="settings-box">
      <h4>Audio</h4>
      <div class="settings-row">
        <label for="set-sfx">Bruits sonores</label>
        <select id="set-sfx">
          <option value="on" ${settings.sfx ? 'selected' : ''}>Activés</option>
          <option value="off" ${!settings.sfx ? 'selected' : ''}>Coupés</option>
        </select>
      </div>
      <div class="settings-row">
        <label for="set-music">Musique</label>
        <select id="set-music">
          <option value="on" ${settings.music ? 'selected' : ''}>Activée</option>
          <option value="off" ${!settings.music ? 'selected' : ''}>Coupée</option>
        </select>
      </div>
      <div class="settings-row">
        <label for="set-volume">Volume général</label>
        <input type="range" id="set-volume" min="0" max="100" value="${Math.round(settings.volume * 100)}">
      </div>
      <h4 style="margin-top:14px">Difficulté</h4>
      <div class="settings-row">
        <label for="set-difficulty">Niveau</label>
        <select id="set-difficulty">
          ${DIFFICULTY_ORDER.map(
            (id) => `<option value="${id}" ${settings.difficulty === id ? 'selected' : ''}>${DIFFICULTIES[id].label}</option>`
          ).join('')}
        </select>
      </div>
      <p class="settings-note" id="difficulty-hint">${DIFFICULTIES[settings.difficulty].hint}</p>

      <h4 style="margin-top:14px">Graphismes</h4>
      <div class="settings-row">
        <label for="set-graphics">Mode de rendu</label>
        <select id="set-graphics">
          <option value="2.5d" ${settings.graphics === '2.5d' ? 'selected' : ''}>2.5D (détaillé)</option>
          <option value="2d" ${settings.graphics === '2d' ? 'selected' : ''}>2D (performance)</option>
        </select>
      </div>
    </div>
    <p class="settings-note">2.5D : ombres portées, textures du terrain, éléments d'ambiance.<br>2D : rendu épuré, plus rapide sur petites configurations.</p>
    <button id="btn-settings-close" class="btn primary">Fermer</button>`;

  const read = (): Settings => ({
    sfx: panel.querySelector<HTMLSelectElement>('#set-sfx')?.value === 'on',
    music: panel.querySelector<HTMLSelectElement>('#set-music')?.value === 'on',
    volume: Number(panel.querySelector<HTMLInputElement>('#set-volume')?.value ?? 80) / 100,
    graphics: panel.querySelector<HTMLSelectElement>('#set-graphics')?.value === '2d' ? '2d' : '2.5d',
    difficulty: normalizeDifficulty(panel.querySelector<HTMLSelectElement>('#set-difficulty')?.value),
  });
  for (const id of ['#set-sfx', '#set-music', '#set-graphics']) {
    panel.querySelector(id)?.addEventListener('change', () => onChange(read()));
  }
  panel.querySelector('#set-volume')?.addEventListener('input', () => onChange(read()));
  panel.querySelector('#set-difficulty')?.addEventListener('change', () => {
    const hint = panel.querySelector<HTMLElement>('#difficulty-hint');
    if (hint) hint.textContent = DIFFICULTIES[normalizeDifficulty(
      panel.querySelector<HTMLSelectElement>('#set-difficulty')?.value
    )].hint;
    onChange(read());
  });
  panel.querySelector('#btn-settings-close')?.addEventListener('click', close);
  return panel;
}

export function buildPerksPanel(engine: Engine, close: () => void): HTMLElement {
  const panel = make('div');
  panel.id = 'meta-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'perks-title');

  const render = (): void => {
    const scroll = panel.scrollTop;
    const meta = engine.meta;
    const cards = PERK_DEFS.map((def) => {
      const level = meta.perks[def.id as PerkId];
      const maxed = level >= def.max;
      const cost = perkCost(level);
      const canBuy = !maxed && meta.points >= cost;
      const current = level * def.perLevel;
      const next = maxed ? current : (level + 1) * def.perLevel;
      return `<div class="perk-card">
        <div class="p-icon">${PERK_ICONS[def.id] ?? '⭐'}</div>
        <div class="p-name">${def.name}</div>
        <div class="p-desc">${def.desc}</div>
        <div class="p-val">Actuel : <b>+${current}${def.unit}</b>${maxed ? '' : ` → suivant : <b>+${next}${def.unit}</b>`}</div>
        <div class="p-lvl">Niveau ${level}/${def.max}</div>
        <button class="perk-buy" data-perk="${def.id}" ${canBuy ? '' : 'disabled'}>${maxed ? '★ Niveau max' : `Améliorer — ${cost} pts`}</button>
      </div>`;
    }).join('');
    panel.innerHTML = `<h3 id="perks-title">PERKS DE COMMANDEMENT</h3>
      <div class="meta-points">⭐ ${meta.points} points disponibles — record : vague ${meta.bestWave}/100</div>
      <div class="meta-list">${cards}</div>
      <div class="meta-help">
        <p><b>Comment gagner des points :</b> 1 point toutes les 2 vagues atteintes, +10 points bonus en fin de partie (victoire ou défaite).</p>
        <p><b>Comment ça marche :</b> les perks achetés s'appliquent à la prochaine partie. Les effets se cumulent par niveau.</p>
      </div>
      <div class="meta-actions">
        <button id="btn-respec" class="btn" data-respec>↺ Redistributionner (-20%)</button>
        <button id="btn-reset" class="btn danger" data-reset>⟲ Tout réinitialiser</button>
        <button id="btn-meta-close" class="btn primary" data-close>Fermer</button>
      </div>`;
    panel.scrollTop = scroll;
  };

  panel.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-close]')) {
      close();
      return;
    }
    const buy = target.closest<HTMLElement>('[data-perk]');
    if (buy) {
      const id = buy.dataset.perk as PerkId;
      const def = PERK_DEFS.find((p) => p.id === id);
      const level = engine.meta.perks[id];
      const cost = perkCost(level);
      if (def && level < def.max && engine.meta.points >= cost) {
        engine.meta.points -= cost;
        engine.meta.perks[id] = level + 1;
        saveMeta(engine.meta);
        render();
      }
      return;
    }
    if (target.closest('[data-respec]')) {
      const refund = respecPoints(engine.meta);
      if (refund > 0 && window.confirm(`Redistribuer vos perks ?\n\nVous récupérez ${refund} points (frais de 20%).\nLes perks s'appliqueront à la prochaine partie.`)) {
        engine.meta.points += refund;
        engine.meta.perks = { credits: 0, lives: 0, saber: 0, shield: 0 };
        saveMeta(engine.meta);
        render();
      }
      return;
    }
    if (target.closest('[data-reset]')) {
      if (window.confirm('Tout réinitialiser ?\n\nPoints, perks et record seront remis à zéro. Action irréversible.')) {
        engine.meta = resetAll();
        render();
      }
    }
  });

  render();
  return panel;
}

export function buildSectorPanel(onPick: (index: number) => void): HTMLElement {
  const pick = make('div');
  pick.id = 'sector-picker';
  pick.setAttribute('role', 'dialog');
  pick.setAttribute('aria-modal', 'true');
  const buttons = SECTORS.map(
    (sector, index) => `<button class="pick-btn" data-i="${index}">
      <span class="pick-name">${sector.name}</span>
      <span class="pick-sub">${sector.subtitle}</span>
    </button>`
  ).join('');
  pick.innerHTML = `<h3>Choisir un secteur</h3>
    <div class="pick-list">${buttons}</div>
    <p class="pick-note">Mode test : crédits bonus accordés selon le secteur</p>`;
  pick.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const btn = target.closest<HTMLElement>('.pick-btn');
    if (btn) {
      onPick(Number(btn.dataset.i));
      return;
    }
    if (target === pick) pick.remove();
  });
  return pick;
}

export function buildEndOverlay(kind: 'victory' | 'defeat', engine: Engine): HTMLElement {
  const overlay = make('div');
  overlay.id = 'overlay';
  const victory = kind === 'victory';
  overlay.innerHTML = `
    <${victory ? 'h1' : 'h2'}>${victory ? 'LA GALAXIE EST SAUVÉE' : 'BASE DÉTRUITE'}</${victory ? 'h1' : 'h2'}>
    <p class="subtitle">${victory ? 'Victoire totale' : 'Défaite'}</p>
    <p>${
      victory
        ? `Vous avez vaincu les ${engine.totalWaves} vagues sur les ${SECTORS.length} secteurs, avec ${engine.lives} vies restantes.`
        : `La flotte du Nova Empire a percé vos défenses à la vague ${engine.waveNumber} du ${SECTORS[engine.sectorIndex].name}.`
    }</p>
    <button id="btn-replay" class="btn primary">Rejouer</button>`;
  overlay.querySelector('#btn-replay')?.addEventListener('click', () => window.location.reload());
  return overlay;
}

let introTimers: number[] = [];

export function showSectorIntro(engine: Engine): void {
  introTimers.forEach((timer) => window.clearTimeout(timer));
  introTimers = [];
  document.querySelectorAll('#sector-intro').forEach((el) => el.remove());
  const sector = SECTORS[engine.sectorIndex];
  const intro = make('div');
  intro.id = 'sector-intro';
  intro.innerHTML = `<h2>${sector.name}</h2><p class="sub">${sector.subtitle}</p>`;
  document.getElementById('canvas-holder')?.appendChild(intro);
  introTimers.push(window.setTimeout(() => intro.classList.add('show'), 10));
  introTimers.push(
    window.setTimeout(() => {
      intro.classList.remove('show');
      introTimers.push(window.setTimeout(() => intro.remove(), 600));
    }, 3200)
  );
}
