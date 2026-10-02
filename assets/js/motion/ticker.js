/**
 * Tick central de animação.
 *
 * Um único requestAnimationFrame alimenta todos os sistemas de movimento.
 * Vários rAF concorrentes desperdiçam frames e, pior, tornam impossível
 * garantir a ordem de atualização — o foguete precisa ser integrado ANTES
 * das partículas, que nascem da posição dele.
 *
 * O loop se suspende sozinho quando ninguém está inscrito e quando a aba
 * está oculta, então uma página parada não consome frames.
 */

const subscribers = new Set();
let rafId = 0;
let last = 0;

/** dt é limitado: voltar de uma aba oculta traria um salto de vários segundos. */
const MAX_DT = 1 / 30;

function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 1 / 60;
  last = now;

  for (const fn of subscribers) fn(dt, now);

  rafId = subscribers.size ? requestAnimationFrame(frame) : 0;
  if (!rafId) last = 0;
}

function wake() {
  if (!rafId && subscribers.size && !document.hidden) {
    last = 0;
    rafId = requestAnimationFrame(frame);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    last = 0;
  } else {
    wake();
  }
});

/** Inscreve um sistema no tick. Retorna a função de cancelamento. */
export function onTick(fn) {
  subscribers.add(fn);
  wake();
  return () => {
    subscribers.delete(fn);
    if (!subscribers.size && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      last = 0;
    }
  };
}

export const tickerActive = () => rafId !== 0;
