/**
 * Ambiente de motion — autoridade única sobre preferências e medições.
 *
 * O anime.js escreve `transform` inline, o que a regra CSS de
 * prefers-reduced-motion não consegue deter. Todo módulo de motion precisa
 * consultar `prefersReducedMotion()` antes de animar.
 */

const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
const coarseQuery = matchMedia('(max-width: 767px)');

export const prefersReducedMotion = () => reduceQuery.matches;
export const isCoarse = () => coarseQuery.matches;

/** Reexecuta `fn` quando qualquer uma das preferências muda. */
export function onEnvChange(fn) {
  reduceQuery.addEventListener('change', fn);
  coarseQuery.addEventListener('change', fn);
  return () => {
    reduceQuery.removeEventListener('change', fn);
    coarseQuery.removeEventListener('change', fn);
  };
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function debounce(fn, wait = 150) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

/**
 * Observa a entrada de elementos no viewport e dispara `fn(el)` uma vez.
 * Centraliza o IntersectionObserver para que reveals, contadores e a
 * timeline não criem observers redundantes com as mesmas opções.
 */
export function observeOnce(targets, fn, { threshold = 0.2, rootMargin = '0px' } = {}) {
  const els = Array.isArray(targets) ? targets : [targets];
  if (!els.length) return () => {};

  if (!('IntersectionObserver' in window)) {
    els.forEach(fn);
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        fn(entry.target);
      }
    },
    { threshold, rootMargin }
  );

  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * Bateladas de leitura de layout. Toda medição de geometria passa por aqui
 * para nunca ocorrer dentro de um callback de update de animação.
 */
export function measure(fn) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve(fn()));
  });
}

/** Espera fontes e imagens antes de medir geometria dependente de layout. */
export function whenSettled() {
  const tasks = [];

  if (document.fonts?.ready) tasks.push(document.fonts.ready);

  if (document.readyState !== 'complete') {
    tasks.push(new Promise((r) => window.addEventListener('load', r, { once: true })));
  }

  return Promise.all(tasks).catch(() => {});
}
