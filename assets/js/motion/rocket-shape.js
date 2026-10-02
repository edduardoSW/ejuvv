/**
 * Silhueta do foguete → nuvem de fragmentos.
 *
 * A forma não é desenhada: ela é AMOSTRADA. Cada parte do foguete é
 * rasterizada num canvas fora da tela, em espaço lógico (200 × 320), e os
 * fragmentos nascem dos pixels dessa rasterização — densos no contorno, onde
 * a silhueta precisa ser legível, esparsos no interior, onde ela precisa
 * apenas ter massa. Nenhum desenho do foguete existe em runtime: o que o
 * usuário vê montado é literalmente a distribuição das peças.
 *
 * Amostrar em vez de posicionar à mão tem duas consequências práticas:
 * mudar a geometria de uma parte reescreve seus fragmentos sozinho, e a
 * quantidade de peças deriva da área e do perímetro reais — não de uma lista
 * de coordenadas que envelhece.
 *
 * Tudo aqui é determinístico: um PRNG com semente fixa consumido sempre na
 * mesma ordem. A mesma tela produz sempre a mesma composição, recarregando ou
 * não, e o `?debug` de um bug é reproduzível.
 */

/**
 * Espaço lógico da silhueta. `cx`/`cy` é o ponto que fica no centro do palco:
 * o meio da forma desenhada (y de 6 a 280), não o meio da caixa.
 */
export const SHAPE = { w: 200, h: 320, cx: 100, cy: 145 };

/** Supersampling da rasterização: 2× dá antialiasing bom por ~256 KB. */
const RES = 2;

const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- aleatório */

/** mulberry32 — pequeno, rápido e com boa distribuição para uso visual. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------- a geometria */

/*
 * Coordenadas em espaço lógico. O nariz aponta para cima (y menor).
 * `cut` remove área antes da amostragem — é assim que a janela abre um buraco
 * no corpo em vez de empilhar fragmentos por cima dele. `clip` restringe a
 * parte à área de outra: as faixas são retângulos retos que só existem onde
 * o corpo (de laterais curvas) existe.
 */

const D_NOSE = 'M100 6 C 112 28 123 58 129 92 L 71 92 C 77 58 88 28 100 6 Z';
const D_BODY = 'M71 92 L129 92 C 133 128 135 176 135 216 L 65 216 C 65 176 67 128 71 92 Z';
const D_GLASS = 'M119 134 A 19 19 0 1 0 81 134 A 19 19 0 1 0 119 134 Z';
const D_RING = 'M125 134 A 25 25 0 1 0 75 134 A 25 25 0 1 0 125 134 Z';
const D_BAND_A = 'M60 98 L140 98 L140 105 L60 105 Z';
const D_BAND_B = 'M60 192 L140 192 L140 201 L60 201 Z';
const D_FIN_L = 'M65 178 C 51 200 39 232 34 268 L 65 246 Z';
const D_FIN_R = 'M135 178 C 149 200 161 232 166 268 L 135 246 Z';
const D_SKIRT = 'M65 216 L135 216 L127 252 L73 252 Z';
const D_NOZZLE_L = 'M76 252 L89 252 L86 274 L77 274 Z';
const D_NOZZLE_C = 'M93 252 L107 252 L106 280 L94 280 Z';
const D_NOZZLE_R = 'M111 252 L124 252 L123 274 L114 274 Z';

/**
 * `fill` é a distância média entre fragmentos internos, `edge` a distância
 * entre fragmentos de contorno — ambos em unidades lógicas. Menor = mais
 * denso. `depth` é o plano da parte (0 = fundo, 1 = frente): asas e saia
 * ficam atrás do corpo, janela e bocais na frente.
 */
