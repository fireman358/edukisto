/**
 * Icônes de la barre de construction, dessinées une seule fois dans un canvas
 * de 44×44 (l'ancienne barre les redessinait à chaque rafraîchissement du HUD).
 */
export function drawTowerIcon(cv: HTMLCanvasElement, id: string, accent: string): void {
  const c = cv.getContext('2d');
  if (!c) return;
  c.clearRect(0, 0, 44, 44);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.ellipse(23, 32, 13, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1a2436';
  c.strokeStyle = 'rgba(120,160,220,0.6)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(22, 24, 10, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.save();
  c.translate(22, 24);
  c.rotate(-Math.PI / 4);
  c.fillStyle = '#2b3a52';
  switch (id) {
    case 'plasma':
      c.fillRect(0, -3, 15, 6);
      c.fillStyle = accent;
      c.fillRect(12, -2, 4, 4);
      break;
    case 'ion':
      c.beginPath(); c.arc(6, 0, 6, 0, Math.PI * 2); c.fillStyle = '#1f3a3f'; c.fill();
      c.fillStyle = accent;
      c.beginPath(); c.arc(12, 0, 3, 0, Math.PI * 2); c.fill();
      break;
    case 'missile':
      c.fillRect(-3, -8, 12, 16);
      c.fillStyle = accent;
      for (const dy of [-5, 0, 5]) c.fillRect(6, dy - 1, 8, 2);
      break;
    case 'laser':
      c.fillRect(-2, -5, 18, 10);
      c.fillStyle = accent;
      c.fillRect(13, -1.5, 6, 3);
      break;
    case 'tesla':
      c.beginPath(); c.arc(3, 0, 7, 0, Math.PI * 2); c.fillStyle = '#2c1f3a'; c.fill();
      c.strokeStyle = accent; c.lineWidth = 1.5;
      c.beginPath(); c.arc(3, 0, 4.5, 0, 2); c.stroke();
      c.beginPath(); c.arc(3, 0, 4.5, 3, 5); c.stroke();
      break;
    case 'rail':
      c.fillRect(-2, -6, 18, 12);
      c.fillStyle = accent;
      c.fillRect(14, -1.5, 6, 3);
      c.strokeStyle = 'rgba(191,230,255,0.7)';
      c.beginPath(); c.moveTo(2, -4); c.lineTo(16, -4); c.moveTo(2, 4); c.lineTo(16, 4); c.stroke();
      break;
    case 'tractor':
      c.fillRect(-2, -5, 16, 10);
      c.strokeStyle = accent; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(10, -4); c.lineTo(18, -1); c.stroke();
      c.beginPath(); c.moveTo(10, 4); c.lineTo(18, 1); c.stroke();
      break;
    case 'axial':
      c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fillStyle = '#1e2a1a'; c.fill();
      c.fillRect(4, -8, 14, 16);
      c.fillStyle = accent;
      c.beginPath(); c.arc(17, 0, 3, 0, Math.PI * 2); c.fill();
      break;
    default:
      c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fillStyle = '#2a2f38'; c.fill();
      c.strokeStyle = accent;
      c.beginPath(); c.arc(0, 0, 11, 0, 2); c.stroke();
      c.fillStyle = accent;
      c.beginPath(); c.arc(0, 0, 2.5, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** Libellé court affiché sous le nom, selon le rôle de l'arme. */
export function attributeLabel(kind: { kind: string; levels: { damage: number; income?: number }[] }): string {
  const first = kind.levels[0];
  switch (kind.kind) {
    case 'income':
      return `+${first.income ?? 0} cr/s`;
    case 'splash':
      return `${Math.round(first.damage)} dmg · zone`;
    case 'slow':
      return `${Math.round(first.damage)} dmg · ralentit`;
    case 'chain':
      return `${Math.round(first.damage)} dmg · chaîne`;
    default:
      return `${Math.round(first.damage)} dmg`;
  }
}

/** Nom raccourci pour tenir dans une carte de 108 px. */
export function shortName(name: string): string {
  return name.replace(' de moindal', '').replace(' à proton', '').replace(' léger', '');
}
