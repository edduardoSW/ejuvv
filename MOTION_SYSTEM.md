# Sistema de movimento — EJUVV

Documentação da camada de motion: como o foguete se move, por que ele parece
ter peso, e onde mexer quando algo estiver errado.

O princípio que orienta tudo: **o scroll não posiciona nada.** Ele define um
alvo. A posição real é integrada por molas e atrito, e é a diferença entre
alvo e posição que produz velocidade. Toda a expressividade — chama,
partículas, deformação, inclinação — deriva dessa velocidade, nunca de valores
programados à mão por seção.

---

## Arquitetura

```
assets/js/motion/
├── ticker.js         tick único de rAF, compartilhado por todos os sistemas
├── physics.js        molas, amortecimento, ruído, tangente de path
├── rocket.js         integrador do foguete: posição, velocidade, ângulo, estado
├── particles.js      pool de partículas em espaço de página
├── rocket-shape.js   silhueta do foguete amostrada em fragmentos
├── assembly.js       cena de montagem por scroll, desenhada em canvas
├── hero.js           montagem das peças e sequência de lançamento
├── interactions.js   botões magnéticos, compressão, camadas de profundidade
├── reveal.js         entradas ao rolar
├── counter.js        contadores e trilho de processo
├── debug.js          overlay de inspeção (?debug=motion)
└── env.js            matchMedia, seletores, medição batelada
```

**Ordem de dependência:** `ticker` ← `physics` ← todo o resto. Nada importa
`rocket.js` nem `assembly.js` além de `pages/home.js`, então as páginas internas
não baixam o foguete, as partículas nem a cena de montagem.

**Biblioteca:** anime.js v4.5.0, usada onde ela é melhor que código próprio —
timelines com stagger, molas de entrada, contadores. O movimento contínuo do
foguete **não** usa anime: precisa de estado que sobrevive entre frames.

---

## 1. Tick central

**Objetivo.** Um único `requestAnimationFrame` para todos os sistemas.

**Funcionamento.** Assinantes recebem `(dt, now)` em ordem de inscrição. O loop
se suspende sozinho quando não há assinantes e quando a aba fica oculta. O `dt`
é limitado a 1/30s.

**Arquivos.** `motion/ticker.js`

**Parâmetros.** `MAX_DT = 1/30`

**Por que importa.** Vários rAF concorrentes desperdiçam frames e tornam
impossível garantir ordem — as partículas precisam nascer da posição do foguete
**depois** que ela foi atualizada no mesmo frame. O limite de `dt` evita que
voltar de uma aba oculta produza um salto de vários segundos que faria a mola
divergir.

**Critério de ajuste.** Não mexer sem necessidade. Se algum sistema precisar
rodar antes do foguete, inscreva-o antes.

---

## 2. Primitivas de física

**Objetivo.** Movimento que se comporta igual a 60, 120 ou 144 Hz.

**Funcionamento.**

- `damp(atual, alvo, lambda, dt)` — amortecimento exponencial. Substitui o
  clássico `v += (alvo - v) * 0.1`, que amortece por frame e fica duas vezes
  mais rápido num monitor de 120 Hz.
- `Spring` — integrador mola-amortecedor com subpassos de ~4ms.
  `aceleração = (alvo − valor) · stiffness − velocidade · damping`
- `dampAngle` — igual a `damp`, mas pelo caminho angular mais curto.
- `makeNoise(seed)` — ruído de valor 1D contínuo, para variação orgânica.
- `tangentAt(path, s, total)` — ângulo da tangente por amostragem de dois pontos.

**Arquivos.** `motion/physics.js`

**Parâmetros.** `stiffness`, `damping`, `lambda`.

**Critério de ajuste.** O amortecimento crítico é `2·√stiffness`. Abaixo disso a
mola oscila (overshoot); acima, ela só desliza. Para "encaixe" quer-se
ligeiramente abaixo; para perseguição de cursor, acima.

---

## 3. Foguete

**Objetivo.** Um objeto com massa, não um marcador colado ao scroll.

