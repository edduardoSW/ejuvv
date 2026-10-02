/**
 * Montagem por fragmentos — o foguete construído pelo scroll.
 *
 * Uma cena presa (sticky) dentro de uma seção alta. O scroll da seção é
 * convertido em UM progresso normalizado 0 → 1, e esse número é a única
 * fonte de verdade da cena: não há timers, não há sequência tocando sozinha,
 * e por isso a animação é perfeitamente reversível — rolar para cima
 * desmonta o que rolar para baixo montou, no mesmo caminho.
 *
 *   0.00 ─ 0.35   montagem     fragmentos dispersos → foguete completo
 *   0.35 ─ 0.60   estabilidade foguete formado, com micro-vida
 *   0.60 ─ 1.00   desmontagem  foguete → fragmentos dispersos
 *
 * Cada faixa é renormalizada para 0..1 antes de mover qualquer peça, e cada
 * peça tem atraso e duração próprios dentro da faixa — é daí que vem o
 * escalonamento (stagger): mesmo progresso global, chegadas diferentes.
 *
 * Tudo é desenhado em UM canvas. Oitocentos nós no DOM com transform próprio
 * custariam um recálculo de estilo por frame; aqui o custo é uma matriz e um
 * retângulo por peça, e o navegador não sabe que existe uma animação.
 *
 * O transform dos fragmentos pertence exclusivamente a este módulo.
 */

import { $, debounce, isCoarse, onEnvChange, prefersReducedMotion } from './env.js';
import { onTick } from './ticker.js';
import { clamp, damp, lerp } from './physics.js';
import { SHAPE, buildFragments } from './rocket-shape.js';

const TAU = Math.PI * 2;

/** Limites das fases, em progresso normalizado da seção. */
const ASSEMBLE_END = 0.35;
const HOLD_END = 0.6;

/**
 * Perfis por dispositivo. `quality` escala a densidade de fragmentos; a
 * silhueta é a mesma nos três — o celular recebe um foguete com menos peças,
 * não um foguete menos reconhecível.
 */
const PROFILES = {
  desktop: { quality: 1, ambient: 74, stars: 150, glow: 110, dpr: 2, fit: 0.6 },
  tablet: { quality: 0.76, ambient: 52, stars: 110, glow: 70, dpr: 2, fit: 0.58 },
  mobile: { quality: 0.52, ambient: 32, stars: 72, glow: 40, dpr: 1.75, fit: 0.52 },
};

const pickProfile = () => {
  if (isCoarse()) return PROFILES.mobile;
  return window.innerWidth < 1100 ? PROFILES.tablet : PROFILES.desktop;
};

/* --------------------------------------------------------------- easings */

const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInQuad = (t) => t * t;

/**
 * Chegada com correção: passa alguns por cento do destino e volta. É o que
 * faz a peça parecer encaixada por um mecanismo, e não interpolada.
 */
function settle(t, back) {
  if (!back) return easeOutQuint(t);
  const u = t - 1;
  return 1 + (back + 1) * u * u * u + back * u * u;
}

/** Bézier quadrática — dá à peça uma trajetória curva em vez de um trilho. */
const quad = (p0, c, p1, t) => {
  const n = 1 - t;
  return n * n * p0 + 2 * n * t * c + t * t * p1;
};

/* ---------------------------------------------------------------- sprites */

