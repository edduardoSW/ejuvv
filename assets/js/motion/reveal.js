/**
 * Entradas progressivas de elementos ao entrar no viewport.
 * Todo elemento com [data-reveal] começa em opacity:0 (via motion.css, e só
 * quando o JS está ativo) e é revelado uma única vez.
 */

import { animate, stagger, utils } from '../vendor/anime.esm.min.js';
import { $$, observeOnce, prefersReducedMotion } from './env.js';

const DEFAULTS = {
  y: 28,
  x: 0,
  scale: 1,
  duration: 700,
  ease: 'out(3)',
  threshold: 0.18,
  delay: 0,
};

function settle(els) {
  utils.set(els, { opacity: 1, x: 0, y: 0, scale: 1 });
  els.forEach((el) => el.classList.add('is-revealed'));
}

/** Revela um ou mais elementos de forma independente. */
export function reveal(targets, options = {}) {
  const els = typeof targets === 'string' ? $$(targets) : [].concat(targets).filter(Boolean);
  if (!els.length) return { revert() {} };

  const opts = { ...DEFAULTS, ...options };

  if (prefersReducedMotion()) {
    settle(els);
    return { revert() {} };
  }

  utils.set(els, {
    opacity: 0,
    y: opts.y,
    x: opts.x,
    scale: opts.scale === 1 ? 1 : opts.scale,
  });

  const stop = observeOnce(
    els,
    (el) => {
      animate(el, {
        opacity: [0, 1],
        y: [opts.y, 0],
        x: [opts.x, 0],
        scale: opts.scale === 1 ? undefined : [opts.scale, 1],
        duration: opts.duration,
        delay: opts.delay,
        ease: opts.ease,
        onComplete: () => el.classList.add('is-revealed'),
      });
    },
    { threshold: opts.threshold }
  );

  return { revert: stop };
}

/**
 * Revela um grupo em coreografia: o grupo inteiro dispara quando o primeiro
 * elemento entra no viewport, com atraso escalonado entre os itens.
 */
export function staggerReveal(targets, options = {}) {
  const els = typeof targets === 'string' ? $$(targets) : [].concat(targets).filter(Boolean);
  if (!els.length) return { revert() {} };

  const { each = 90, from = 0, ...rest } = options;
  const opts = { ...DEFAULTS, ...rest };

  if (prefersReducedMotion()) {
    settle(els);
    return { revert() {} };
  }

  utils.set(els, { opacity: 0, y: opts.y, x: opts.x });

  const stop = observeOnce(
    els[0],
    () => {
      animate(els, {
        opacity: [0, 1],
        y: [opts.y, 0],
        x: [opts.x, 0],
        duration: opts.duration,
        ease: opts.ease,
        delay: stagger(each, { start: opts.delay, from }),
        onComplete: () => els.forEach((el) => el.classList.add('is-revealed')),
      });
    },
    { threshold: opts.threshold }
  );

  return { revert: stop };
}

/**
 * Aplica reveals a partir dos atributos do HTML, sem precisar registrar
 * cada seletor no JS da página:
 *   data-reveal            → reveal simples
 *   data-reveal="stagger"  → agrupa por [data-reveal-group]
 *   data-reveal-delay="200"
 */
export function autoReveal(root = document) {
  const groups = new Map();
  const singles = [];

  $$('[data-reveal]', root).forEach((el) => {
    const group = el.dataset.revealGroup;
    if (el.dataset.reveal === 'stagger' && group) {
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(el);
    } else {
      singles.push(el);
    }
  });

  singles.forEach((el) =>
    reveal(el, {
      delay: Number(el.dataset.revealDelay) || 0,
      y: el.dataset.revealY ? Number(el.dataset.revealY) : undefined,
    })
  );

  groups.forEach((els) =>
    staggerReveal(els, {
      each: Number(els[0].dataset.revealEach) || 90,
      delay: Number(els[0].dataset.revealDelay) || 0,
    })
  );
}
