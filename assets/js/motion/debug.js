/**
 * Overlay de depuração do movimento.
 *
 * Só liga com ?debug=motion na URL — nunca aparece em produção por acidente.
 * Mostra a trajetória, o alvo do scroll e o estado do foguete, que são os
 * números que realmente importam quando o movimento parece "errado" mas não
 * quebrado.
 */

import { onTick } from './ticker.js';
import { $ } from './env.js';

export function initDebug(rocket) {
  if (new URLSearchParams(location.search).get('debug') !== 'motion') return () => {};
  if (!rocket?.getState) return () => {};

  // Acesso programático ao estado, para inspeção no console e testes.
  window.__ejuvvMotion = rocket;

  const panel = document.createElement('div');
  panel.setAttribute('aria-hidden', 'true');
  panel.style.cssText = [
    'position:fixed', 'left:12px', 'bottom:12px', 'z-index:9999',
    'padding:10px 13px', 'border-radius:9px',
    'background:rgba(10,7,20,.88)', 'color:#aab5ee',
    'font:11px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace',
    'white-space:pre', 'pointer-events:none',
    'border:1px solid rgba(170,181,238,.28)',
  ].join(';');
  document.body.appendChild(panel);

  // Torna a trajetória visível enquanto se depura.
  const traj = $('#traj');
  const prevStroke = traj?.style.stroke;
  if (traj) traj.style.stroke = 'rgba(255,90,140,.55)';

  let frames = 0;
  let acc = 0;
  let fps = 0;

  const stop = onTick((dt) => {
    frames++;
    acc += dt;
    if (acc >= 0.5) {
      fps = Math.round(frames / acc);
      frames = 0;
      acc = 0;
    }

    const s = rocket.getState();
    if (!s) return;

    const bar = (v) => '█'.repeat(Math.round(Math.min(v, 1) * 12)).padEnd(12, '·');

    panel.textContent =
      `estado    ${s.state}\n` +
      `speed     ${bar(s.speed)} ${s.speed.toFixed(3)}\n` +
      `progress  ${s.progress.toFixed(4)}\n` +
      `alvo      ${s.target.toFixed(4)}\n` +
      `lag       ${(s.target - s.progress).toFixed(4)}\n` +
      `velocity  ${s.velocity.toFixed(3)}\n` +
      `ângulo    ${s.angle.toFixed(1)}°\n` +
      `pos       ${Math.round(s.x)}, ${Math.round(s.y)}\n` +
      `fps       ${fps}`;
  });

  return () => {
    stop();
    panel.remove();
    if (traj) traj.style.stroke = prevStroke ?? '';
  };
}
