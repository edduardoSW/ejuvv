/**
 * Header: estado "scrolled" e menu mobile.
 * O estado de scroll usa uma sentinela + IntersectionObserver em vez de um
 * listener de scroll, então não há trabalho por frame.
 */

import { $, $$ } from '../motion/env.js';

export function initHeader() {
  const header = $('.header');
  if (!header) return;

  /* ---------- Estado de scroll ---------- */
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none';
  document.body.prepend(sentinel);

  new IntersectionObserver(
    ([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting),
    { threshold: 0 }
  ).observe(sentinel);

  /* ---------- Menu mobile ---------- */
  const toggle = $('.menu-toggle');
  const menu = $('.mobile-menu');
  if (!toggle || !menu) return;

  const iconOpen = toggle.querySelector('.icon-open');
  const iconClose = toggle.querySelector('.icon-close');

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (iconOpen) iconOpen.hidden = open;
    if (iconClose) iconClose.hidden = !open;
    if (open) menu.querySelector('a')?.focus();
  };

  const isOpen = () => menu.classList.contains('is-open');

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Fecha ao voltar para desktop, evitando ficar com overflow travado.
  matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
    if (e.matches && isOpen()) setOpen(false);
  });

  setOpen(false);
}
