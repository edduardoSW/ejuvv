/**
 * Rastro de partículas do foguete.
 *
 * As partículas vivem no espaço da PÁGINA (dentro do SVG da trajetória), não
 * dentro de #rocket. Essa é a diferença entre um rastro e um enfeite: sendo
 * filhas do foguete elas herdariam o transform dele e viajariam juntas para
 * sempre, o que lê como decoração colada. Emitidas em espaço de mundo, elas
 * ficam para trás — e é justamente ficar para trás que comunica velocidade.
 *
 * O pool é fixo: nenhum nó é criado ou removido em runtime.
 */

import { clamp } from './physics.js';

const DEG = Math.PI / 180;

export function createParticles(parentSvg, { count = 30, color = 'currentColor' } = {}) {
  if (!parentSvg || count <= 0) {
    return { emit() {}, update() {}, clear() {}, destroy() {} };
  }

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('id', 'r-trail-particles');
  group.setAttribute('fill', color);
  parentSvg.appendChild(group);

  const pool = [];
  for (let i = 0; i < count; i++) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    node.setAttribute('r', '1');
    node.setAttribute('opacity', '0');
    group.appendChild(node);
    pool.push({
      node,
      alive: false,
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1, size: 1, spin: 0,
    });
  }

  let cursor = 0;
  let emitAccumulator = 0;

  /** Pega o slot mais antigo — reciclar é mais barato que procurar um livre. */
  function nextSlot() {
    const p = pool[cursor];
    cursor = (cursor + 1) % pool.length;
    return p;
  }

  /**
   * @param x,y      posição do bocal, em coordenadas da camada
   * @param angleDeg direção de voo do foguete
   * @param speed    0..1 — controla quantidade, tamanho e impulso
   * @param dt       para acumular emissão fracionária entre frames
   */
  function emit(x, y, angleDeg, speed, dt) {
    if (speed <= 0.02) {
      emitAccumulator = 0;
      return;
    }

    // Taxa proporcional à velocidade: parado quase não solta nada,
    // em velocidade máxima solta um jato contínuo.
    const rate = 8 + speed * 46;
    emitAccumulator += rate * dt;

    let budget = Math.min(Math.floor(emitAccumulator), 6);
    emitAccumulator -= budget;

    // Direção oposta ao voo, com abertura de cone.
    const back = (angleDeg + 180) * DEG;

    while (budget-- > 0) {
      const p = nextSlot();
      const spread = (Math.random() - 0.5) * (0.5 + speed * 0.5);
      const dir = back + spread;
      const push = (18 + speed * 120) * (0.6 + Math.random() * 0.8);

      p.alive = true;
      p.x = x + (Math.random() - 0.5) * 3;
      p.y = y + (Math.random() - 0.5) * 3;
      p.vx = Math.cos(dir) * push;
      p.vy = Math.sin(dir) * push;
      p.maxLife = 0.5 + Math.random() * 0.55 + speed * 0.3;
      p.life = p.maxLife;
      p.size = 1.5 + Math.random() * 2.1 + speed * 1.6;
    }
  }

  function update(dt) {
    // Atrito exponencial: as partículas perdem impulso rápido e ficam
    // suspensas, como fagulhas — não continuam em linha reta para sempre.
    const friction = Math.exp(-3.1 * dt);

    for (const p of pool) {
      if (!p.alive) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        p.node.setAttribute('opacity', '0');
        continue;
      }

      p.vx *= friction;
      p.vy *= friction;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const t = p.life / p.maxLife;          // 1 → 0
      const scale = p.size * (0.35 + t * 0.65);
      p.node.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${scale.toFixed(2)})`);
      // Curva de saída: mantém presença no início da vida e some no fim,
      // em vez de desbotar linearmente desde o primeiro frame.
      p.node.setAttribute('opacity', (clamp(Math.sqrt(t)) * 0.92).toFixed(3));
    }
  }

  function clear() {
    emitAccumulator = 0;
    for (const p of pool) {
      p.alive = false;
      p.node.setAttribute('opacity', '0');
    }
  }

  function destroy() {
    group.remove();
    pool.length = 0;
  }

  return { emit, update, clear, destroy };
}
