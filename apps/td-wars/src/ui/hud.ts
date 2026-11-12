import { ALL_WAVES, BUILD_ORDER, SECTORS, TOWERS } from '../game/config';
import { DIFFICULTIES } from '../game/difficulty';
import type { Engine } from '../game/engine';
import { TARGET_LABELS, type Tower } from '../game/tower';
import type { TowerKindId } from '../game/types';
import { make, mustGet } from './dom';
import { attributeLabel, drawTowerIcon, shortName } from './icons';

const ENEMY_SHORT: Record<string, string> = {
  drone: '🛸 Sonde',
  soldier: '🪖 Trooper',
  fighter: '✈️ Chasseur',
  tank: '🛻 Char',
  walker: '🦵 Marcheur',
  stealth: '👻 Furtif',
  healer: '✚ Régén.',
  destroyer: '🚀 Destroyer',
};

interface BuildEntry {
  id: TowerKindId;
  btn: HTMLButtonElement;
  name: HTMLSpanElement;
  attr: HTMLSpanElement;
  cost: HTMLSpanElement;
  unlocked: boolean | null;
}

export interface HudHandlers {
  onSelectBuild: (id: TowerKindId | null) => void;
  onSelectTower: (tower: Tower | null) => void;
}

/**
 * HUD incrémental : les nœuds sont créés une fois et seules les valeurs qui
 * changent sont réécrites. L'ancienne version reconstruisait la barre de
 * construction entière (8 boutons + 8 canvas + 8 icônes) à chaque kill.
 */
export class Hud {
  private elCredits = mustGet<HTMLSpanElement>('credits');
  private elLives = mustGet<HTMLSpanElement>('lives');
  private elShield = mustGet<HTMLSpanElement>('shield');
  private elShieldStat = mustGet<HTMLSpanElement>('shield-stat');
  private elWave = mustGet<HTMLSpanElement>('wave');
  private elSector = mustGet<HTMLSpanElement>('sector');
  private elSaberFill = mustGet<HTMLSpanElement>('saber-fill');
  private btnStart = mustGet<HTMLButtonElement>('btn-start');
  private btnSpeed = mustGet<HTMLButtonElement>('btn-speed');
  private buildBar = mustGet<HTMLDivElement>('build-bar');
  private infoPanel = mustGet<HTMLDivElement>('info-panel');
  private sidePanel = mustGet<HTMLElement>('side-panel');
  private wavePreview: HTMLDivElement;

  private entries: BuildEntry[] = [];
  private textCache = new Map<string, string>();
  private previewWave = -2;
  private selection: TowerKindId | null = null;
  private selected: Tower | null = null;
  private toastTimer = 0;
  private recapTimer = 0;

  constructor(private engine: Engine, private handlers: HudHandlers) {
    this.wavePreview = make('div');
    this.wavePreview.id = 'wave-preview';
    this.sidePanel.appendChild(this.wavePreview);
    this.buildBuildBar();
    this.infoPanel.addEventListener('click', (event) => this.onInfoClick(event));
    this.btnStart.addEventListener('click', () => {
      this.engine.startWave();
      this.refresh();
    });
  }

  get buildSelection(): TowerKindId | null {
    return this.selection;
  }

  get towerSelection(): Tower | null {
    return this.selected;
  }

  /** Écrit une valeur seulement si elle a changé (évite les invalidations inutiles). */
  private setText(el: HTMLElement, key: string, value: string): void {
    if (this.textCache.get(key) === value) return;
    this.textCache.set(key, value);
    el.textContent = value;
  }

