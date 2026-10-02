/**
 * Contagem progressiva dos indicadores.
 * Preserva o formato original de cada valor: "4,4" mantém a vírgula decimal,
 * "+231" mantém o prefixo, "48" permanece inteiro.
 */

import { animate } from '../vendor/anime.esm.min.js';
import { $$, observeOnce, prefersReducedMotion } from './env.js';

/** "+231" → { prefix: "+", value: 231, decimals: 0 } */
function parseValue(raw) {
  const text = String(raw).trim();
  const match = text.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!match) return null;

  const [, prefix, digits, suffix] = match;
  const normalized = digits.replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  const decimals = digits.includes(',') ? digits.split(',')[1].length : 0;
  return { prefix, value, decimals, suffix };
}

function format(value, { prefix, decimals, suffix }) {
  const body = value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${body}${suffix}`;
}

/**
 * Anima um elemento de 0 até o valor lido de data-count (ou do próprio texto).
 * O valor final fica sempre no atributo aria-label para leitores de tela.
 */
export function counter(targets, options = {}) {
  const els = typeof targets === 'string' ? $$(targets) : [].concat(targets).filter(Boolean);
  if (!els.length) return { revert() {} };

  const { duration = 1600, ease = 'out(3)', threshold = 0.35 } = options;

  const items = els
    .map((el) => {
      const raw = el.dataset.count ?? el.textContent;
      const parsed = parseValue(raw);
      if (!parsed) return null;
      el.setAttribute('aria-label', raw.trim());
      return { el, parsed, final: raw.trim() };
    })
    .filter(Boolean);

  if (prefersReducedMotion()) {
    items.forEach(({ el, final }) => (el.textContent = final));
    return { revert() {} };
  }

  items.forEach(({ el, parsed }) => (el.textContent = format(0, parsed)));

  const stop = observeOnce(
    items.map((i) => i.el),
    (el) => {
      const item = items.find((i) => i.el === el);
      if (!item) return;
      const state = { n: 0 };
      animate(state, {
        n: item.parsed.value,
        duration,
        ease,
        onUpdate: () => {
          el.textContent = format(state.n, item.parsed);
        },
        onComplete: () => {
          el.textContent = item.final;
        },
      });
    },
    { threshold }
  );

  return { revert: stop };
}

/**
 * Timeline de processo: acende as etapas em sequência e move a barra de
 * progresso via a custom property --progress.
 */
export function processTimeline(root, { stepDelay = 520 } = {}) {
  const el = typeof root === 'string' ? document.querySelector(root) : root;
  if (!el) return { revert() {} };

  const steps = $$('.t-step', el);
  if (!steps.length) return { revert() {} };

  const light = (index) => {
    steps.slice(0, index + 1).forEach((s) => s.classList.add('is-on'));
    el.style.setProperty('--progress', String((index + 1) / steps.length));
  };

  if (prefersReducedMotion()) {
    light(steps.length - 1);
    return { revert() {} };
  }

  const timers = [];
  const stop = observeOnce(
    el,
    () => {
      steps.forEach((_, i) => timers.push(setTimeout(() => light(i), 200 + i * stepDelay)));
    },
    { threshold: 0.3 }
  );

  return {
    revert() {
      timers.forEach(clearTimeout);
      stop();
    },
  };
}