/** Halo radial pré-renderizado: `shadowBlur` por peça seria impagável. */
function makeGlowSprite(size = 64) {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(190,196,255,0.42)');
  g.addColorStop(1, 'rgba(140,120,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cvs;
}

/* ------------------------------------------------------------------ cena */

export function createAssembly(userOptions = {}) {
  const section = $(userOptions.section || '#assembly');
  const stage = $(userOptions.stage || '#assembly-stage');
  const canvas = $(userOptions.canvas || '#assembly-canvas');
  const ctx = canvas?.getContext('2d', { alpha: true });

  const noop = { refresh() {}, destroy() {}, seek() {}, getState: () => null };
  if (!section || !stage || !canvas || !ctx) return noop;

  const glowSprite = makeGlowSprite();

  let profile = pickProfile();
  let fragments = [];
  let glowing = [];
  let ambient = [];
  let stars = [];

  let dpr = 1;
  let vw = 0;
  let vh = 0;
  let scale = 1;
  let cx = 0;
  let cy = 0;
  let spreadX = 0;
  let spreadY = 0;

  let sceneTop = 0;
  let sceneSpan = 1;

  let shown = 0;          // progresso suavizado — o que a cena desenha
  let published = -1;     // último progresso escrito no DOM
  let clock = 0;
  let phase = '';
  let active = false;
  let destroyed = false;
  let unsubscribe = null;

  /* -------------------------------------------------------- construção */

  function seedAmbient(rndSeed) {
    // PRNG local, simples: as ambientais não precisam casar com a silhueta,
    // só precisam ser estáveis entre recargas.
    let s = rndSeed;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };

    ambient = Array.from({ length: profile.ambient }, () => ({
      x: rnd(),
      y: rnd(),
      r: 0.7 + rnd() * 2.1,
      a: 0.1 + rnd() * 0.3,
      vx: (rnd() - 0.5) * 0.011,
      vy: -0.004 - rnd() * 0.016,
      depth: 0.25 + rnd() * 0.75,
      phase: rnd() * TAU,
      pulse: 0.4 + rnd() * 1.5,
    }));

    stars = Array.from({ length: profile.stars }, () => ({
      x: rnd(),
      y: rnd(),
      r: 0.4 + rnd() * rnd() * 1.9,
      a: 0.12 + rnd() * 0.42,
      phase: rnd() * TAU,
      pulse: 0.25 + rnd() * 1.1,
      depth: rnd(),
    }));
  }

  function buildScene() {
    fragments = buildFragments({ quality: profile.quality });

    // O halo é caro o suficiente para valer uma cota: só as peças mais
    // luminosas entram na segunda passada, e sempre as mesmas.
    const ranked = [...fragments].sort((a, b) => b.glow - a.glow);
    glowing = ranked.slice(0, profile.glow);

    seedAmbient(987654321);
  }

  /* ------------------------------------------------------------ layout */

  function layout() {
    const rect = stage.getBoundingClientRect();
    vw = rect.width;
    vh = rect.height;
    if (!vw || !vh) return;

    dpr = Math.min(window.devicePixelRatio || 1, profile.dpr);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;

    // O foguete cabe na altura em telas largas e na largura em telas
    // estreitas — nunca encosta nas bordas nem some.
    scale = Math.min((vh * profile.fit) / SHAPE.h, (vw * 0.62) / SHAPE.w);
    cx = vw / 2;
    cy = vh * 0.5;

    // Campo de dispersão: mais largo que alto, como a viewport.
    spreadX = vw * 0.46;
    spreadY = vh * 0.46;

    const box = section.getBoundingClientRect();
    sceneTop = box.top + window.scrollY;
    sceneSpan = Math.max(section.offsetHeight - window.innerHeight, 1);
  }

  const scrollProgress = () => clamp((window.scrollY - sceneTop) / sceneSpan);

  /* ------------------------------------------------------------- fases */

  /**
   * Espelha o progresso no DOM para o HUD. Escrever uma custom property
   * invalida o estilo do palco inteiro, então só escreve quando o número
   * mudou o bastante para virar pixel — com a cena parada, o custo é zero.
   */
  function publishPhase(p) {
    const next =
      p < 0.06 ? 'scatter'
        : p < ASSEMBLE_END ? 'assemble'
          : p < HOLD_END ? 'formed'
            : p < 0.94 ? 'disassemble' : 'gone';

    if (next !== phase) {
      phase = next;
      stage.dataset.phase = next;
    }

    if (Math.abs(p - published) > 0.0015) {
      published = p;
      stage.style.setProperty('--assembly-progress', p.toFixed(4));
    }
  }

  /* ------------------------------------------------------------ render */

  function drawBackdrop(p, form) {
    // Estrelas: parallax mínimo ligado ao progresso e cintilação lenta.
    // Nunca chegam perto do brilho do foguete — o fundo não disputa.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of stars) {
      const y = ((s.y - p * 0.06 * s.depth) % 1 + 1) % 1;
      const tw = 0.72 + Math.sin(clock * s.pulse + s.phase) * 0.28;
      ctx.globalAlpha = s.a * tw * (0.55 + form * 0.45);
      ctx.fillStyle = '#cfd6ff';
      ctx.fillRect(s.x * vw, y * vh, s.r, s.r);
    }

    // Halo do foguete montado: cresce com a formação e some na desmontagem.
    if (form > 0.02) {
      const r = SHAPE.h * scale * 0.95;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = form * 0.3;
      ctx.drawImage(glowSprite, cx - r, cy - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawAmbient(dt, p) {
    // Partículas ambientais: à deriva, com um empurrão proporcional ao
    // progresso — reagem ao scroll sem pertencer à montagem.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#aab5ee';

    for (const a of ambient) {
      a.x += a.vx * dt;
      a.y += a.vy * dt * (1 + p * 0.7);
      // Reciclagem determinística: a partícula reentra deslocada pela razão
      // áurea, o que espalha as reentradas sem sorteio.
      if (a.y < -0.05) { a.y = 1.05; a.x = (a.x + 0.618) % 1; }
      if (a.x < -0.05) a.x = 1.05;
      if (a.x > 1.05) a.x = -0.05;

      const drift = (p - 0.5) * 0.1 * a.depth;
      const tw = 0.6 + Math.sin(clock * a.pulse + a.phase) * 0.4;
      const r = a.r * a.depth;

      ctx.globalAlpha = a.a * tw;
      ctx.fillRect(a.x * vw, (a.y + drift) * vh, r, r);
    }
  }

  function drawFragments(dt, form, apart) {
    const hold = form * (1 - apart);
    // Respiração: quase imperceptível, mas suficiente para o foguete
    // formado não parecer uma imagem congelada.
    const breath = 1 + Math.sin(clock * 0.62) * 0.004 * hold;
    const floatY = Math.sin(clock * 0.45) * vh * 0.006 * hold;
    const S = scale * breath;

    let lastColor = '';
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];

      // Destino: a posição da peça na silhueta.
      const tx = cx + (f.ux - SHAPE.cx) * S;
      const ty = cy + (f.uy - SHAPE.cy) * S + floatY;

      let x = tx;
      let y = ty;
      let rot = f.rotEnd;
      let sc = 1;
      let alpha = f.alpha;

      if (apart > 0) {
        /* --------- desmontagem: destino → dispersão de saída --------- */
        const t = clamp((apart - f.dOut) / f.sOut);
        const e = easeInQuad(t);
        const r = easeInOutCubic(t);

        x = quad(tx, tx + f.outCx * spreadX, tx + f.outX * spreadX, e);
        y = quad(ty, ty + f.outCy * spreadY, ty + f.outY * spreadY, e);
        rot = lerp(f.rotEnd, f.rotEnd + f.rotOut, r);
        sc = lerp(1, f.scaleOut, e);
        // A peça esmaece, mas não some: o fim da seção espelha o começo —
        // um campo de fragmentos —, e não uma tela vazia.
        alpha = f.alpha * (1 - 0.6 * clamp((t - 0.35) / 0.65));
      } else if (form < 1) {
        /* ------------ montagem: dispersão inicial → destino ---------- */
        const t = clamp((form - f.dIn) / f.sIn);
        const e = settle(t, f.back);
        const r = easeInOutCubic(t);

        x = quad(tx + f.inX * spreadX, tx + f.inCx * spreadX, tx, e);
        y = quad(ty + f.inY * spreadY, ty + f.inCy * spreadY, ty, e);
        rot = lerp(f.rotStart, f.rotEnd, r);
        sc = lerp(f.scaleStart, 1, easeOutQuint(t));
        alpha = f.alpha * (0.34 + 0.66 * clamp(t * 1.5));
      }

      if (hold > 0.01) {
        // Micro-vida da fase estável: cada peça oscila na sua própria
        // frequência, em amplitude de menos de um pixel e meio.
        x += Math.sin(clock * 0.7 + f.phase) * f.wob * hold * scale * 0.9;
        y += Math.cos(clock * 0.53 + f.phase * 1.7) * f.wob * hold * scale * 0.9;
        rot += Math.sin(clock * 0.4 + f.phase) * 0.05 * hold;
      }

      f.x = x;
      f.y = y;

      if (alpha <= 0.005 || sc <= 0.01) {
        f.a = 0;
        f.px = x; f.py = y;
        continue;
      }

      /*
       * Rastro direcional. A peça em movimento rápido se alonga na direção
       * do deslocamento — o mesmo truque de um obturador lento. Sem isso, um
       * scroll rápido parece uma sequência de posições; com isso, parece
       * matéria em trânsito.
       */
      const vx = (x - f.px) / Math.max(dt, 0.001);
      const vy = (y - f.py) / Math.max(dt, 0.001);
      f.px = x;
      f.py = y;

      const streak = clamp(Math.hypot(vx, vy) / 1500);
      let w = f.w * S * sc;
      let h = f.h * S * sc;

      if (streak > 0.015) {
        const move = Math.atan2(vy, vx);
        // Mistura angular por componentes: sem salto quando o rastro nasce.
        rot = Math.atan2(
          Math.sin(rot) * (1 - streak) + Math.sin(move) * streak,
          Math.cos(rot) * (1 - streak) + Math.cos(move) * streak
        );
        w *= 1 + streak * 3.2;
        h *= 1 - streak * 0.4;
      }

      f.a = alpha;
      f.gs = (w + h) * 1.5;

      if (f.color !== lastColor) {
        ctx.fillStyle = f.color;
        lastColor = f.color;
      }
      ctx.globalAlpha = alpha;

      const c = Math.cos(rot);
      const s = Math.sin(rot);
      ctx.setTransform(c * w * dpr, s * w * dpr, -s * h * dpr, c * h * dpr, x * dpr, y * dpr);

      if (f.kind === 1) {
        const p = f.poly;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        for (let k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-0.5, -0.5, 1, 1);
      }
    }

    /* Segunda passada: o brilho. Aditivo, e só nas peças mais luminosas. */
    ctx.globalCompositeOperation = 'lighter';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lift = 0.35 + form * 0.65;   // disperso brilha pouco; montado, mais
    for (const f of glowing) {
      if (!f.a) continue;
      const r = f.gs;
      ctx.globalAlpha = Math.min(f.a * f.glow * lift, 0.42);
      ctx.drawImage(glowSprite, f.x - r, f.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function render(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const p = shown;
    const form = clamp(p / ASSEMBLE_END);
    const apart = p <= HOLD_END ? 0 : clamp((p - HOLD_END) / (1 - HOLD_END));

    drawBackdrop(p, form * (1 - apart));
    drawAmbient(dt, p);
    drawFragments(dt, form, apart);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  /* -------------------------------------------------------------- tick */

  function tick(dt) {
    if (destroyed) return;
    clock += dt;

    /*
     * Scrub suavizado: o alvo é sempre o scroll — a suavização só tira a
     * aspereza do wheel, sem nunca virar uma animação por conta própria.
     *
     * A rigidez cresce com a distância até o alvo. Um lambda fixo baixo o
     * bastante para amaciar o passo do wheel deixa a cena arrastada num
     * salto grande (âncora, barra de rolagem, Page Down): a cena continuaria
     * montando o foguete enquanto a seção já saiu da tela. Assim, movimento
     * fino continua macio e salto grande alcança o scroll quase na hora.
     */
    const target = scrollProgress();
    const gap = Math.abs(target - shown);
    shown = damp(shown, target, 10 + 26 * Math.min(gap, 1), dt);
    if (gap < 0.0004) shown = target;

    publishPhase(shown);
    render(dt);
  }

  /* --------------------------------------------------- ciclo de vida */

  /** Fora da tela a cena não desenha: uma seção parada custa zero frames. */
  function setActive(on) {
    if (on === active || destroyed) return;
    active = on;
    if (on) {
      layout();
      shown = scrollProgress();
      unsubscribe = onTick(tick);
    } else {
      unsubscribe?.();
      unsubscribe = null;
    }
  }

  const observer = new IntersectionObserver(
    ([entry]) => setActive(entry.isIntersecting),
    { rootMargin: '25% 0px' }
  );
  observer.observe(section);

  function refresh() {
    if (destroyed) return;
    const next = pickProfile();
    if (next !== profile) {
      profile = next;
      buildScene();
    }
    layout();
    if (!active) render(1 / 60);
  }

  /**
   * Salta para um progresso e desenha na hora. O tick devolve o controle ao
   * scroll no frame seguinte — isto existe para inspeção (?debug=motion) e
   * para capturar um estado exato sem depender de onde a página está.
   */
  function seek(p) {
    shown = clamp(p);
    publishPhase(shown);
    render(1 / 60);
  }

  const debouncedRefresh = debounce(refresh, 180);

  function destroy() {
    destroyed = true;
    observer.disconnect();
    unsubscribe?.();
    debouncedRefresh.cancel();
    window.removeEventListener('resize', debouncedRefresh);
    fragments = [];
    glowing = [];
  }

  /* -------------------------------------------------- inicialização */

  buildScene();
  layout();
  shown = scrollProgress();
  publishPhase(shown);
  render(1 / 60);

  window.addEventListener('resize', debouncedRefresh);
  onEnvChange(debouncedRefresh);
  document.fonts?.ready.then(debouncedRefresh).catch(() => {});

  return {
    refresh,
    destroy,
    seek,
    getState: () => ({ progress: shown, phase, fragments: fragments.length }),
  };
}

/**
 * Com redução de movimento, a cena não anima: desenha o foguete montado uma
 * única vez. O usuário vê a mesma imagem — só não vê o processo.
 */
export function initAssembly(options) {
  const section = $(options?.section || '#assembly');
  if (!section) return { refresh() {}, destroy() {}, seek() {}, getState: () => null };

  if (prefersReducedMotion()) {
    section.dataset.static = 'true';
    return renderStatic(options);
  }

  const scene = createAssembly(options);

  // Acesso programático ao mesmo objeto exposto pelo overlay de motion.
  if (new URLSearchParams(location.search).get('debug') === 'motion') {
    window.__ejuvvAssembly = scene;
  }

  return scene;
}

function renderStatic(options) {
  const stage = $(options?.stage || '#assembly-stage');
  const canvas = $(options?.canvas || '#assembly-canvas');
  const ctx = canvas?.getContext('2d');
  const noop = { refresh() {}, destroy() {}, seek() {}, getState: () => null };
  if (!stage || !ctx) return noop;

  function paint() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const fit = (isCoarse() ? PROFILES.mobile : PROFILES.desktop).fit;
    const scale = Math.min((rect.height * fit) / SHAPE.h, (rect.width * 0.62) / SHAPE.w);
    const cx = rect.width / 2;
    const cy = rect.height * 0.5;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const f of buildFragments({ quality: isCoarse() ? 0.52 : 1 })) {
      const c = Math.cos(f.rotEnd);
      const s = Math.sin(f.rotEnd);
      const w = f.w * scale;
      const h = f.h * scale;
      ctx.fillStyle = f.color;
      ctx.globalAlpha = f.alpha;
      ctx.setTransform(
        c * w * dpr, s * w * dpr, -s * h * dpr, c * h * dpr,
        (cx + (f.ux - SHAPE.cx) * scale) * dpr,
        (cy + (f.uy - SHAPE.cy) * scale) * dpr
      );
      ctx.fillRect(-0.5, -0.5, 1, 1);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    stage.dataset.phase = 'formed';
  }

  paint();
  const repaint = debounce(paint, 200);
  window.addEventListener('resize', repaint);

  return {
    refresh: paint,
    seek: paint,
    destroy: () => window.removeEventListener('resize', repaint),
    getState: () => ({ progress: 1, phase: 'formed', fragments: 0 }),
  };
}
