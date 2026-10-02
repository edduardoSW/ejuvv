/**
 * Abertura do hero — montagem e lançamento.
 *
 * As peças do foguete entram espalhadas e se encaixam com mola, na ordem em
 * que a coisa seria realmente construída: chassi, propulsor, aletas, ogiva e
 * por fim a escotilha. Cada peça chega com um overshoot pequeno e assenta —
 * é o encaixe, não o deslize, que dá a sensação de peso.
 *
 * A montagem escreve transform apenas nas PEÇAS (.r-part). O transform de
 * #rocket pertence ao integrador de física e o de #r-craft à deformação de
 * velocidade; escrever em qualquer um dos dois aqui cancelaria a trajetória.
 */

import { createTimeline, createSpring, stagger, utils } from '../vendor/anime.esm.min.js';
import { $, $$, prefersReducedMotion } from './env.js';

/** Onde cada peça começa antes de se encaixar. */
const SCATTER = [
  { sel: '#r-body', x: 0, y: 26, rotate: 0, scale: 0.72, at: 0 },
  { sel: '#r-thruster', x: 0, y: 34, rotate: 0, scale: 0.8, at: 90 },
  { sel: '#r-fin-l', x: -34, y: 14, rotate: -46, scale: 0.7, at: 170 },
  { sel: '#r-fin-r', x: 34, y: 14, rotate: 46, scale: 0.7, at: 170 },
  { sel: '#r-nose', x: 0, y: -32, rotate: 0, scale: 0.78, at: 280 },
  { sel: '#r-window', x: 0, y: 0, rotate: 0, scale: 0, at: 400 },
];

const TEXT = ['.brand', '.hero h1', '.hero-copy > p', '.hero .button-row .btn', '.hero-coord'];

export function playHeroIntro(rocket) {
  const rocketEl = $('#rocket');
  const parts = SCATTER.map((p) => ({ ...p, el: $(p.sel) })).filter((p) => p.el);

  if (prefersReducedMotion()) {
    utils.set(TEXT.flatMap((s) => $$(s)), { opacity: 1, y: 0 });
    utils.set('.hero-ring', { opacity: 1, scale: 1 });
    if (rocketEl) rocketEl.style.opacity = '1';
    parts.forEach((p) => utils.set(p.el, { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }));
    rocket?.ignite();
    return null;
  }

  /* ---------- estados iniciais ---------- */
  utils.set(TEXT.flatMap((s) => $$(s)), { opacity: 0, y: 20 });
  utils.set('.hero-ring', { opacity: 0, scale: 0.84 });
  parts.forEach((p) =>
    utils.set(p.el, { opacity: 0, x: p.x, y: p.y, rotate: p.rotate, scale: p.scale })
  );

  // Molas distintas: peças pesadas assentam firmes, leves têm um quique a mais.
  const heavy = createSpring({ stiffness: 78, damping: 13 });
  const light = createSpring({ stiffness: 116, damping: 11 });
  const snap = createSpring({ stiffness: 150, damping: 10 });

  const tl = createTimeline({ defaults: { ease: 'out(3)', duration: 720 } });

  /* ---------- texto ---------- */
  tl.add('.brand', { opacity: [0, 1], y: [14, 0], duration: 560 }, 80)
    .add('.hero h1', { opacity: [0, 1], y: [24, 0] }, 180)
    .add('.hero-copy > p', { opacity: [0, 1], y: [18, 0] }, 340)
    .add('.hero .button-row .btn', { opacity: [0, 1], y: [16, 0], delay: stagger(80) }, 480)
    .add(
      '.hero-ring',
      { opacity: [0, 1], scale: [0.84, 1], duration: 1500, delay: stagger(130), ease: 'out(4)' },
      420
    );

  /* ---------- montagem do foguete ---------- */
  const assemblyStart = 620;
  tl.add(rocketEl, { opacity: [0, 1], duration: 320, ease: 'out(2)' }, assemblyStart);

  for (const part of parts) {
    const isWindow = part.sel === '#r-window';
    tl.add(
      part.el,
      {
        opacity: [0, 1],
        x: [part.x, 0],
        y: [part.y, 0],
        rotate: [part.rotate, 0],
        scale: [part.scale, 1],
        duration: isWindow ? 640 : 900,
        ease: isWindow ? snap : part.sel === '#r-nose' ? light : heavy,
      },
      assemblyStart + part.at
    );
  }

  /* ---------- ignição ---------- */
  tl.add('.hero-coord', { opacity: [0, 1], y: [10, 0], delay: stagger(110) }, 1180)
    .call(() => rocket?.ignite(), assemblyStart + 560);

  return tl;
}
