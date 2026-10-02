/**
 * Gerador das páginas internas da EJUVV.
 *
 * O site entregue é HTML estático puro. Este script existe apenas para que o
 * shell (head, header, footer) seja escrito uma vez e fique idêntico em todas
 * as rotas. Rode com:  node tools/build-pages.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  services,
  process as processSteps,
  values,
  projects,
  orbitaBenefits,
  selection,
} from '../assets/js/data/site.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const NAV = [
  ['Início', '/'],
  ['Sobre', '/sobre/'],
  ['Soluções', '/solucoes/'],
  ['Projetos', '/projetos/'],
  ['Órbita', '/orbita/'],
  ['Contato', '/contato/'],
];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const icon = (name, attrs = '') =>
  `<svg aria-hidden="true"${attrs ? ' ' + attrs : ''}><use href="/assets/img/icons.svg#${name}"/></svg>`;

const pad = (n) => String(n).padStart(2, '0');

const projectCards = (items = []) =>
  items
    .map((p) => {
      const visual = `<a class="project-visual project-visual-sites" href="/projetos/${p.slug}/" aria-label="Ver projeto: ${esc(p.title)}">
              ${p.sites
                .slice(0, 3)
                .map((site) => `<img src="${esc(site.image)}" alt="Home do site ${esc(site.name)}">`)
                .join('\n              ')}
              <span>${esc(p.status)}</span>
            </a>`;

      return `          <article class="project-card" data-reveal="stagger" data-reveal-group="proj">
            ${visual}
            <div class="project-body">
              <small>${esc(p.category)}</small>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.challenge)}</p>
              <a class="text-link" href="/projetos/${p.slug}/">Ver projeto ${icon('i-arrow-right')}</a>
            </div>
          </article>`;
    })
    .join('\n');

const deliverablesList = (items = []) =>
  items
    .map((item) => `          <li>${icon('i-check')}<span>${esc(item)}</span></li>`)
    .join('\n');

const caseSites = (sites = []) =>
  sites
    .map(
      (site) => `          <article class="case-site-card">
            <a class="case-site-shot" href="${esc(site.url)}" target="_blank" rel="noreferrer">
              <img src="${esc(site.image)}" alt="Home do site ${esc(site.name)}">
            </a>
            <div class="case-site-body">
              <small>${esc(site.specialty)}</small>
              <h3>${esc(site.name)}</h3>
              <p>${esc(site.note)}</p>
              <a class="text-link" href="${esc(site.url)}" target="_blank" rel="noreferrer">Acessar site ${icon('i-arrow-right')}</a>
            </div>
          </article>`
    )
    .join('\n');

const casePageBody = (p) => {
  return `<section class="section">
      <div class="container case-intro" data-reveal>
        <div>
          <span class="eyebrow">O projeto</span>
          <h2>Três profissionais, três sites feitos de acordo com cada atendimento.</h2>
        </div>
        <p>${esc(p.solution)}</p>
      </div>
    </section>

    <section class="section soft">
      <div class="container">
        <div class="section-heading">
          <div data-reveal>
            <span class="eyebrow">Sites publicados</span>
            <h2>Conheça cada trabalho.</h2>
          </div>
          <p data-reveal data-reveal-delay="120">${esc(p.challenge)}</p>
        </div>
        <div class="case-site-grid">
${caseSites(p.sites)}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container case-details" data-reveal>
        <div>
          <span class="eyebrow">Entregas</span>
          <h2>O que fizemos.</h2>
        </div>
        <ul class="deliverables case-deliverables">
${deliverablesList(p.deliverables)}
        </ul>
        <div class="case-result">
          <small>Resultado</small>
          <p>${esc(p.results)}</p>
        </div>
      </div>
    </section>`;
};

/* ------------------------------------------------------------------ shell */
function shell({ url, title, description, body, section }) {
  const fullTitle = title === null ? 'EJUVV | Estratégia para negócios' : `${title} | EJUVV`;

  const navLinks = NAV.map(
    ([label, href]) =>
      `<a href="${href}"${href === section ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('\n      ');

  const mobileLinks = NAV.map(
    ([label, href]) => `  <a class="m-link" href="${href}">${label} ${icon('i-chevron-right')}</a>`
  ).join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="https://ejuvv.com${url}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="https://ejuvv.com${url}">
<meta property="og:image" content="https://ejuvv.com/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#35143d">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/layout.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/motion.css">
<link rel="modulepreload" href="/assets/js/vendor/anime.esm.min.js">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
<a class="skip-link" href="#main">Pular para o conteúdo</a>

<header class="header">
  <div class="header-inner">
    <a class="brand" href="/" aria-label="EJUVV, início">
      <img class="brand-mark" src="/assets/img/logo-ejuvv-symbol.png" alt="" aria-hidden="true">
      <span>EJUVV</span>
    </a>
    <nav class="desktop-nav" aria-label="Navegação principal">
      ${navLinks}
    </nav>
    <a class="btn btn-primary" href="/contato/" data-magnetic>Pedir orçamento</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Abrir menu">
      ${icon('i-menu', 'class="icon-open"')}
      ${icon('i-x', 'class="icon-close" hidden')}
    </button>
  </div>
</header>

<div class="mobile-menu" id="mobile-menu" aria-hidden="true">
${mobileLinks}
  <a class="btn btn-primary" href="/orbita/">Faça parte da EJUVV ${icon('i-arrow-right')}</a>
</div>

<main id="main">
${body}
</main>

<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <span class="brand"><img class="brand-mark" src="/assets/img/logo-ejuvv-symbol.png" alt="" aria-hidden="true"> EJUVV</span>
        <p class="footer-tagline">Empresa Júnior da Universidade Vila Velha.</p>
      </div>
      <div class="footer-col">
        <h3>Navegue</h3>
        <ul>
          <li><a href="/sobre/">Sobre</a></li>
          <li><a href="/solucoes/">Soluções</a></li>
          <li><a href="/projetos/">Projetos</a></li>
          <li><a href="/orbita/">Órbita</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>Contato</h3>
        <ul>
          <li><a href="mailto:comercial@ejuvv.com">comercial@ejuvv.com</a></li>
          <li><a href="https://wa.me/5527993117132" target="_blank" rel="noreferrer">(27) 99311-7132</a></li>
          <li><span>Universidade Vila Velha, Vila Velha/ES</span></li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>Transparência</h3>
        <ul>
          <li><a href="/politica-de-privacidade/">Política de Privacidade</a></li>
          <li><a href="/termos-de-uso/">Termos de Uso</a></li>
          <li><a href="https://instagram.com/ejuvv" target="_blank" rel="noopener noreferrer">Instagram</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> EJUVV. Todos os direitos reservados.</span>
      <span>Universidade Vila Velha</span>
    </div>
  </div>
</footer>

<a class="wa-float" href="https://wa.me/5527993117132" target="_blank" rel="noreferrer" aria-label="Conversar pelo WhatsApp">
  ${icon('i-message-circle')}
</a>

<script>document.getElementById('year').textContent = new Date().getFullYear()</script>
<script type="module" src="/assets/js/pages/inner.js"></script>
</body>
</html>
`;
}

const pageHero = (eyebrow, h1, text) => `
    <section class="page-hero">
      <div class="container">
        <span class="eyebrow">${esc(eyebrow)}</span>
        <h1>${esc(h1)}</h1>
        <p>${esc(text)}</p>
      </div>
    </section>`;

const timeline = (steps) => `
        <div class="timeline">
          <div class="timeline-progress"></div>
${steps
  .map((s, i) => `          <div class="t-step"><span>${pad(i + 1)}</span><p>${esc(s)}</p></div>`)
  .join('\n')}
        </div>`;

const serviceCard = (s, i) => `
          <article class="service-card" data-reveal="stagger" data-reveal-group="svc" style="--tone:${
            ['#eee8f7', '#f2e7ee', '#e8ebf8'][i % 3]
          }">
            <span class="card-num">${pad(i + 1)}</span>
            <div class="service-icon">${icon(s.icon)}</div>
            <p class="service-problem"><small>Faz sentido quando</small><strong>${esc(s.problem)}</strong></p>
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.description)}</p>
            <div class="service-actions">
              <a class="text-link" href="/solucoes/${s.slug}/">Ver detalhes ${icon('i-arrow-right')}</a>
              <a class="text-link" href="/contato/?servico=${s.slug}">Falar com a equipe</a>
            </div>
          </article>`;

/* ------------------------------------------------------------------ pages */
const pages = [];

/* ---- /sobre ---- */
pages.push({
  url: '/sobre/',
  file: 'sobre/index.html',
  section: '/sobre/',
  title: 'Sobre',
  description:
    'Conheça a EJUVV, Empresa Júnior da Universidade Vila Velha, e veja como os estudantes trabalham em projetos para clientes.',
  body: `${pageHero(
    'Sobre a EJUVV',
    'Estudantes da UVV trabalhando em projetos de verdade.',
    'A EJUVV reúne alunos de diferentes cursos para atender empresas e profissionais com orientação acadêmica e prática de mercado.'
  )}

    <section class="section">
      <div class="container split">
        <div data-reveal>
          <span class="eyebrow">Nossa história</span>
          <h2>Uma empresa júnior desde 2016.</h2>
          <p class="lead">Na EJUVV, estudantes de diferentes cursos participam de todas as etapas de um projeto: entendem a demanda, definem o escopo, desenvolvem a entrega e apresentam o resultado ao cliente.</p>
          <p class="lead" style="margin-top:20px">As empresas contam com uma equipe acompanhada e disposta a estudar cada contexto. Os estudantes saem da sala de aula para lidar com prazos, decisões e clientes reais.</p>
        </div>
        <div class="media-placeholder" data-reveal data-reveal-delay="140">
          <span>EJUVV desde 2016</span>
          <small>Projetos conduzidos por estudantes da Universidade Vila Velha</small>
        </div>
      </div>
    </section>

    <section class="section on-dark" style="background:radial-gradient(ellipse 60% 50% at 85% 20%,rgba(165,102,176,.24),transparent 55%),var(--deep)">
      <div class="container">
        <div class="section-heading">
          <div data-reveal>
            <span class="eyebrow">Nossos valores</span>
            <h2>Como a gente trabalha.</h2>
          </div>
          <p data-reveal data-reveal-delay="120">Eles aparecem na rotina: na forma de aprender, assumir responsabilidade e preparar quem vai continuar a EJUVV.</p>
        </div>
        <div class="value-grid">
${values
  .map(
    (v, i) => `          <article class="value-card" data-reveal="stagger" data-reveal-group="val">
            <b>${pad(i + 1)}</b>
            <h3>${esc(v.title)}</h3>
            <p>${esc(v.description)}</p>
          </article>`
  )
  .join('\n')}
        </div>
      </div>
    </section>

    <section class="section soft">
      <div class="container split">
        <div data-reveal>
          <span class="eyebrow">Missão</span>
          <h2>Formar lideranças por meio de soluções que geram valor.</h2>
        </div>
        <div data-reveal data-reveal-delay="140">
          <span class="eyebrow">Visão</span>
          <h2>Ser referência em desenvolvimento empreendedor e impacto para o ecossistema capixaba.</h2>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container cta-band" data-reveal>
        <span class="eyebrow">Vamos conversar</span>
        <h2>Tem um projeto em mente?</h2>
        <p class="lead">Conte o que sua empresa precisa. A equipe responde para entender o contexto e avaliar como pode ajudar.</p>
        <a class="btn btn-primary" href="/contato/" data-magnetic>Falar com a EJUVV ${icon('i-arrow-right')}</a>
      </div>
    </section>`,
});

/* ---- /solucoes ---- */
pages.push({
  url: '/solucoes/',
  file: 'solucoes/index.html',
  section: '/solucoes/',
  title: 'Soluções',
  description:
    'Conheça os serviços da EJUVV em sites, landing pages, e-commerce, automação de atendimento e sistemas sob medida.',
  body: `${pageHero(
    'O que fazemos',
    'Sites, automações e sistemas pensados para a sua rotina.',
    'A equipe entende o que você precisa, combina o escopo antes de começar e mantém você por perto durante o desenvolvimento.'
  )}

    <section class="section soft">
      <div class="container">
        <div class="service-grid">
${services.map(serviceCard).join('\n')}
        </div>
      </div>
    </section>

    <section class="section on-dark" style="background:radial-gradient(ellipse 60% 50% at 85% 15%,rgba(255,255,255,.08),transparent 50%),var(--deep)">
      <div class="container">
        <div data-reveal>
          <span class="eyebrow">Como funciona</span>
          <h2>Você acompanha o projeto do começo ao fim.</h2>
        </div>
${timeline(processSteps)}
      </div>
    </section>`,
});

/* ---- /solucoes/<slug> ---- */
for (const s of services) {
  pages.push({
    url: `/solucoes/${s.slug}/`,
    file: `solucoes/${s.slug}/index.html`,
    section: '/solucoes/',
    title: s.title,
    description: s.description,
    body: `${pageHero('Serviço', s.title, s.description)}

    <section class="section">
      <div class="container split" style="align-items:start">
        <div data-reveal>
          <span class="eyebrow">Para quem é</span>
          <h2>Este serviço pode ajudar se...</h2>
          <p class="lead">${esc(s.audience)}</p>
          <p style="margin-top:28px">
            <a class="btn btn-primary" href="/contato/?servico=${s.slug}" data-magnetic>Quero falar sobre este serviço ${icon('i-arrow-right')}</a>
          </p>
        </div>
        <div data-reveal data-reveal-delay="140">
          <span class="eyebrow">O que está incluído</span>
          <h2 style="margin-bottom:26px">O que entra no projeto</h2>
          <ul class="deliverables">
${s.deliverables
  .map(
    (d, i) =>
      `            <li><b>${pad(i + 1)}</b><span>${esc(d)}</span>${icon('i-check')}</li>`
  )
  .join('\n')}
          </ul>
        </div>
      </div>
    </section>

    <section class="section on-dark" style="background:radial-gradient(ellipse 60% 50% at 85% 15%,rgba(255,255,255,.08),transparent 50%),var(--deep)">
      <div class="container">
        <div data-reveal>
          <span class="eyebrow">Como funciona</span>
          <h2>Você acompanha o projeto do começo ao fim.</h2>
        </div>
${timeline(processSteps)}
      </div>
    </section>

    <section class="section soft">
      <div class="container cta-band" data-reveal>
        <span class="eyebrow">Outras soluções</span>
        <h2>Ainda não encontrou o que procura?</h2>
        <a class="btn btn-outline" href="/solucoes/">Conhecer os outros serviços ${icon('i-arrow-right')}</a>
      </div>
    </section>`,
  });
}

/* ---- /projetos ---- */
pages.push({
  url: '/projetos/',
  file: 'projetos/index.html',
  section: '/projetos/',
  title: 'Projetos',
  description:
    'Conheça sites desenvolvidos pela EJUVV e acesse os projetos que já estão publicados.',
  body: `${pageHero(
    'Projetos',
    'Veja o que já colocamos no ar.',
    'Nesta página você encontra trabalhos publicados pela EJUVV e pode acessar cada site para conferir o resultado.'
  )}

    <section class="section">
      <div class="container">
        <div class="project-grid">
${projectCards(projects)}
        </div>
      </div>
    </section>`,
});

/* ---- /projetos/<slug> ---- */
for (const p of projects) {
  pages.push({
    url: `/projetos/${p.slug}/`,
    file: `projetos/${p.slug}/index.html`,
    section: '/projetos/',
    title: p.title,
    description: p.challenge,
    body: `${pageHero(
      p.category,
      p.title,
      p.challenge
    )}
${casePageBody(p)}

    <section class="section soft">
      <div class="container cta-band" data-reveal>
        <span class="eyebrow">Projetos</span>
        <h2>Veja outros trabalhos da EJUVV.</h2>
        <a class="btn btn-outline" href="/projetos/">Voltar para projetos ${icon('i-arrow-right')}</a>
      </div>
    </section>`,
  });
}

/* ---- /orbita ---- */
pages.push({
  url: '/orbita/',
  file: 'orbita/index.html',
  section: '/orbita/',
  title: 'Órbita',
  description:
    'Conheça o Órbita, porta de entrada para estudantes da UVV que querem participar da EJUVV.',
  body: `${pageHero(
    'EJUVV Órbita',
    'Quer fazer parte da EJUVV?',
    'O Órbita apresenta a empresa júnior por dentro e reúne as informações sobre nossos processos seletivos.'
  )}

    <section class="section">
      <div class="container split" style="align-items:start">
        <div data-reveal>
          <span class="eyebrow">Por onde começar</span>
          <h2>Conheça a EJUVV por dentro.</h2>
          <p class="lead">Pelo Órbita, você acompanha os processos seletivos, entende o trabalho de cada área e conhece as capacitações e eventos da EJUVV.</p>
          <p class="status-note">${esc(selection.status)}. As próximas datas serão divulgadas no Instagram do Órbita.</p>
        </div>
        <ul class="benefit-list on-light" data-reveal data-reveal-delay="140">
${orbitaBenefits
  .map((b) => `          <li>${icon('i-check')}${esc(b)}</li>`)
  .join('\n')}
        </ul>
      </div>
    </section>

    <section class="section soft">
      <div class="container">
        <div class="section-heading">
          <div data-reveal>
            <span class="eyebrow">Áreas internas</span>
            <h2>O que cada equipe faz.</h2>
          </div>
        </div>
        <div class="numbered-grid">
${[
  ['Projetos', 'Organiza o escopo, os prazos e o contato com o cliente durante as entregas.'],
  ['Comercial', 'Conversa com potenciais clientes, entende demandas e prepara propostas.'],
  ['Marketing', 'Cuida da comunicação da EJUVV e divulga projetos e processos seletivos.'],
  ['Gente &amp; Gestão', 'Acompanha os membros, recebe quem chega e organiza ações de desenvolvimento.'],
  ['Administrativo-financeiro', 'Mantém documentos, contratos e finanças em ordem.'],
  ['Presidência e estratégia', 'Coordena a EJUVV e acompanha metas, parcerias e decisões da gestão.'],
]
  .map(
    ([area, description], i) => `          <article class="numbered-card" data-reveal="stagger" data-reveal-group="area">
            <b>${pad(i + 1)}</b>
            <h3>${area}</h3>
            <p>${description}</p>
          </article>`
  )
  .join('\n')}
        </div>
      </div>
    </section>

    <section class="section on-dark" style="background:radial-gradient(ellipse 60% 50% at 85% 15%,rgba(255,255,255,.08),transparent 50%),var(--deep)">
      <div class="container">
        <div data-reveal>
          <span class="eyebrow">Processo seletivo</span>
          <h2>Como funciona a seleção.</h2>
        </div>
${timeline(selection.steps)}
      </div>
    </section>

    <section class="section" id="banco-de-talentos">
      <div class="container split" style="align-items:start">
        <div data-reveal>
          <span class="eyebrow">Banco de talentos</span>
          <h2>Quer acompanhar a próxima seleção?</h2>
          <p class="lead">Siga o Instagram do Órbita. É por lá que publicamos datas, editais e orientações para participar.</p>
          <div class="button-row" style="margin-top:30px">
            <a class="btn btn-primary" href="https://www.instagram.com/ejuvv.orbita/" target="_blank" rel="noreferrer">Acompanhar no Instagram ${icon('i-arrow-right')}</a>
            <button class="btn btn-outline" type="button" disabled>Inscrições fechadas</button>
          </div>
        </div>
        <div class="faq" data-reveal data-reveal-delay="140">
          <div class="faq-item">
            <button class="faq-q" type="button" aria-expanded="false" aria-controls="o-a1" id="o-q1">Quem pode participar?<span class="faq-icon" aria-hidden="true"></span></button>
            <div class="faq-a" id="o-a1" role="region" aria-labelledby="o-q1"><div><p>Os critérios são informados no edital de cada processo seletivo.</p></div></div>
          </div>
          <div class="faq-item">
            <button class="faq-q" type="button" aria-expanded="false" aria-controls="o-a2" id="o-q2">Preciso ter experiência?<span class="faq-icon" aria-hidden="true"></span></button>
            <div class="faq-a" id="o-a2" role="region" aria-labelledby="o-q2"><div><p>Isso depende do edital de cada ciclo. Leia os requisitos antes de fazer a inscrição.</p></div></div>
          </div>
          <div class="faq-item">
            <button class="faq-q" type="button" aria-expanded="false" aria-controls="o-a3" id="o-q3">Quando abre o próximo processo?<span class="faq-icon" aria-hidden="true"></span></button>
            <div class="faq-a" id="o-a3" role="region" aria-labelledby="o-q3"><div><p>Ainda não há uma data confirmada. A novidade será publicada no Instagram do Órbita.</p></div></div>
          </div>
        </div>
      </div>
    </section>`,
});

/* ---- /contato ---- */
pages.push({
  url: '/contato/',
  file: 'contato/index.html',
  section: '/contato/',
  title: 'Contato',
  description:
    'Fale com a EJUVV para pedir um orçamento ou tirar dúvidas sobre nossos serviços.',
  body: `${pageHero(
    'Contato e orçamento',
    'Conte o que você precisa.',
    'Envie as informações do projeto pelo formulário ou fale direto com a equipe pelo WhatsApp.'
  )}

    <section class="section">
      <div class="container split" style="align-items:start">

        <div>
          <div data-reveal>
            <span class="eyebrow">Canais oficiais</span>
            <h2>Fale com a EJUVV</h2>
            <p class="lead">Escolha o canal mais prático para você.</p>
          </div>

          <div class="contact-details" style="margin-top:30px" data-reveal data-reveal-delay="100">
            <div class="contact-row">${icon('i-mail')}<div><small>E-mail</small><a href="mailto:comercial@ejuvv.com">comercial@ejuvv.com</a></div></div>
            <div class="contact-row">${icon('i-message-circle')}<div><small>WhatsApp</small><a href="https://wa.me/5527993117132" target="_blank" rel="noreferrer">(27) 99311-7132</a></div></div>
            <div class="contact-row">${icon('i-map-pin')}<div><small>Localização</small><span>Universidade Vila Velha, Vila Velha/ES</span></div></div>
            <div class="contact-row">${icon('i-clock')}<div><small>Atendimento</small><span>Segunda a sexta, das 9h às 18h</span></div></div>
            <div class="contact-row">${icon('i-instagram')}<div><small>Redes sociais</small><a href="https://instagram.com/ejuvv" target="_blank" rel="noreferrer">@ejuvv</a></div></div>
          </div>

          <div class="map-frame" id="map-frame" style="margin-top:34px" data-reveal>
            <iframe title="Mapa da região da Universidade Vila Velha" tabindex="-1" loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-40.31043%2C-20.3715%2C-40.28643%2C-20.3543&amp;layer=mapnik&amp;marker=-20.3556038%2C-40.2984255"></iframe>
            <a class="map-card" target="_blank" rel="noreferrer"
               aria-label="Abrir a localização da EJUVV na Universidade Vila Velha no Google Maps"
               href="https://www.google.com/maps/place/EJUVV/@-20.3543106,-40.2992636,17z/data=!4m12!1m5!3m4!2zMjDCsDIxJzE1LjUiUyA0MMKwMTcnNTcuNCJX!8m2!3d-20.3543106!4d-40.2992636!3m5!1s0xb81797c7fc676d:0x207bbcc835473b2b!8m2!3d-20.3556038!4d-40.2984255!16s%2Fg%2F11gtg815n9?entry=ttu">
              ${icon('i-map-pin')}
              <span><strong>EJUVV, Universidade Vila Velha</strong><small>Vila Velha/ES · Abrir no mapa</small></span>
            </a>
          </div>
        </div>

        <div class="form-card" data-reveal data-reveal-delay="140">
          <span class="eyebrow">Peça um orçamento</span>
          <h3 style="margin-bottom:24px">Envie os dados do projeto.</h3>

          <form id="contact-form" novalidate>
            <div class="field-grid">
              <div class="field"><label for="f-name">Nome completo</label><input id="f-name" name="name" autocomplete="name" placeholder="Como podemos chamar você?" required></div>
              <div class="field"><label for="f-company">Empresa</label><input id="f-company" name="company" autocomplete="organization" placeholder="Nome da empresa" required></div>
              <div class="field"><label for="f-email">E-mail</label><input id="f-email" type="email" name="email" autocomplete="email" placeholder="voce@empresa.com" required></div>
              <div class="field"><label for="f-phone">WhatsApp</label><input id="f-phone" name="phone" inputmode="tel" autocomplete="tel" placeholder="(27) 99999-9999" required></div>
              <div class="field"><label for="f-service">Serviço de interesse</label><select id="f-service" name="service" required><option value="" disabled selected>Selecione uma solução</option></select></div>
              <div class="field"><label for="f-size">Porte do negócio</label><select id="f-size" name="size" required><option value="" disabled selected>Selecione uma opção</option></select></div>
              <div class="field full"><label for="f-message">O que você precisa?</label><textarea id="f-message" name="message" rows="5" placeholder="Descreva o projeto, o problema atual e o resultado esperado." required></textarea></div>
            </div>

            <input class="honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">

            <label class="consent">
              <input type="checkbox" name="consent" required>
              <span>Concordo com o tratamento dos meus dados para retorno deste contato, conforme a <a href="/politica-de-privacidade/">Política de Privacidade</a>.</span>
            </label>

            <button class="btn btn-primary" type="submit" data-magnetic style="width:100%;justify-content:center">Continuar no WhatsApp ${icon('i-arrow-right')}</button>
          </form>

          <div class="form-success" id="form-success" hidden>
            <span class="tick" aria-hidden="true">✓</span>
            <h3 tabindex="-1">Mensagem preparada</h3>
            <p>O WhatsApp foi aberto com os dados do formulário. Se isso não aconteceu, fale com a gente pelo número <a class="text-link" href="https://wa.me/5527993117132" target="_blank" rel="noreferrer">(27) 99311-7132</a>.</p>
            <button class="btn btn-outline" type="button" id="form-reset">Enviar outra mensagem</button>
          </div>
        </div>

      </div>
    </section>`,
});

/* ---- legais ---- */
pages.push({
  url: '/politica-de-privacidade/',
  file: 'politica-de-privacidade/index.html',
  section: '',
  title: 'Política de Privacidade',
  description: 'Como tratamos as informações enviadas por você nos canais digitais da EJUVV.',
  body: `${pageHero(
    'Transparência',
    'Política de Privacidade',
    'Como tratamos as informações enviadas por você nos canais digitais da EJUVV.'
  )}

    <section class="section">
      <div class="container prose" data-reveal>
        <div><h2>Dados coletados</h2><p>Podemos coletar dados informados voluntariamente em formulários, como nome, empresa, e-mail, telefone, serviço de interesse e mensagem.</p></div>
        <div><h2>Finalidade</h2><p>Os dados são usados para responder solicitações, entender necessidades comerciais e manter o relacionamento solicitado pelo titular.</p></div>
        <div><h2>Compartilhamento e segurança</h2><p>As informações não devem ser comercializadas. O acesso deve ser limitado às pessoas responsáveis pelo atendimento e aos fornecedores necessários para operar o serviço.</p></div>
        <div><h2>Direitos do titular</h2><p>Você pode solicitar confirmação, acesso, correção ou exclusão de dados pessoais pelos canais oficiais de contato.</p></div>
        <div><h2>Contato</h2><p>Dúvidas sobre privacidade podem ser encaminhadas para <a class="text-link" href="mailto:comercial@ejuvv.com">comercial@ejuvv.com</a>.</p></div>
      </div>
    </section>`,
});

pages.push({
  url: '/termos-de-uso/',
  file: 'termos-de-uso/index.html',
  section: '',
  title: 'Termos de Uso',
  description: 'Condições gerais para navegação e uso dos conteúdos deste site.',
  body: `${pageHero(
    'Transparência',
    'Termos de Uso',
    'Condições gerais para navegação e uso dos conteúdos deste site.'
  )}

    <section class="section">
      <div class="container prose" data-reveal>
        <div><h2>Uso do conteúdo</h2><p>Os conteúdos deste site têm caráter institucional e informativo. Escopos, prazos e condições comerciais são definidos exclusivamente em proposta formal.</p></div>
        <div><h2>Atualizações</h2><p>Informações sobre serviços, projetos e processos seletivos podem ser atualizadas para refletir a atuação vigente da EJUVV.</p></div>
        <div><h2>Contato</h2><p>Em caso de dúvidas, utilize os canais oficiais apresentados na página de contato.</p></div>
      </div>
    </section>`,
});

/* ------------------------------------------------------------------ write */
for (const page of pages) {
  const dest = join(ROOT, page.file);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, shell(page), 'utf8');
  console.log('✓', page.file);
}

/* ---- sitemap + robots ---- */
const urls = ['/', ...pages.map((p) => p.url)];
const today = new Date().toISOString().slice(0, 10);

await writeFile(
  join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>https://ejuvv.com${u}</loc><lastmod>${today}</lastmod><priority>${
        u === '/' ? '1.0' : '0.7'
      }</priority></url>`
  )
  .join('\n')}
</urlset>
`,
  'utf8'
);
console.log('✓ sitemap.xml', urls.length, 'URLs');

await writeFile(
  join(ROOT, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: https://ejuvv.com/sitemap.xml
`,
  'utf8'
);
console.log('✓ robots.txt');
