/**
 * Movimento do foguete — física visual guiada pelo scroll.
 *
 * O scroll NÃO posiciona o foguete. Ele define apenas um ALVO; a posição real
 * é integrada por uma mola amortecida, então o foguete acelera, carrega
 * momentum, ultrapassa levemente o alvo numa parada brusca e reassenta. É essa
 * diferença entre alvo e posição que gera velocidade — e é a velocidade que
 * alimenta chama, partículas, rastro e deformação.
 *
 * Todo o estado é integrado em um único tick compartilhado, nesta ordem:
 *   scroll → mola → posição no path → tangente → ângulo amortecido → render
 *   → emissão de partículas (que precisam da posição já atualizada)
 *
 * O transform de #rocket pertence exclusivamente a este módulo. Qualquer outra
 * animação que escreva transform nesse elemento cancela a trajetória.
 */

import { $, $$, debounce, isCoarse, prefersReducedMotion } from './env.js';
import { onTick } from './ticker.js';
import { Spring, clamp, damp, dampAngle, makeNoise, tangentAt } from './physics.js';
import { createParticles } from './particles.js';

const DEFAULTS = {
  layer: '#rocket-layer',
  rocket: '#rocket',
  trail: '#traj',
  margin: 40,
  idleThrust: 0.14,
};

/** Perfis por dispositivo: o mobile ganha menos partículas e menos folga. */
const PROFILES = {
  fine: {
    stiffness: 92,
    damping: 15.5,
    angleLambda: 7.5,
    particles: 30,
    edgeBias: 1,
    margin: 40,
    squash: 1,
    idleAmp: 1,
  },
  coarse: {
    stiffness: 120,
    damping: 20,
    angleLambda: 10,
    particles: 8,
    edgeBias: 0.12,
    margin: 12,
    squash: 0.5,
    idleAmp: 0.6,
  },
};

/**
 * Spline de Catmull-Rom convertida em cúbicas de Bézier.
 * Passa exatamente por todos os pontos e mantém continuidade C¹, de modo que
 * a tangente — e portanto a inclinação do foguete — nunca quebra.
 */
function splinePath(points, { tension = 0.55, minX = 0, maxX = Infinity } = {}) {
  if (points.length < 2) return '';

  const clampX = (v) => Math.min(Math.max(v, minX), maxX);
  const p = [points[0], ...points, points[points.length - 1]];
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const c1x = clampX(p1.x + ((p2.x - p0.x) / 6) * tension);
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const c2x = clampX(p2.x - ((p3.x - p1.x) / 6) * tension);
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

/**
 * Lê os beats declarados no HTML: <section data-rocket-x="0.86">
 *
 * Em telas estreitas não existe calha lateral — a coluna de conteúdo ocupa
 * toda a largura. Por isso as frações são comprimidas contra a borda mais
 * próxima (`edgeBias`), transformando o foguete num ornamento de margem.
 */
function collectBeats(layer, width, margin, edgeBias) {
  const host = layer.parentElement || document.body;
  const hostTop = host.getBoundingClientRect().top + window.scrollY;
  const usable = Math.max(width - margin * 2, 60);
  const bias = (f) => (f < 0.5 ? f * edgeBias : 1 - (1 - f) * edgeBias);

  return $$('[data-rocket-x]', host)
    .map((el) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY - hostTop;
      const frac = clamp(Number(el.dataset.rocketX));
      // As travessias laterais precisam acontecer na faixa vazia ENTRE seções,
      // não no meio de uma grade de cards. Ancorar o beta anterior no fim da
      // seção e o seguinte no começo da próxima comprime a varredura para o
      // espaçamento entre elas.
      const anchor = el.dataset.rocketAnchor;
      const ratio = anchor === 'start' ? 0.12 : anchor === 'end' ? 0.9 : 0.5;
      return { x: margin + bias(frac) * usable, y: top + rect.height * ratio };
    })
    .sort((a, b) => a.y - b.y);
}

