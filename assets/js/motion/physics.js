/**
 * Primitivas de movimento físico.
 *
 * Tudo aqui é independente de framerate: a mesma configuração precisa se
 * comportar igual a 60, 120 ou 144 Hz. Por isso nenhuma função usa
 * `valor += (alvo - valor) * 0.1`, que amortece proporcionalmente ao número
 * de frames e fica duas vezes mais rápido num monitor de 120 Hz.
 */

export const clamp = (v, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Amortecimento exponencial independente de framerate.
 * `lambda` é a taxa de convergência: maior = mais rígido.
 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Como damp(), mas em graus e pelo caminho angular mais curto. */
export function dampAngle(current, target, lambda, dt) {
  let delta = ((target - current + 540) % 360) - 180;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

/**
 * Integrador mola-amortecedor.
 *
 *   aceleração = (alvo - posição) * stiffness - velocidade * damping
 *
 * `damping` controla o overshoot: abaixo do amortecimento crítico
 * (2 * sqrt(stiffness)) a mola oscila; acima, ela apenas desliza até o alvo.
 * Usamos subpassos fixos porque um dt grande num integrador explícito de
 * Euler diverge — a mola "explodiria" após um congelamento de frame.
 */
export class Spring {
  constructor({ stiffness = 120, damping = 18, value = 0, velocity = 0 } = {}) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.value = value;
    this.velocity = velocity;
    this.target = value;
  }

  set(value) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    return this;
  }

  step(dt) {
    // Subpassos de no máximo ~4ms mantêm a integração estável.
    const steps = Math.max(1, Math.min(8, Math.ceil(dt / 0.004)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const accel = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
      this.velocity += accel * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  /** Já assentou? Usado para suspender trabalho quando nada se move. */
  get settled() {
    return Math.abs(this.velocity) < 0.001 && Math.abs(this.target - this.value) < 0.0005;
  }
}

/**
 * Ruído de valor 1D suave — variação orgânica sem os saltos do Math.random().
 * Interpola cossenoidalmente entre inteiros pseudo-aleatórios, então a saída
 * é contínua e derivável o bastante para pilotar escala de chama sem tremor.
 */
export function makeNoise(seed = 1) {
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f); // smoothstep
    return lerp(hash(i), hash(i + 1), u) * 2 - 1; // -1..1
  };
}

/**
 * Tangente de um path SVG em um comprimento de arco, em graus.
 * Amostra dois pontos próximos em vez de derivar analiticamente — é exato o
 * suficiente e funciona para qualquer comando de path.
 */
export function tangentAt(path, length, total, delta = 2) {
  const a = path.getPointAtLength(clamp(length - delta, 0, total));
  const b = path.getPointAtLength(clamp(length + delta, 0, total));
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}