**Funcionamento.** A cada frame:

1. `alvo = (scrollY − sceneStart) / sceneDistance`, em 0..1
2. a mola de progresso integra em direção ao alvo
3. `velocidade` da mola → `speed` normalizado (0..1), suavizado
4. `getPointAtLength(progress · comprimento)` dá a posição
5. `tangentAt()` dá a direção; o ângulo persegue com atraso
6. um único `style.transform` é escrito em `#rocket`
7. `#r-craft` recebe a deformação de velocidade
8. o `stroke-dashoffset` do rastro acompanha o progresso
9. o tom é lido da seção **sob o foguete**
10. as partículas são emitidas da posição recém-calculada

**Arquivos.** `motion/rocket.js`, `index.html` (SVG e atributos `data-rocket-x`)

**Parâmetros** (constante `PROFILES`):

| Parâmetro | Desktop | Mobile | Papel |
|---|---|---|---|
| `stiffness` | 92 | 120 | quão forte o foguete é puxado ao alvo |
| `damping` | 15.5 | 20 | overshoot; abaixo de `2√k`≈19 ele ultrapassa |
| `angleLambda` | 7.5 | 10 | atraso da inclinação nas curvas |
| `particles` | 30 | 8 | tamanho do pool |
| `edgeBias` | 1 | 0.12 | compressão das frações contra a borda |
| `margin` | 40 | 12 | folga lateral da trajetória |
| `squash` | 1 | 0.5 | intensidade da deformação |

**Medições reais** (1440×900, salto de scroll de 0 → 45%):

```
  t(ms)  estado         speed    lag      ângulo
    112  ACCELERATING   0.649   0.3648    -13°
    465  ACCELERATING   0.842   0.2386     39°
    705  DECELERATING   0.877   0.0376    105°
   1177  IDLE           0.017   0.0000     85°
```

O `lag` é a distância entre alvo e posição: o foguete fica visivelmente para
trás e recupera. Após uma parada seca de scroll, a velocidade decai por ~1,2s e
o `lag` fica **negativo** (−0.0009) — ele ultrapassa e volta.

**Critério de ajuste.**
- foguete "borrachudo"/atrasado demais → aumentar `stiffness`
- oscila ao parar → aumentar `damping`
- vira rápido demais nas curvas → reduzir `angleLambda`

---

## 4. Estados

`IDLE · ACCELERATING · CRUISING · DECELERATING · LANDING`

Derivados de `speed` e da sua derivada, não de qual seção está visível. Isso
mantém a continuidade entre seções: nada reinicia numa fronteira.

| Estado | Condição | Leitura visual |
|---|---|---|
| `IDLE` | speed < 0.05 | chama mínima, flutuação sutil |
| `ACCELERATING` | dSpeed > 0.35 | chama cresce, mais partículas |
| `CRUISING` | — | jato constante |
| `DECELERATING` | dSpeed < −0.35 | chama recolhe |
| `LANDING` | progress > 0.985 e speed < 0.12 | assenta no contato |

---

## 5. Ângulo e inclinação

Na rampa (`progress≈0`, parado) o foguete aponta para cima. Em voo aponta para
a tangente. O alinhamento acompanha a velocidade:

```js
align = clamp(speed · 2.6 + progress · 5)
```

Assim a virada acontece **durante** a aceleração, não como um giro seco no
instante da ignição. Depois, `dampAngle` faz o corpo entrar na curva com
atraso, em vez de encaixar instantaneamente na tangente.

---

## 6. Chama

```
alvo = idleThrust + speed · 0.86
thrust = damp(thrust, alvo, 9, dt)
scaleY = (0.5 + thrust · 1.6) · flicker
```

O `flicker` vem de `makeNoise`, não de `Math.random()`. Ruído contínuo produz
tremor; aleatório puro produziria um piscar nervoso.

**Parâmetros.** `idleThrust = 0.14`, lambda 9, amplitude do ruído 0.09.

---

## 7. Partículas