const PARTS = [
  {
    id: 'fin-l', d: D_FIN_L, fill: 9.5, edge: 4.8, depth: 0.18,
    color: '#7b62f2', edgeColor: '#b6a7ff', glow: 0.12,
  },
  {
    id: 'fin-r', d: D_FIN_R, fill: 9.5, edge: 4.8, depth: 0.18,
    color: '#7b62f2', edgeColor: '#b6a7ff', glow: 0.12,
  },
  {
    id: 'skirt', d: D_SKIRT, fill: 8.5, edge: 4.6, depth: 0.32,
    color: '#704078', edgeColor: '#c9a9d4', glow: 0.1,
  },
  {
    id: 'body', d: D_BODY, fill: 11, edge: 4.5, depth: 0.5,
    cut: [D_RING, D_BAND_A, D_BAND_B],
    color: '#cfc9e6', edgeColor: '#f4f1fb', glow: 0.06,
  },
  {
    id: 'nose', d: D_NOSE, fill: 9, edge: 4.3, depth: 0.55,
    color: '#9aa6e8', edgeColor: '#d5daff', glow: 0.14,
  },
  {
    id: 'band-a', d: D_BAND_A, clip: D_BODY, fill: 5.4, edge: 4.6, depth: 0.62,
    color: '#8067ff', edgeColor: '#aab5ee', glow: 0.18,
  },
  {
    id: 'band-b', d: D_BAND_B, clip: D_BODY, fill: 5.4, edge: 4.6, depth: 0.62,
    color: '#8067ff', edgeColor: '#aab5ee', glow: 0.18,
  },
  {
    id: 'ring', d: D_RING, cut: [D_GLASS], fill: 5.4, edge: 4.3, depth: 0.72,
    color: '#8067ff', edgeColor: '#c3b9ff', glow: 0.15,
  },
  {
    id: 'glass', d: D_GLASS, fill: 5.8, edge: 4.4, depth: 0.8,
    color: '#e5bee9', edgeColor: '#f6e9f8', glow: 0.2,
  },
  {
    id: 'nozzle-l', d: D_NOZZLE_L, fill: 6.2, edge: 4.2, depth: 0.9,
    color: '#8a6fb0', edgeColor: '#e0cfea', glow: 0.3,
  },
  {
    id: 'nozzle-c', d: D_NOZZLE_C, fill: 6.2, edge: 4.2, depth: 0.9,
    color: '#8a6fb0', edgeColor: '#e0cfea', glow: 0.26,
  },
  {
    id: 'nozzle-r', d: D_NOZZLE_R, fill: 6.2, edge: 4.2, depth: 0.9,
    color: '#8a6fb0', edgeColor: '#e0cfea', glow: 0.3,
  },
];

/* ----------------------------------------------------------- rasterização */

/**
 * Rasteriza uma parte e devolve um teste de pertencimento por pixel.
 * Só o canal alfa interessa — a cor do fragmento vem da definição da parte,
 * não do raster.
 */
function rasterize(part) {
  const cvs = document.createElement('canvas');
  cvs.width = SHAPE.w * RES;
  cvs.height = SHAPE.h * RES;

  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.fillStyle = '#fff';

  if (part.clip) {
    // Interseção: desenha a área permitida, depois só mantém o que a
    // sobrepõe. É o que mantém as faixas dentro das laterais curvas do corpo.
    ctx.fill(new Path2D(part.clip));
    ctx.globalCompositeOperation = 'source-in';
  }

  ctx.fill(new Path2D(part.d));

  if (part.cut) {
    ctx.globalCompositeOperation = 'destination-out';
    for (const d of part.cut) ctx.fill(new Path2D(d));
  }

  const { data } = ctx.getImageData(0, 0, cvs.width, cvs.height);
  const stride = cvs.width;

  /** Alfa em coordenadas lógicas (0..255). Fora da tela devolve 0. */
  return (ux, uy) => {
    const px = (ux * RES) | 0;
    const py = (uy * RES) | 0;
    if (px < 0 || py < 0 || px >= cvs.width || py >= cvs.height) return 0;
    return data[(py * stride + px) * 4 + 3];
  };
}

/** Pontos internos: uma célula de grade, um ponto sorteado dentro dela. */
function sampleInterior(alphaAt, step, rnd) {
  const pts = [];
  for (let gy = 0; gy < SHAPE.h; gy += step) {
    for (let gx = 0; gx < SHAPE.w; gx += step) {
      const x = gx + rnd() * step;
      const y = gy + rnd() * step;
      if (alphaAt(x, y) > 150) pts.push({ x, y, edge: false });
    }
  }
  return pts;
}

/**
 * Pontos de contorno: pixels cheios com pelo menos um vizinho vazio,
 * embaralhados e aceitos por ocupação de grade — o resultado tem espaçamento
 * aproximadamente uniforme, sem os aglomerados que uma escolha puramente
 * aleatória produziria justamente onde a silhueta precisa ser limpa.
 */
