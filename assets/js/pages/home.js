/**
 * Entrada da home — a única página que carrega a narrativa do foguete.
 *
 * A ordem importa: o foguete é criado antes da abertura do hero porque a
 * timeline de montagem precisa acionar a ignição dele no momento certo.
 */

import { autoReveal } from '../motion/reveal.js';
import { counter, processTimeline } from '../motion/counter.js';
import { initRocket } from '../motion/rocket.js';
import { initAssembly } from '../motion/assembly.js';
import { playHeroIntro } from '../motion/hero.js';
import { initMagnetic, initDepthLayers } from '../motion/interactions.js';
import { initDebug } from '../motion/debug.js';
import { initHeader } from '../ui/header.js';
import { initAccordion } from '../ui/accordion.js';
import { initContactForm } from '../ui/form.js';
import { $, whenSettled } from '../motion/env.js';

initHeader();
initAccordion();
initContactForm();

const rocket = initRocket();
const assembly = initAssembly();

autoReveal();
counter('[data-count]');
processTimeline('.timeline');

playHeroIntro(rocket);

initMagnetic();
initDepthLayers();
initDebug(rocket);

// Trajetória e cena de montagem dependem da altura final da página e da
// posição da seção: refazem depois que fontes, imagens e o iframe do mapa
// assentarem.
whenSettled().then(() => {
  rocket.refresh();
  assembly.refresh();
});
$('#map-frame iframe')?.addEventListener('load', () => rocket.refresh(), { once: true });
