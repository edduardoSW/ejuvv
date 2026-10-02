/**
 * Microinterações com sensação física.
 *
 * Tudo aqui compartilha a mesma linguagem do foguete: nada salta para o valor
 * final, tudo é puxado por mola. Um botão que volta com o mesmo amortecimento
 * do foguete faz a interface inteira parecer um sistema só.
 *
 * Nenhuma geometria é lida por frame. O retângulo do elemento é medido uma vez
 * no pointerenter e reaproveitado enquanto o cursor estiver dentro — ler
 * getBoundingClientRect no tick causaria layout thrashing.
 */

import { $$, prefersReducedMotion } from './env.js';
import { onTick } from './ticker.js';
import { Spring, clamp, damp } from './physics.js';

const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Botões magnéticos: o elemento se desloca alguns pixels na direção do cursor
 * e volta com mola ao sair. O deslocamento é limitado — o botão sugere atração,
 * não persegue o mouse.
 */
export function initMagnetic(selector = '[data-magnetic]', { strength = 0.28, max = 10 } = {}) {
  const els = $$(selector);
  if (!els.length || !finePointer() || prefersReducedMotion()) return () => {};

  const items = els.map((el) => ({
    el,
    rect: null,
    x: new Spring({ stiffness: 190, damping: 17 }),
    y: new Spring({ stiffness: 190, damping: 17 }),
    press: new Spring({ stiffness: 320, damping: 22, value: 1 }),
  }));

  const listeners = [];
  const on = (el, type, fn, opts) => {
    el.addEventListener(type, fn, opts);
    listeners.push(() => el.removeEventListener(type, fn, opts));
  };

  for (const item of items) {
    const { el } = item;

    on(el, 'pointerenter', () => {
      item.rect = el.getBoundingClientRect();
    });

    on(el, 'pointermove', (e) => {
      if (!item.rect) item.rect = el.getBoundingClientRect();
      const r = item.rect;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      item.x.target = clamp(dx * strength, -max, max);
      item.y.target = clamp(dy * strength, -max, max);
    });

    on(el, 'pointerleave', () => {
      item.rect = null;
      item.x.target = 0;
      item.y.target = 0;
      item.press.target = 1;
    });

    on(el, 'pointerdown', () => { item.press.target = 0.955; });
    on(el, 'pointerup', () => { item.press.target = 1; });
    on(el, 'blur', () => { item.x.target = 0; item.y.target = 0; item.press.target = 1; });
  }

  const stop = onTick((dt) => {
    for (const item of items) {
      if (item.x.settled && item.y.settled && item.press.settled) continue;
      item.x.step(dt);
      item.y.step(dt);
      item.press.step(dt);
      item.el.style.transform =
        `translate(${item.x.value.toFixed(2)}px, ${item.y.value.toFixed(2)}px) scale(${item.press.value.toFixed(4)})`;
    }
  });

  return () => {
    stop();
    listeners.forEach((off) => off());
    items.forEach((i) => { i.el.style.transform = ''; });
  };
}

/**
 * Profundidade das camadas decorativas.
 *
 * Cursor e scroll alimentam o MESMO escritor de transform. Separados em dois
 * módulos, o último a rodar apagaria o outro — e o efeito de profundidade
 * depende justamente da soma dos dois.
 *
 * O deslocamento de scroll é calculado a partir de um offset cacheado, nunca
 * de getBoundingClientRect por frame.
 */
export function initDepthLayers(selector = '[data-drift]') {
  const els = $$(selector);
  if (!els.length || prefersReducedMotion()) return () => {};

  const usePointer = finePointer();

  const layers = els.map((el) => ({
    el,
    depth: Number(el.dataset.drift) || 1,
    anchor: 0,
    x: 0,
    y: 0,
  }));

  const measure = () => {
    for (const layer of layers) {
      const rect = layer.el.getBoundingClientRect();
      layer.anchor = rect.top + window.scrollY + rect.height / 2;
    }
  };
  measure();
  window.addEventListener('resize', measure, { passive: true });

  let pointerX = 0;
  let pointerY = 0;
  const onMove = (e) => {
    pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (usePointer) window.addEventListener('pointermove', onMove, { passive: true });

  const stop = onTick((dt) => {
    const viewCenter = window.scrollY + window.innerHeight / 2;

    for (const layer of layers) {
      // Quanto mais longe do centro da viewport, maior o deslocamento —
      // camadas de fundo "ficam para trás" do conteúdo ao rolar.
      const offset = clamp((viewCenter - layer.anchor) / window.innerHeight, -1.5, 1.5);
      const tx = usePointer ? pointerX * 13 * layer.depth : 0;
      const ty = offset * 26 * layer.depth + (usePointer ? pointerY * 9 * layer.depth : 0);

      layer.x = damp(layer.x, tx, 3.4, dt);
      layer.y = damp(layer.y, ty, 4.2, dt);
      layer.el.style.transform = `translate3d(${layer.x.toFixed(2)}px, ${layer.y.toFixed(2)}px, 0)`;
    }
  });

  return () => {
    stop();
    window.removeEventListener('resize', measure);
    if (usePointer) window.removeEventListener('pointermove', onMove);
    layers.forEach((l) => { l.el.style.transform = ''; });
  };
}
