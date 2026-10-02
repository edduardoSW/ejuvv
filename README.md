# EJUVV — site institucional

Site estático em HTML, CSS e JavaScript puros. Sem framework, sem bundler e sem
etapa de build no deploy: o que está no repositório é exatamente o que vai para
o ar.

## Rodar localmente

```bash
python -m http.server 4173
```

Depois abra <http://localhost:4173>. Qualquer servidor estático serve — os
caminhos são absolutos a partir da raiz (`/assets/...`), então o site precisa
ser servido da raiz do domínio.

## Estrutura

```
index.html                  a home, com a narrativa do foguete
<rota>/index.html           páginas internas (preserva URLs limpas)
assets/css/                 base · layout · components · motion
assets/js/motion/           env · reveal · counter · rocket · assembly
assets/js/ui/               header · accordion · form
assets/js/pages/            home.js (com foguete) · inner.js (sem)
assets/js/data/site.js      conteúdo institucional — fonte da verdade
assets/js/vendor/           anime.js v4 (MIT)
tools/build-pages.mjs       gera as páginas internas
```

## Editar conteúdo

Textos institucionais, serviços, valores, indicadores e dados de contato vivem
em `assets/js/data/site.js`. As páginas internas são **geradas** a partir dele:

```bash
node tools/build-pages.mjs
```

Isso reescreve as 16 páginas internas, o `sitemap.xml` e o `robots.txt` a partir
de um único shell (head, header, footer), garantindo que fiquem idênticos em
todas as rotas. **Não edite os `<rota>/index.html` à mão** — a próxima execução
sobrescreve. A home (`index.html`) é escrita à mão, porque só ela tem a
narrativa completa.

## A narrativa do foguete

O sistema de movimento está documentado em detalhe em
[MOTION_SYSTEM.md](MOTION_SYSTEM.md) — física, estados do foguete, partículas,
parâmetros de ajuste e o contrato de quem pode escrever cada transform. Leia
antes de mexer em qualquer coisa em `assets/js/motion/`.

Em resumo: uma camada de página inteira (`#rocket-layer`) contém a trajetória e
o foguete. A trajetória é regenerada em JavaScript sobre um viewBox 1:1 em
pixels, a partir dos atributos declarados nas seções:

```html
<section data-tone="dark" data-rocket-x="0.94">
```

- `data-rocket-x` — posição horizontal (0 = esquerda, 1 = direita) no centro da seção
- `data-tone` — `dark` ou `light`; define as cores do foguete quando ele passa ali
- `data-rocket-anchor` — opcional, `start` ou `end`, desloca o ponto na vertical

Os beats viram uma spline de Catmull-Rom com continuidade C¹. O scroll define
apenas um alvo; a posição real é integrada por uma mola amortecida, de modo que
o foguete acelera, carrega momentum e ultrapassa levemente numa parada brusca.
Ao mudar o tamanho da janela, a trajetória é reconstruída a partir da geometria
real.

Em telas estreitas as frações são comprimidas contra a borda mais próxima, e com
`prefers-reduced-motion: reduce` a camada inteira é desligada.

## A montagem por fragmentos

No meio da home existe uma segunda cena, independente do foguete que voa: a
seção `#assembly`. Ela tem 300vh de altura só para servir de curso de scroll, e
dentro dela um palco `sticky` de 100vh com um `<canvas>`.

O scroll da seção vira um único progresso normalizado de 0 a 1, e esse número
controla tudo — não há timer nem sequência tocando sozinha, então rolar para
cima desfaz exatamente o que rolar para baixo fez:

```
0.00 → 0.35   centenas de fragmentos convergem e formam o foguete
0.35 → 0.60   foguete formado, com micro-oscilação e respiração
0.60 → 1.00   as peças se soltam e voltam a se dispersar
```

A silhueta não é uma imagem: cada parte do foguete é rasterizada fora da tela e
os fragmentos nascem dos pixels dela, densos no contorno e esparsos no miolo.
Cada peça tem atraso, duração, curva e rotação próprios — mesmo progresso, mas
chegadas diferentes. Ajustar a forma é editar os paths em
`assets/js/motion/rocket-shape.js`; ajustar o comportamento é
`assets/js/motion/assembly.js`. Os detalhes estão em
[MOTION_SYSTEM.md](MOTION_SYSTEM.md#9-montagem-por-fragmentos).

Para inspecionar o movimento, abra a home com `?debug=motion`.

## Formulário de contato

Não há backend. O formulário valida nativamente, monta uma mensagem estruturada
e abre o WhatsApp comercial (`5527993117132`). O campo `website` é um honeypot —
se vier preenchido, o envio é abortado.

## Conteúdo disponível

A área de projetos mostra apenas trabalhos publicados e autorizados. Como ainda
não há uma fotografia oficial da equipe no repositório, o espaço institucional
exibe texto em vez de uma instrução de placeholder. Não existem depoimentos;
inclua novos cases, imagens e relatos somente com material real e autorizado.