function sampleEdge(alphaAt, spacing, rnd) {
  const candidates = [];
  for (let y = 1; y < SHAPE.h - 1; y++) {
    for (let x = 1; x < SHAPE.w - 1; x++) {
      if (alphaAt(x, y) <= 150) continue;
      if (
        alphaAt(x - 1, y) < 110 || alphaAt(x + 1, y) < 110 ||
        alphaAt(x, y - 1) < 110 || alphaAt(x, y + 1) < 110
      ) {
        candidates.push(x, y);
      }
    }
  }

  const total = candidates.length / 2;
  const order = new Int32Array(total);
  for (let i = 0; i < total; i++) order[i] = i;
  for (let i = total - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = order[i]; order[i] = order[j]; order[j] = t;
  }

  const cols = Math.ceil(SHAPE.w / spacing) + 1;
  const taken = new Set();
  const pts = [];

  for (let k = 0; k < total; k++) {
    const i = order[k];
    const x = candidates[i * 2];
    const y = candidates[i * 2 + 1];
    const cell = ((y / spacing) | 0) * cols + ((x / spacing) | 0);
    if (taken.has(cell)) continue;
    taken.add(cell);
    pts.push({ x: x + rnd() * 0.6, y: y + rnd() * 0.6, edge: true });
  }

  return pts;
}

/* ------------------------------------------------------------ o fragmento */

/** Polígono irregular de 3 a 5 lados, normalizado em −0.5..0.5. */
function makePoly(rnd) {
  const n = 3 + ((rnd() * 3) | 0);
  const poly = new Float32Array(n * 2);
  const start = rnd() * TAU;
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * TAU + (rnd() - 0.5) * 0.7;
    const r = 0.32 + rnd() * 0.2;
    poly[i * 2] = Math.cos(a) * r;
    poly[i * 2 + 1] = Math.sin(a) * r;
  }
  return poly;
}

/**
 * Dispersão inicial. Não é ruído puro: a direção parte do próprio ponto de
 * destino, então cada peça se afasta pelo caminho por onde vai voltar, e o
 * conjunto disperso ainda lê como "um foguete desmontado" e não como confete.
 * A distância usa rnd² — a maioria fica perto, algumas vão muito longe.
 */
function scatterIn(f, rnd) {
  const dx = f.ux - SHAPE.cx;
  const dy = f.uy - SHAPE.cy;
  const base = Math.atan2(dy, dx || 0.001);
  const angle = base + (rnd() - 0.5) * 1.5;

  const dist = 0.2 + rnd() * rnd() * 1.35;
  // Achatamento: o campo é mais largo que alto, acompanhando a viewport.
  f.inX = Math.cos(angle) * dist * 0.95 + (rnd() - 0.5) * 0.12;
  f.inY = Math.sin(angle) * dist * 0.8 + (rnd() - 0.5) * 0.14;

  // Ponto de controle deslocado perpendicularmente: a trajetória chega
  // curva, como uma peça sendo encaixada, não puxada por um barbante.
  const perp = base + Math.PI / 2;
  const bend = (rnd() - 0.5) * 0.5 * dist;
  f.inCx = f.inX * 0.5 + Math.cos(perp) * bend;
  f.inCy = f.inY * 0.5 + Math.sin(perp) * bend;
}

/**
 * Dispersão final. Direção diferente da inicial — a desmontagem não é a
 * montagem tocada de trás para frente, é uma segunda ideia: um vento
 * ascendente diagonal somado ao afastamento radial, como estrutura perdida
 * na aceleração.
 */
function scatterOut(f, rnd) {
  const dx = f.ux - SHAPE.cx;
  const dy = f.uy - SHAPE.cy;
  const radial = Math.atan2(dy, dx || 0.001) + (rnd() - 0.5) * 1.9;
  const dist = 0.28 + rnd() * rnd() * 1.15;

  const drift = -0.34 - rnd() * 0.5;          // sobe
  const lateral = (rnd() - 0.5) * 0.55;        // e escapa para os lados

  f.outX = Math.cos(radial) * dist * 0.9 + lateral;
  f.outY = Math.sin(radial) * dist * 0.7 + drift;

  const perp = radial + Math.PI / 2;
  const bend = (rnd() - 0.5) * 0.62 * dist;
  f.outCx = f.outX * 0.45 + Math.cos(perp) * bend;
  f.outCy = f.outY * 0.45 + Math.sin(perp) * bend;
}

/* ------------------------------------------------------------------ público */

/**
 * Gera a nuvem completa.
 *
 * @param quality 1 no desktop, ~0.75 no tablet, ~0.5 no celular. Escala a
 *                densidade sem tocar na geometria: a silhueta continua a
 *                mesma, com menos peças.
 * @param seed    troque para obter outra composição — igualmente estável.
 */