**Objetivo.** Rastro que comunica velocidade.

**Funcionamento.** Pool fixo de `<circle>` dentro do **SVG da trajetória**, não
dentro de `#rocket`. Essa é a diferença entre rastro e enfeite: sendo filhas do
foguete, herdariam o transform dele e viajariam juntas para sempre. Emitidas em
espaço de página, ficam para trás — e é ficar para trás que lê como velocidade.

Cada partícula nasce no bocal, com direção oposta ao voo mais abertura de cone,
perde impulso por atrito exponencial e some encolhendo.

**Arquivos.** `motion/particles.js`

**Parâmetros.**

| Parâmetro | Valor | Papel |
|---|---|---|
| taxa de emissão | `8 + speed·46` por segundo | quantidade ∝ velocidade |
| teto por frame | 6 | evita rajada após travamento |
| impulso | `18 + speed·120` | alcance |
| atrito | `e^(−3.1·dt)` | desaceleração |
| vida | `0.45 + rnd·0.5 + speed·0.25` s | persistência |

**Critério de ajuste.** Rastro ralo → subir a taxa. Poluído → baixar o teto por
frame antes de mexer na taxa.

---

## 8. Montagem do hero

**Objetivo.** As peças entram espalhadas e se encaixam — a leitura de
"construção", não de "aparecimento".

**Funcionamento.** Timeline do anime.js com molas distintas por peso, na ordem
em que a coisa seria montada:

| Peça | Vem de | Em | Mola |
|---|---|---|---|
| `#r-body` | abaixo, escala 0.72 | 0ms | pesada (78/13) |
| `#r-thruster` | abaixo | 90ms | pesada |
| `#r-fin-l/r` | dos lados, ±46° | 170ms | pesada |
| `#r-nose` | de cima | 280ms | leve (116/11) |
| `#r-window` | escala 0 | 400ms | seca (150/10) |

Medição real: a escotilha atinge escala **1.23** antes de assentar em 1.00 — o
overshoot é o encaixe.

**Arquivos.** `motion/hero.js`, `index.html`

**Contrato de propriedade de transform** — a regra mais importante do sistema:

| Elemento | Dono | Quem mais pode escrever |
|---|---|---|
| `#rocket` | integrador de física | **ninguém** |
| `#r-craft` | deformação de velocidade | **ninguém** |
| `.r-part` | timeline de montagem | ninguém após a abertura |

Escrever transform em `#rocket` de qualquer outro lugar cancela a trajetória.
Isso já aconteceu uma vez: a abertura animava `scale` em `#rocket` e o foguete
ficava parado na origem.

---

## 9. Montagem por fragmentos

**Objetivo.** Uma cena em que o usuário constrói o foguete rolando a página:
centenas de peças dispersas convergem, formam a silhueta, ficam estáveis por um
trecho e voltam a se desfazer — reversível a qualquer momento.

**Funcionamento.** Uma seção de 300vh serve só de espaço de scroll; dentro
dela, um palco `sticky` de 100vh com um `<canvas>`. O scroll da seção vira **um
progresso normalizado 0 → 1**, que é a única fonte de verdade: nenhum timer,
nenhuma sequência tocando sozinha. Rolar para cima desfaz exatamente o que
rolar para baixo fez.

```
0.00 ─────────── 0.35 ────────── 0.60 ─────────── 1.00
   montagem        estabilidade      desmontagem
```

Cada faixa é **renormalizada para 0..1** antes de mover qualquer peça
(`form = p / 0.35`, `apart = (p − 0.60) / 0.40`), e cada peça tem atraso e
duração próprios dentro da faixa — é daí que vem o escalonamento: mesmo
progresso global, chegadas diferentes. A duração é derivada do atraso
(`span = (1 − delay) · fator`), o que garante o contrato das fases: em 0.35
toda peça chegou; em 1.00 toda peça saiu.

