/**
 * Conteúdo institucional da EJUVV.
 * Fonte de verdade para serviços, projetos e dados institucionais.
 */

export const site = {
  email: 'comercial@ejuvv.com',
  phone: '(27) 99311-7132',
  whatsapp: '5527993117132',
  address: 'Universidade Vila Velha, Vila Velha/ES',
  hours: 'Segunda a sexta, das 9h às 18h',
  instagram: 'https://instagram.com/ejuvv',
  orbitaInstagram: 'https://www.instagram.com/ejuvv.orbita/',
};

export const indicators = [
  { value: '4,4', label: 'NPS' },
  { value: '+231', label: 'Alunos impactados' },
  { value: '+46', label: 'Projetos' },
  { value: '48', label: 'Clientes' },
];

export const services = [
  {
    slug: 'e-commerce',
    icon: 'i-panels',
    title: 'E-commerce',
    problem: 'A empresa quer vender pela internet, mas ainda não tem uma loja simples de usar.',
    description: 'Planejamos e desenvolvemos lojas virtuais responsivas, com produtos bem organizados e um caminho de compra fácil de entender.',
    audience:
      'Para quem vai começar a vender online ou precisa organizar melhor uma operação que já existe.',
    deliverables: [
      'Arquitetura da loja',
      'Organização de produtos',
      'Design responsivo',
      'Integração com canais de contato ou compra',
    ],
  },
  {
    slug: 'site-institucional',
    icon: 'i-panels',
    title: 'Site Institucional',
    problem: 'O site está desatualizado, ou a empresa ainda depende apenas das redes sociais.',
    description: 'Criamos sites que apresentam a empresa, seus serviços e as formas de contato sem complicar a navegação.',
    audience:
      'Para empresas que precisam explicar bem o que fazem e ter um canal próprio para receber contatos.',
    deliverables: [
      'Arquitetura de conteúdo',
      'Design responsivo',
      'Desenvolvimento do site',
      'Orientação para publicação',
    ],
  },
  {
    slug: 'landing-pages',
    icon: 'i-file-text',
    title: 'Landing Pages',
    problem: 'Uma campanha precisa de uma página própria para explicar a oferta e receber contatos.',
    description: 'Desenvolvemos páginas focadas em uma única ação, como pedir orçamento, fazer cadastro ou agendar atendimento.',
    audience:
      'Para profissionais e empresas que vão lançar ou divulgar um serviço, produto, evento ou campanha específica.',
    deliverables: [
      'Estrutura da oferta',
      'Texto e hierarquia da página',
      'Design responsivo',
      'Botões e canais de conversão',
    ],
  },
  {
    slug: 'automacao-de-atendimento',
    icon: 'i-waypoints',
    title: 'Automação de Atendimento',
    problem: 'A equipe perde tempo repetindo respostas e encaminhando contatos manualmente.',
    description:
      'Organizamos fluxos automáticos para responder dúvidas iniciais, coletar informações e encaminhar cada contato.',
    audience:
      'Para negócios que recebem muitos contatos e precisam organizar o primeiro atendimento sem aumentar o trabalho da equipe.',
    deliverables: [
      'Mapeamento do atendimento atual',
      'Fluxos de perguntas e respostas',
      'Organização de canais',
      'Orientação de uso e acompanhamento',
    ],
  },
  {
    slug: 'sistemas-sob-medida',
    icon: 'i-database',
    title: 'Sistemas Sob Medida',
    problem: 'Planilhas e tarefas manuais já não acompanham a rotina da empresa.',
    description: 'Desenvolvemos sistemas para reunir informações, reduzir tarefas repetitivas e facilitar o acompanhamento da operação.',
    audience: 'Para empresas que não encontram uma ferramenta pronta que se encaixe em seus processos internos.',
    deliverables: [
      'Levantamento de requisitos',
      'Arquitetura da solução',
      'Desenvolvimento da interface',
      'Entrega e orientação de uso',
    ],
  },
];

export const process = [
  'Conversa e diagnóstico',
  'Escopo e proposta',
  'Planejamento',
  'Desenvolvimento com acompanhamento',
  'Entrega e orientação de uso',
];

export const values = [
  { title: 'Ser destemido', description: 'A gente encara o que ainda não sabe e vai atrás da resposta.' },
  {
    title: 'Não passar despercebido',
    description: 'Cuidamos do trabalho para que a entrega seja lembrada pelo que resolve.',
  },
  { title: 'Não ficar parado', description: 'Testamos, pedimos retorno e melhoramos o que for preciso.' },
  { title: 'Ao infinito e além', description: 'Ambição, para nós, vem acompanhada de responsabilidade.' },
  {
    title: 'Linhagem EJUVV',
    description: 'Quem entra aprende com quem veio antes e deixa caminho para quem vem depois.',
  },
];

export const projects = [
  {
    slug: 'sites-profissionais-saude',
    title: 'Sites para três profissionais da saúde',
    category: 'Sites e landing pages',
    status: '3 sites publicados',
    challenge:
      'Três profissionais da saúde precisavam apresentar seu trabalho na internet e facilitar o agendamento de consultas e avaliações.',
    solution:
      'Criamos um site para cada profissional. A estrutura foi adaptada ao conteúdo e à identidade de cada um, com informações de atendimento e acesso direto aos canais de agendamento.',
    deliverables: [
      'Identidade visual própria para cada site',
      'Organização dos textos e informações profissionais',
      'Botões de contato e agendamento',
      'Adaptação para celular, tablet e computador',
      'Publicação dos três sites',
    ],
    results:
      'Os três sites estão publicados e podem ser acessados pelos links abaixo.',
    sites: [
      {
        name: 'Dra. Karoliny Brum',
        specialty: 'Est\u00e9tica avan\u00e7ada',
        url: 'https://drakarolinybrum.com/',
        image: '/assets/img/projects/site-karoliny-brum-home.png',
        note:
          'A página apresenta a profissional, reúne os procedimentos e leva o visitante ao agendamento pelo WhatsApp.',
      },
      {
        name: 'Eduarda do Nascimento Manzoli',
        specialty: 'Psicologia e psican\u00e1lise',
        url: 'https://eduardamanzolipsi.com.br/',
        image: '/assets/img/projects/site-eduarda-nascimento-home.png',
        note:
          'O site organiza a abordagem clínica, a apresentação da profissional e as informações de atendimento em uma leitura tranquila.',
      },
      {
        name: 'Dr. Pedro Calegari',
        specialty: 'Ortopedia e traumatologia',
        url: 'https://drpedrocalegari.com.br/',
        image: '/assets/img/projects/site-pedro-calegari-home.png',
        note:
          'A página destaca formação, áreas de atuação e as formas de marcar uma consulta.',
      },
    ],
  },
];
export const orbitaBenefits = [
  'Experiência real de mercado',
  'Desenvolvimento de liderança',
  'Networking',
  'Capacitações',
  'Movimento Empresa Júnior',
  'Trabalho multidisciplinar',
];

export const selection = {
  status: 'No momento, não há processo seletivo aberto',
  signupUrl: '#banco-de-talentos',
  steps: ['Inscrição', 'Conexão com a EJUVV', 'Etapa de desenvolvimento', 'Entrevista', 'Resultado'],
};

export const businessSizes = [
  'Profissional autônomo',
  'Microempresa',
  'Pequena empresa',
  'Outro',
];
