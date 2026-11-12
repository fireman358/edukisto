import type { Engine } from '../game/engine';

export type ModalKind = 'help' | 'settings' | 'perks' | 'sector' | 'over';

interface ModalEntry {
  kind: ModalKind;
  node: HTMLElement;
  /** Un écran de fin ne se ferme pas à la volée : il n'y a rien à reprendre. */
  sticky: boolean;
  onClose?: () => void;
}

/**
 * Gestionnaire unique des panneaux : exclusivité, pause du jeu, Échap, focus.
 * Remplace les cinq blocs « getElementById(...) ? remove() : show() » qui
 * laissaient plusieurs panneaux s'empiler et le jeu continuer derrière.
 */
export class Modals {
  private current: ModalEntry | null = null;

  constructor(
    private engine: Engine,
    private root: HTMLElement,
    private onPauseChange: (paused: boolean) => void = () => {}
  ) {
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (this.current && !this.current.sticky) {
        event.preventDefault();
        this.close();
      }
    });
    document.addEventListener('visibilitychange', () => this.sync());
    this.sync();
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  is(kind: ModalKind): boolean {
    return this.current?.kind === kind;
  }

  /** Ouvre un panneau en fermant le précédent (exclusivité). */
  show(kind: ModalKind, node: HTMLElement, opts: { sticky?: boolean; onClose?: () => void } = {}): void {
    this.close();
    this.current = { kind, node, sticky: opts.sticky ?? false, onClose: opts.onClose };
    this.root.appendChild(node);
    const focusable = node.querySelector<HTMLElement>('button, input, select');
    focusable?.focus({ preventScroll: true });
    this.sync();
  }

  /** Bascule un panneau : pratique pour les boutons du HUD. */
  toggle(kind: ModalKind, build: () => HTMLElement): void {
    if (this.is(kind)) {
      this.close();
      return;
    }
    this.show(kind, build());
  }

  close(): void {
    const entry = this.current;
    if (!entry) return;
    this.current = null;
    entry.node.remove();
    entry.onClose?.();
    this.sync();
  }

  private sync(): void {
    const paused = this.current !== null || document.hidden;
    this.engine.paused = paused;
    this.onPauseChange(paused);
  }
}
