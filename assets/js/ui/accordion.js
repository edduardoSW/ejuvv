/**
 * Acordeão de FAQ — um item aberto por vez; clicar no item aberto o fecha.
 * A altura é animada via grid-template-rows (0fr → 1fr), sem medir DOM.
 */

import { $$ } from '../motion/env.js';

export function initAccordion(root = document) {
  $$('.faq', root).forEach((group) => {
    const items = $$('.faq-item', group);

    items.forEach((item) => {
      const button = item.querySelector('.faq-q');
      const panel = item.querySelector('.faq-a');
      if (!button || !panel) return;

      button.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');

        items.forEach((other) => {
          other.classList.remove('is-open');
          other.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
        });

        if (willOpen) {
          item.classList.add('is-open');
          button.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });
}