A silhueta não é desenhada, é **amostrada**. Cada parte do foguete (nariz,
corpo, faixas, janela, anel, asas, saia, três bocais) é rasterizada num canvas
fora da tela em espaço lógico 200×320; os fragmentos nascem dos pixels: densos
no contorno — que é o que carrega a leitura da forma — e esparsos no interior,
que só precisa de massa. Mudar a geometria de uma parte reescreve seus
fragmentos sozinho.

Entre a origem dispersa e o destino, a peça percorre uma **Bézier quadrática**
com o controle deslocado perpendicularmente: trajetória curva, não trilho. A
chegada usa `easeOutQuint`, e 45% das peças recebem um overshoot pequeno que
passa do destino e volta — a correção final é o que faz parecer encaixe, e não
interpolação. A saída tem destino próprio (vento ascendente + afastamento
radial): desmontar não é montar de trás para frente.

Na faixa estável cada peça oscila em amplitude de pouco mais de um pixel, em
frequência própria, e o conjunto respira 0,4%. É o mínimo para o foguete
formado não parecer uma imagem congelada.

Peças em movimento rápido se alongam na direção do deslocamento — o mesmo
truque de um obturador lento. Sem isso, um scroll rápido lê como sequência de
posições; com isso, lê como matéria em trânsito.

**Arquivos.** `motion/rocket-shape.js` (geometria e amostragem),
`motion/assembly.js` (cena e render), `.assembly*` em `css/motion.css`

**Parâmetros.**

| Parâmetro | Valor | Papel |
|---|---|---|
| fases | 0.35 / 0.60 | fim da montagem, início da desmontagem |
| altura da seção | 300vh (260vh ≤900px) | curso de scroll |
| atraso máximo | 0.36 da faixa | quanto o escalonamento se espalha |
| fragmentos | 845 · qualidade | densidade da silhueta |
| suavização | λ = 10 + 26·distância | scrub macio no fino, rápido no salto |
| dispersão | 0.46 · viewport | raio do campo disperso |

**Por que canvas.** Oitocentos nós no DOM com transform próprio custariam um
recálculo de estilo por frame. No canvas o custo é uma matriz e um retângulo
por peça, e o navegador não sabe que existe uma animação.

**Critério de ajuste.** Silhueta ilegível → baixar `edge` das partes (mais
contorno), nunca `fill`. Cena pesada → subir `fill` (menos massa interna).
Montagem "chegando tarde" → reduzir o atraso máximo, não o easing.

---

## 10. Microinterações

**Botões magnéticos** (`[data-magnetic]`). O elemento se desloca até 10px na
direção do cursor e volta com mola. `pointerdown` comprime para 0.955.
Medido: cursor à direita → `translate(10.2px, 2.3px)`, exatamente no limite.

Só em `(hover: hover) and (pointer: fine)`. O retângulo é lido no
`pointerenter` e reaproveitado — nunca `getBoundingClientRect` por frame.

**Não aplicar em elementos do hero:** a timeline de abertura já anima transform
neles e os dois brigariam.

**Camadas de profundidade** (`data-drift="1"`). Cursor e scroll alimentam o
**mesmo** escritor de transform — separados, o último a rodar apagaria o outro.
O offset de scroll vem de uma âncora cacheada, remedida só no `resize`.

**Arquivos.** `motion/interactions.js`

---

## 11. Responsividade

| Aspecto | Desktop | Mobile (<768px) |
|---|---|---|
| partículas | 30 | 8 |
| magnético | sim | desligado (ponteiro grosso) |
| deriva do cursor | sim | só scroll |
| deformação | 100% | 50% |
| trajetória | usa as calhas | comprimida contra a borda |
| tamanho do foguete | 54×86 | 28×44 |
| fragmentos da montagem | 845 | ~440 |
| altura da cena de montagem | 300vh | 260vh |
| DPR do canvas | até 2 | até 1.75 |

Na cena de montagem, contorno e miolo não encolhem juntos: reduzir peças é
sempre reduzir massa interna primeiro. O contorno perde densidade devagar
(`edge / (0.35 + 0.65·q)`) e o preenchimento perde rápido (`fill / (0.85·q)`),
então o celular recebe um foguete com menos massa — não um foguete borrado.

