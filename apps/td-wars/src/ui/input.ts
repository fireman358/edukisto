import { GRID_H, GRID_W } from '../game/config';
import type { Engine } from '../game/engine';
import type { Vec } from '../game/types';

export interface InputHandlers {
  /** Curseur/doigt déplacé. `pressed` vaut vrai quand le bouton est maintenu. */
  move: (pos: Vec, pressed: boolean) => void;
  /** Tap simple (relâchement sans glissement, sans appui long). */
  tap: (pos: Vec) => void;
  /** Sabre allumé / éteint. */
  saber: (active: boolean) => void;
  /** Vitesse du geste, pour le son de swing. */
  swing: (speed: number) => void;
  /** Clic droit / Échap sur le terrain : annule la sélection. */
  cancel: () => void;
}

export interface InputOptions {
  canvas: HTMLCanvasElement;
  engine: Engine;
  handlers: InputHandlers;
}

const TAP_SLOP = 12; // px, en espace logique
const HOLD_MS = 220; // appui long = sabre (tactile uniquement)

/**
 * Entrées unifiées en Pointer Events : un seul chemin de code pour la souris,
 * le doigt et le stylet.
 *
 * Tactile : un tap pose la tour, un appui long allume le sabre. Sans cette
 * distinction, maintenir le doigt pour viser déclenchait le sabre et le
 * placement n'était plus possible.
 */
export function bindInput({ canvas, engine, handlers }: InputOptions): () => void {
  let downPos: Vec | null = null;
  let moved = false;
  let lastPos: Vec | null = null;
  let lastSwing = 0;
  let holdTimer = 0;
  let holdFired = false;

  const toGrid = (event: PointerEvent): Vec => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * GRID_W,
      y: ((event.clientY - rect.top) / rect.height) * GRID_H,
    };
  };

  const saberOn = (): void => {
    engine.saberActive = true;
    handlers.saber(true);
  };

  const saberOff = (): void => {
    if (!engine.saberActive) return;
    engine.saberActive = false;
    handlers.saber(false);
  };

  const onDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    const pos = toGrid(event);
    downPos = pos;
    moved = false;
    holdFired = false;
    lastPos = pos;
    engine.saberPos = pos;
    if (event.pointerType === 'mouse') {
      saberOn();
    } else {
      // tactile : on temporise pour laisser la place au tap de construction
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => {
        holdFired = true;
        saberOn();
      }, HOLD_MS);
    }
    handlers.move(pos, true);
  };

  const onMove = (event: PointerEvent): void => {
    const pos = toGrid(event);
    const pressed = downPos !== null;
    if (pressed && downPos && Math.hypot(pos.x - downPos.x, pos.y - downPos.y) > TAP_SLOP) {
      moved = true;
      if (!holdFired) window.clearTimeout(holdTimer); // un glissement n'est pas un appui long
    }
    engine.saberPos = pos;
    if (pressed && lastPos) {
      const speed = Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y);
      const now = performance.now();
      if (speed > 40 && now - lastSwing > 250) {
        lastSwing = now;
        handlers.swing(speed);
      }
    }
    lastPos = pos;
    handlers.move(pos, pressed);
  };

  const endStroke = (event: PointerEvent, cancelled: boolean): void => {
    if (downPos === null) return;
    window.clearTimeout(holdTimer);
    const pos = toGrid(event);
    saberOff();
    engine.saberPos = pos;
    const wasTap = !cancelled && !moved && !holdFired;
    downPos = null;
    lastPos = null;
    holdFired = false;
    if (wasTap) handlers.tap(pos);
  };

  const onUp = (event: PointerEvent): void => endStroke(event, false);
  const onCancel = (event: PointerEvent): void => endStroke(event, true);

  const onLeave = (): void => {
    if (downPos === null) handlers.move({ x: -100, y: -100 }, false);
  };

  const onContext = (event: MouseEvent): void => {
    event.preventDefault();
    handlers.cancel();
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('contextmenu', onContext);

  return () => {
    window.clearTimeout(holdTimer);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('contextmenu', onContext);
  };
}