  private buildBuildBar(): void {
    const fragment = document.createDocumentFragment();
    for (const id of BUILD_ORDER) {
      const kind = TOWERS[id];
      const btn = make('button', 'build-btn');
      btn.type = 'button';
      const icon = document.createElement('canvas');
      icon.className = 'build-icon';
      icon.width = 44;
      icon.height = 44;
      drawTowerIcon(icon, id, kind.accent);
      const name = make('span', 'name');
      const attr = make('span', 'attr');
      const cost = make('span', 'cost');
      btn.append(icon, name, attr, cost);
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleBuild(id);
      });
      fragment.appendChild(btn);
      this.entries.push({ id, btn, name, attr, cost, unlocked: null });
    }
    this.buildBar.replaceChildren(fragment);
  }

  private toggleBuild(id: TowerKindId): void {
    const kind = TOWERS[id];
    if (!this.engine.isUnlocked(id)) {
      this.engine.sfx.error();
      return;
    }
    if (this.engine.credits < kind.levels[0].cost) {
      this.engine.sfx.error();
      return;
    }
    this.selectBuild(this.selection === id ? null : id);
  }

  selectBuild(id: TowerKindId | null): void {
    this.selection = id;
    if (id) this.hideTower();
    this.handlers.onSelectBuild(id);
    this.updateBuildBar();
  }

  private updateBuildBar(): void {
    for (const entry of this.entries) {
      const kind = TOWERS[entry.id];
      const unlocked = this.engine.isUnlocked(entry.id);
      const affordable = this.engine.credits >= kind.levels[0].cost;
      entry.btn.classList.toggle('locked', !unlocked || !affordable);
      entry.btn.classList.toggle('selected', this.selection === entry.id);
      entry.btn.setAttribute('aria-pressed', String(this.selection === entry.id));
      if (entry.unlocked === unlocked) continue;
      entry.unlocked = unlocked;
      entry.name.textContent = unlocked ? shortName(kind.name) : `🔒 Secteur ${kind.unlockSector + 1}`;
      entry.name.style.color = unlocked ? kind.color : '#667';
      entry.attr.textContent = unlocked ? attributeLabel(kind) : '';
      entry.cost.textContent = unlocked ? `${kind.levels[0].cost} cr` : '';
      entry.btn.title = unlocked
        ? `${kind.name} (T${kind.tier}) — ${kind.desc}`
        : `${kind.name} — débloqué au secteur ${kind.unlockSector + 1}`;
      entry.btn.setAttribute('aria-label', unlocked ? kind.name : `${kind.name}, verrouillé`);
    }
  }

  /** Mise à jour légère : ressources + accessibilité des armes (appelée à chaque kill). */
  refreshResources(): void {
    const e = this.engine;
    this.setText(this.elCredits, 'credits', String(Math.round(e.credits)));
    this.setText(this.elLives, 'lives', String(e.lives));
    if (e.maxShield > 0) {
      this.elShieldStat.style.display = '';
      this.setText(this.elShield, 'shield', `${e.shield}/${e.maxShield}`);
    } else {
      this.elShieldStat.style.display = 'none';
    }
    this.updateBuildBar();
  }

  /** Rafraîchissement complet, appelé 4×/s et sur changement d'état. */
  refresh(): void {
    const e = this.engine;
    // une tour peut disparaître sans passer par l'UI (changement de secteur,
    // reprise de partie) : on ne garde jamais une sélection fantôme
    if (this.selected && !e.towers.includes(this.selected)) this.hideTower();
    this.refreshResources();
    this.setText(this.elWave, 'wave', `${e.waveNumber}/${e.totalWaves}`);
    this.setText(this.elSector, 'sector', `${SECTORS[e.sectorIndex].name} · ${DIFFICULTIES[e.difficulty].label}`);
    this.setText(this.btnSpeed, 'speed', `x${e.speed}`);

    const next = ALL_WAVES[e.waveIndex + 1];
    if (e.autoTimer >= 0) {
      this.setText(this.btnStart, 'start', `⏩ ${Math.ceil(e.autoTimer)}s (+${Math.ceil(e.autoTimer * 0.6 * 4)} cr)`);
      this.btnStart.disabled = false;
    } else if (next) {
      this.setText(this.btnStart, 'start', `Lancer la vague ${e.waveNumber + 1}`);
      this.btnStart.disabled = !e.canStartWave();
    } else {
      this.setText(this.btnStart, 'start', '—');
      this.btnStart.disabled = true;
    }

    const energy = e.saberMax > 0 ? Math.max(0, Math.min(1, e.saberEnergy / e.saberMax)) : 0;
    this.elSaberFill.style.transform = `scaleX(${energy.toFixed(3)})`;

    this.updateBuildBar();
    if (this.previewWave !== e.waveIndex) {
      this.previewWave = e.waveIndex;
      this.refreshWavePreview();
    }
    if (this.selected) this.renderTowerPanel(this.selected);
  }

  private refreshWavePreview(): void {
    const next = ALL_WAVES[this.engine.waveIndex + 1];
    if (!next) {
      this.wavePreview.innerHTML = '<h4>Vague suivante</h4><p class="wp-empty">—</p>';
      return;
    }
    const counts = new Map<string, number>();
    for (const group of next.groups) counts.set(group.id, (counts.get(group.id) ?? 0) + group.count);
    const rows = [...counts.entries()]
      .map(([id, n]) => `<div class="wp-row"><span>${ENEMY_SHORT[id] ?? id}</span><b>×${n}</b></div>`)
      .join('');
    this.wavePreview.innerHTML = `<h4>Vague ${this.engine.waveNumber + 1} — ${next.name}</h4>
      <div class="wp-entries">${next.entries > 1 ? `⚠️ ${next.entries} entrées simultanées` : '1 entrée'}</div>
      ${rows}
      <div class="wp-reward">Récompense : +${Math.round(next.reward * this.engine.difficultyLevel.reward)} cr</div>`;
  }

  showTower(tower: Tower): void {
    this.selected = tower;
    this.handlers.onSelectTower(tower);
    if (this.infoPanel.parentElement !== this.sidePanel) this.sidePanel.appendChild(this.infoPanel);
    this.infoPanel.style.display = 'block';
    this.renderTowerPanel(tower);
  }

  hideTower(): void {
    this.selected = null;
    this.handlers.onSelectTower(null);
    this.infoPanel.style.display = 'none';
  }

  /** Garde le panneau à jour après une action (le moteur émet `info`). */
  refreshTowerPanel(): void {
    if (this.selected) this.renderTowerPanel(this.selected);
  }

  private renderTowerPanel(tower: Tower): void {
    const kind = TOWERS[tower.id];
    const stats = tower.stats;
    let upgrade: string;
    if (tower.canUpgrade()) {
      upgrade = `<button class="btn primary" data-act="up">Améliorer ${tower.upgradeCost()} cr</button>`;
    } else if (tower.canSpec()) {
      const specs = kind.specs ?? [];
      upgrade = `<div class="spec-choice">
        <button class="btn primary" data-act="spec0" title="${specs[0]?.desc ?? ''}">${specs[0]?.name ?? ''}</button>
        <button class="btn" data-act="spec1" title="${specs[1]?.desc ?? ''}">${specs[1]?.name ?? ''}</button>
      </div>`;
    } else if (tower.spec) {
      upgrade = `<span style="color:#7de64f">★ ${tower.spec.name}</span>`;
    } else {
      upgrade = '<span style="color:#ffd23f">Niveau max</span>';
    }

    const rows = kind.kind === 'income'
      ? `<div class="row"><span class="k">Revenu</span><span>${stats.income ?? 0} cr/s</span></div>`
      : `<div class="row"><span class="k">Dégâts</span><span>${Math.round(stats.damage)}</span></div>
        <div class="row"><span class="k">Portée</span><span>${Math.round(stats.range)}${this.engine.hasAdjacencyBonus(tower) ? ' <b style="color:#6fe08a">(+10% adj.)</b>' : ''}</span></div>
        <div class="row"><span class="k">Cadence</span><span>${Math.round(stats.fireRate * 10) / 10}/s</span></div>
        ${kind.kind === 'splash' ? `<div class="row"><span class="k">Zone</span><span>${Math.round(stats.splashRadius)}</span></div>` : ''}
        ${kind.kind === 'slow' ? `<div class="row"><span class="k">Ralentit</span><span>x${Math.round(stats.slowFactor * 100) / 100}</span></div>` : ''}
        ${kind.kind === 'chain' ? `<div class="row"><span class="k">Chaîne</span><span>${stats.chainTargets}</span></div>` : ''}
        <div class="row"><span class="k">Cible</span><button class="btn" data-act="target" style="padding:2px 8px;font-size:11px">${TARGET_LABELS[tower.targetMode]}</button></div>`;

    this.infoPanel.innerHTML = `
      <h3>${kind.name} — Nv ${tower.level + 1}</h3>
      <div class="actions">
        ${upgrade}
        <button class="btn" data-act="sell">Vendre ${tower.sellValue()} cr</button>
      </div>
      ${rows}`;
  }

  private onInfoClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const button = target.closest('[data-act]');
    if (!button) return;
    event.stopPropagation();
    const tower = this.selected;
    if (!tower) return;
    const action = button.getAttribute('data-act');
    if (action === 'up') this.engine.upgradeTower(tower);
    else if (action === 'spec0') this.engine.buySpec(tower, 0);
    else if (action === 'spec1') this.engine.buySpec(tower, 1);
    else if (action === 'target') this.engine.cycleTargetMode(tower);
    else if (action === 'sell') {
      this.engine.sellTower(tower);
      this.hideTower();
      return;
    }
    if (this.engine.towers.includes(tower)) this.renderTowerPanel(tower);
    else this.hideTower();
  }

  /** Bandeau éphémère (reprise de partie, information). */
  notice(message: string, ms = 3200): void {
    let node = document.getElementById('toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'toast';
      node.setAttribute('role', 'status');
      document.getElementById('canvas-holder')?.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => node?.classList.remove('show'), ms);
  }

  /**
   * Récapitulatif de fin de vague : c'est le seul moment où le joueur voit
   * ce que sa défense a réellement produit.
   */
  recap(wave: number, stats: { reward: number; kills: number; leaks: number; early: number }): void {
    let node = document.getElementById('wave-recap');
    if (!node) {
      node = document.createElement('div');
      node.id = 'wave-recap';
      node.setAttribute('role', 'status');
      document.getElementById('canvas-holder')?.appendChild(node);
    }
    node.innerHTML = `
      <h4>Vague ${wave} terminée</h4>
      <div class="wr-row"><span>Récompense</span><b class="ok">+${stats.reward} cr</b></div>
      <div class="wr-row"><span>Ennemis abattus</span><b>${stats.kills}</b></div>
      <div class="wr-row"><span>Fuites</span><b class="${stats.leaks > 0 ? 'bad' : 'ok'}">${stats.leaks}</b></div>
      ${stats.early > 0 ? `<div class="wr-row"><span>Bonus d'avance</span><b class="ok">+${stats.early} cr</b></div>` : ''}`;
    node.classList.remove('show');
    // force le redémarrage de l'animation si deux vagues s'enchaînent
    void node.offsetWidth;
    node.classList.add('show');
    window.clearTimeout(this.recapTimer);
    this.recapTimer = window.setTimeout(() => node?.classList.remove('show'), 3600);
  }
}
