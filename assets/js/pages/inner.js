/**
 * Entrada das páginas internas — reusa reveals, contadores e microinterações,
 * sem carregar o módulo do foguete nem o sistema de partículas.
 */

import { autoReveal } from '../motion/reveal.js';
import { counter, processTimeline } from '../motion/counter.js';
import { initMagnetic } from '../motion/interactions.js';
import { initHeader } from '../ui/header.js';
import { initAccordion } from '../ui/accordion.js';
import { initContactForm } from '../ui/form.js';
import { $ } from '../motion/env.js';

initHeader();
initAccordion();
initContactForm();
autoReveal();
counter('[data-count]');
initMagnetic();

if ($('.timeline')) processTimeline('.timeline');