export function buildFragments({ quality = 1, seed = 20160411 } = {}) {
  const rnd = mulberry32(seed);
  const fragments = [];

  for (const part of PARTS) {
    const alphaAt = rasterize(part);
    if (!alphaAt) continue;

    /*
     * Contorno e miolo não encolhem juntos. Reduzir peças é sempre reduzir
     * massa interna primeiro: é o contorno que carrega a leitura da forma,
     * então ele perde densidade devagar e o preenchimento perde rápido. Um
     * celular recebe um foguete com menos massa, não um foguete borrado.
     */
    const edgeSpacing = part.edge / (0.35 + 0.65 * quality);
    const fillStep = part.fill / (quality * 0.85);

    const pts = [
      ...sampleEdge(alphaAt, edgeSpacing, rnd),
      ...sampleInterior(alphaAt, fillStep, rnd),
    ];

    for (const pt of pts) {
      // Peças de contorno são pequenas, claras e nítidas; as de dentro são
      // maiores, mais escuras e mais transparentes. É essa diferença que faz
      // a borda "desenhar" e o miolo apenas preencher.
      const kindRoll = rnd();
      const kind = pt.edge
        ? (kindRoll < 0.14 ? 2 : 0)
        : (kindRoll < 0.24 ? 1 : kindRoll < 0.32 ? 2 : 0);

      const grade = 1 / quality;   // menos peças ⇒ peças um pouco maiores
      const long = !pt.edge && rnd() < 0.22;

      const f = {
        ux: pt.x,
        uy: pt.y,
        kind,
        poly: kind === 1 ? makePoly(rnd) : null,
        w: (pt.edge ? 1.5 + rnd() * 1.5 : 2.2 + rnd() * 2.6) * (long ? 2.1 : 1) * grade,
        h: (pt.edge ? 1.5 + rnd() * 1.3 : 2 + rnd() * 2.2) * grade,
        color: pt.edge ? part.edgeColor : part.color,
        alpha: pt.edge ? 0.86 + rnd() * 0.14 : 0.5 + rnd() * 0.34,
        glow: part.glow * (pt.edge ? 1.25 : 0.55) * (0.5 + rnd()),
        depth: part.depth + (rnd() - 0.5) * 0.16,

        rotEnd: long ? (rnd() - 0.5) * 0.25 : rnd() * TAU,
        rotStart: (rnd() - 0.5) * 9,
        rotOut: (rnd() - 0.5) * 12,
        scaleStart: 0.45 + rnd() * 0.7,
        scaleOut: 0.2 + rnd() * 1.2,

        // Micro-vida da fase estável: amplitude e fase próprias, para que
        // nenhuma dupla de peças oscile junto.
        wob: 0.25 + rnd() * 0.9,
        phase: rnd() * TAU,

        inX: 0, inY: 0, inCx: 0, inCy: 0,
        outX: 0, outY: 0, outCx: 0, outCy: 0,
        dIn: 0, sIn: 1, dOut: 0, sOut: 1, back: 0,

        // Estado de render, preenchido a cada frame. Declarado aqui para que
        // todos os fragmentos compartilhem a mesma forma de objeto.
        x: 0, y: 0, px: 0, py: 0, a: 0, gs: 0,
      };

      scatterIn(f, rnd);
      scatterOut(f, rnd);

      /*
       * Stagger. A montagem sobe: as peças da base chegam antes das do nariz,
       * como uma estrutura erguida do chão. A desmontagem começa pelas
       * extremidades — pontas de asa e nariz se soltam primeiro, o núcleo
       * resiste. Metade do atraso vem da posição, metade do sorteio: o padrão
       * é legível sem parecer uma varredura mecânica.
       */
      const fromBottom = 1 - f.uy / SHAPE.h;
      const fromAxis = Math.min(
        1,
        Math.hypot((f.ux - SHAPE.cx) / 70, (f.uy - SHAPE.cy) / 150)
      );

      f.dIn = 0.36 * (fromBottom * 0.55 + rnd() * 0.45);
      f.dOut = 0.36 * ((1 - fromAxis) * 0.5 + rnd() * 0.5);

      // A duração é o que sobra do atraso, encurtada por um fator próprio.
      // Derivar em vez de sortear garante o contrato das fases: em 0.35 toda
      // peça já chegou, em 1.00 toda peça já saiu — nenhuma fica pelo caminho
      // porque atraso e duração somaram mais que a faixa.
      f.sIn = (1 - f.dIn) * (0.6 + rnd() * 0.4);
      f.sOut = (1 - f.dOut) * (0.58 + rnd() * 0.42);
      f.back = rnd() < 0.45 ? 0.5 + rnd() * 1.1 : 0;

      fragments.push(f);
    }
  }

  // Fundo primeiro: a ordem de desenho é fixada aqui, uma vez, em vez de
  // ordenar 800 objetos a cada frame.
  fragments.sort((a, b) => a.depth - b.depth);
  return fragments;
}