Em telas estreitas não existe calha lateral — a coluna de conteúdo ocupa toda a
largura. Por isso `edgeBias: 0.12` empurra todas as frações contra a borda mais
próxima, transformando o foguete num ornamento de margem.

---

## 12. Redução de movimento

Com `prefers-reduced-motion: reduce`, verificado por medição:

- `#rocket-layer` → `display: none`
- pool de partículas → **0 nós criados** (não escondidos: nunca criados)
- magnético e deriva → não inicializam
- reveals → estado final imediato
- contadores → valor final
- marquee → `animation: none`
- cena de montagem → desenha o foguete formado **uma vez**, e a seção encolhe
  para 100vh (sem curso de scroll para uma animação que não vai acontecer)
- acordeão e navegação → intactos

A autoridade é o `matchMedia` em `env.js`, **não** a regra CSS. O anime.js e o
integrador escrevem transform inline, que `animation: none` não detém.

---

## 13. Performance

- só `transform` e `opacity`
- um único rAF; suspende sozinho quando ocioso e com a aba oculta
- `will-change: transform` apenas em `#rocket`
- nenhuma leitura de geometria no tick: `getPointAtLength` é geometria do
  próprio path e não força reflow; âncoras e retângulos são cacheados
- pool fixo de partículas: nenhum nó criado ou removido em runtime
- páginas internas não carregam foguete, partículas nem cena de montagem
- a cena de montagem só desenha quando está no viewport: fora dele ela cancela
  a inscrição no tick e custa zero
- a custom property `--assembly-progress` só é reescrita quando o valor muda o
  bastante para virar pixel — cena parada não invalida estilo

**Medido:** 88–182 fps em Chrome headless a 1440×900, com foguete, partículas,
29 reveals e o marquee ativos. A cena de montagem custa **0,74 ms por frame**
com 605 fragmentos (0,51 ms com 355), medido pelo tempo de emissão de um frame
completo — sobra folga de 15 ms no orçamento de 60 fps.

---

## 14. Depuração

`?debug=motion` liga um overlay com estado, speed, progresso, alvo, lag,
velocidade, ângulo, posição e fps, e pinta a trajetória. Também expõe
`window.__ejuvvMotion` para inspeção no console:

```js
__ejuvvMotion.getState()
__ejuvvAssembly.getState()   // { progress, phase, fragments }
__ejuvvAssembly.seek(0.35)   // salta para um progresso e desenha na hora
```

`seek()` é para inspeção: o tick devolve o controle ao scroll no frame
seguinte, então para congelar um estado é preciso rolar até ele.

Nunca aparece sem o parâmetro na URL.

---

## Limitações conhecidas

- A trajetória é reconstruída no `resize` (debounce de 150ms); durante o arrasto
  da janela ela fica momentaneamente desalinhada do conteúdo.
- O `lag` da mola faz o foguete não chegar exatamente ao fim do path enquanto o
  usuário ainda está rolando. É intencional, mas significa que o rastro só
  fecha 100% quando o scroll para.
- As partículas não colidem nem recebem vento; o atrito é isotrópico.
- `getPointAtLength` é chamado uma vez por frame mais duas para a tangente. Em
  paths muito longos com centenas de comandos isso poderia pesar; com os ~10
  beats atuais, não pesa.
- A amostragem da silhueta roda no carregamento (12 rasterizações de 400×640) e
  de novo quando o perfil de dispositivo muda. É rápida, mas é trabalho
  síncrono: não a chame dentro de um frame de animação.
- Os fragmentos não colidem entre si nem com a silhueta; a leitura da forma vem
  da densidade do contorno, não de empacotamento.
- O foguete da trajetória continua atravessando a seção de montagem pela borda
  (`data-rocket-x="0.03"`). São dois sistemas independentes desenhando na mesma
  tela — de propósito, mas mexer no beat de uma seção vizinha pode aproximá-los
  demais.