export function createRocket(userOptions = {}) {
  const opts = { ...DEFAULTS, ...userOptions };

  const layer = $(opts.layer);
  const rocketEl = $(opts.rocket);
  const trailEl = $(opts.trail);
  const svgEl = layer?.querySelector('svg.traj-svg');
  const craftEl = $('#r-craft');
  const flameEl = $('#r-flame');

  const noop = {
    ignite() {}, refresh() {}, destroy() {},
    getState: () => null, parts: [],
  };
  if (!layer || !rocketEl || !trailEl || !svgEl || !craftEl || !flameEl) return noop;

  let profile = isCoarse() ? PROFILES.coarse : PROFILES.fine;

  /* ---------------------------------------------------------------- estado */
  const progress = new Spring({ stiffness: profile.stiffness, damping: profile.damping });
  const flameNoise = makeNoise(7);
  const bobNoise = makeNoise(23);

  let particles = null;
  let unsubscribe = null;
  let resizeObserver = null;

  let pathLength = 0;
  let sceneStart = 0;
  let sceneDistance = 1;
  let toneRanges = [];
  let currentTone = '';

  let angle = -90;          // graus; nariz para cima antes do lançamento
  let speed = 0;            // 0..1 normalizado
  let prevSpeed = 0;
  let thrust = opts.idleThrust;
  let clock = 0;
  let state = 'IDLE';
  let ignited = false;
  let destroyed = false;
  let lastPoint = { x: 0, y: 0 };

  /* ------------------------------------------------------------ construção */
  function build() {
    const width = layer.clientWidth;
    const height = layer.scrollHeight || layer.clientHeight;
    if (!width || !height) return;

    profile = isCoarse() ? PROFILES.coarse : PROFILES.fine;
    progress.stiffness = profile.stiffness;
    progress.damping = profile.damping;

    const beats = collectBeats(layer, width, profile.margin, profile.edgeBias);
    if (beats.length < 2) return;

    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    trailEl.setAttribute(
      'd',
      splinePath(beats, { minX: profile.margin * 0.5, maxX: width - profile.margin * 0.5 })
    );

    pathLength = trailEl.getTotalLength();
    trailEl.style.strokeDasharray = `${pathLength}`;
    trailEl.style.strokeDashoffset = `${pathLength}`;

    // A cena vai de "topo da camada no topo da viewport" até
    // "base da camada na base da viewport" — o scroll inteiro da página.
    const hostTop = (layer.parentElement || document.body).getBoundingClientRect().top + window.scrollY;
    sceneStart = hostTop;
    sceneDistance = Math.max(height - window.innerHeight, 1);

    // A própria camada carrega data-tone (é o gancho de CSS) e cobre a página
    // inteira — precisa ficar fora das faixas ou venceria todos os testes.
    toneRanges = $$('[data-tone]')
      .filter((el) => el !== layer)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY - hostTop;
        return { top, bottom: top + rect.height, tone: el.dataset.tone };
      });
    currentTone = '';

    if (particles) particles.destroy();
    particles = createParticles(svgEl, { count: profile.particles });

    // Reposiciona imediatamente para o scroll atual, sem animar até lá.
    progress.set(scrollProgress());
    render(0, true);
  }

  const scrollProgress = () => clamp((window.scrollY - sceneStart) / sceneDistance);

  /**
   * Tom lido da seção sob o FOGUETE, não da seção no centro da viewport —
   * o foguete raramente está no centro, e usar a viewport fazia o corpo claro
   * receber cores de fundo claro enquanto voava sobre uma seção escura.
   */
  function applyTone(y) {
    for (const range of toneRanges) {
      if (y >= range.top && y < range.bottom) {
        if (range.tone !== currentTone) {
          currentTone = range.tone;
          layer.dataset.tone = range.tone;
        }
        return;
      }
    }
  }

  /* ------------------------------------------------------------ estados */
  function updateState(dSpeed) {
    if (progress.value > 0.985 && speed < 0.12) state = 'LANDING';
    else if (speed < 0.05) state = 'IDLE';
    else if (dSpeed > 0.35) state = 'ACCELERATING';
    else if (dSpeed < -0.35) state = 'DECELERATING';
    else state = 'CRUISING';
  }

  /* -------------------------------------------------------------- render */
  function render(dt, immediate = false) {
    if (!pathLength) return;

    const s = clamp(progress.value) * pathLength;
    const point = trailEl.getPointAtLength(s);
    const tangent = tangentAt(trailEl, s, pathLength);

    // Parado na rampa o foguete aponta para cima; em voo ele aponta para onde
    // está indo. O alinhamento acompanha a velocidade, então a virada acontece
    // durante a aceleração — e não como um giro seco no instante da ignição.
    const align = ignited ? clamp(speed * 2.6 + progress.value * 5) : 0;
    const upright = -90;
    let delta = ((tangent - upright + 540) % 360) - 180;
    const targetAngle = upright + delta * align;

    angle = immediate
      ? targetAngle
      : dampAngle(angle, targetAngle, profile.angleLambda, dt);

    // Flutuação quase imperceptível quando parado: o foguete tem vida, mas o
    // usuário não deve conseguir apontar a animação.
    const idle = ignited ? (1 - speed) * profile.idleAmp : 0;
    const bobY = bobNoise(clock * 0.55) * 2.6 * idle;
    const bobA = bobNoise(clock * 0.4 + 11) * 1.8 * idle;

    rocketEl.style.transform =
      `translate(${(point.x).toFixed(2)}px, ${(point.y + bobY).toFixed(2)}px) rotate(${(angle + 90 + bobA).toFixed(2)}deg)`;

    // Deformação sutil de velocidade: alonga no eixo de voo e afina no outro.
    const stretch = 1 + speed * 0.13 * profile.squash;
    const narrow = 1 - speed * 0.07 * profile.squash;
    craftEl.style.transform = `scale(${narrow.toFixed(3)}, ${stretch.toFixed(3)})`;

    trailEl.style.strokeDashoffset = `${(pathLength * (1 - clamp(progress.value))).toFixed(1)}`;

    applyTone(point.y);
    lastPoint = point;
    return point;
  }

  /* ---------------------------------------------------------------- tick */
  function tick(dt) {
    if (destroyed) return;
    clock += dt;

    progress.target = scrollProgress();
    progress.step(dt);

    // A velocidade normalizada vem da mola, não do scroll: por isso o foguete
    // continua "correndo" por um instante depois que o usuário para.
    const raw = clamp(Math.abs(progress.velocity) / 0.85);
    prevSpeed = speed;
    speed = damp(speed, raw, 12, dt);
    updateState((speed - prevSpeed) / Math.max(dt, 0.001));

    const point = render(dt);

    if (!ignited) return;

    // Chama: base + velocidade + tremor pseudo-orgânico (nunca aleatório puro,
    // que produziria um piscar nervoso).
    const target = opts.idleThrust + speed * 0.86;
    thrust = damp(thrust, target, 9, dt);
    const flicker = 1 + flameNoise(clock * 9) * 0.09;
    flameEl.style.transform =
      `scale(${(0.84 + thrust * 0.3).toFixed(3)}, ${((0.5 + thrust * 1.6) * flicker).toFixed(3)})`;
    flameEl.style.opacity = (0.4 + thrust * 0.6).toFixed(3);

    if (particles && point) {
      // Bocal: um pouco atrás do centro, na direção oposta ao voo.
      const back = (angle + 180) * (Math.PI / 180);
      const nozzle = 16;
      particles.emit(
        point.x + Math.cos(back) * nozzle,
        point.y + Math.sin(back) * nozzle,
        angle,
        speed,
        dt
      );
      particles.update(dt);
    }
  }

  /* ------------------------------------------------------------- pública */
  function ignite() {
    if (ignited || destroyed) return;
    ignited = true;
  }

  function refresh() {
    if (!destroyed) build();
  }

  function destroy() {
    destroyed = true;
    unsubscribe?.();
    resizeObserver?.disconnect();
    particles?.destroy();
    debouncedRefresh.cancel();
    particles = null;
  }

  const debouncedRefresh = debounce(refresh, 150);

  /* ------------------------------------------------------- inicialização */
  build();
  unsubscribe = onTick(tick);

  resizeObserver = new ResizeObserver(debouncedRefresh);
  resizeObserver.observe(layer);
  window.addEventListener('load', debouncedRefresh, { once: true });
  document.fonts?.ready.then(debouncedRefresh).catch(() => {});

  return {
    ignite,
    refresh,
    destroy,
    getState: () => ({
      state,
      speed,
      progress: progress.value,
      target: progress.target,
      velocity: progress.velocity,
      angle,
      x: lastPoint.x,
      y: lastPoint.y,
    }),
  };
}

/** Não faz nada quando o usuário pede redução de movimento. */
export function initRocket(options) {
  if (prefersReducedMotion()) {
    const layer = $(options?.layer || DEFAULTS.layer);
    if (layer) layer.style.display = 'none';
    return { ignite() {}, refresh() {}, destroy() {}, getState: () => null };
  }
  return createRocket(options);
}
