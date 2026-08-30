import { useEffect, useRef, useState } from 'react';
import { useSitePreferences } from './shared/SiteTools';
import { PublicFooter, PublicHeader } from './shared/SiteChrome';

const installCommand = 'curl -fsSL https://dashlabplus.vercel.app/install.sh | sh';

const features = [
  [
    '⌘',
    'Workspace livre',
    'Flexible workspace',
    'Organize aplicações, widgets e seções em um canvas ajustável. Desktop e celular mantêm layouts próprios.',
    'Arrange applications, widgets, and sections on a flexible canvas. Desktop and mobile keep their own layouts.',
  ],
  [
    '⌁',
    'Métricas locais',
    'Local metrics',
    'CPU, memória, rede e discos consultados no Prometheus sem expor seu servidor de métricas ao navegador.',
    'Read CPU, memory, network, and disk data from Prometheus without exposing your metrics server to the browser.',
  ],
  [
    '◉',
    'Status dos serviços',
    'Service status',
    'Latência e disponibilidade dos seus aplicativos verificadas pela API dentro da mesma rede do homelab.',
    'Application latency and availability checked by the API from inside your homelab network.',
  ],
  [
    '◇',
    'Identidade e acesso',
    'Identity and access',
    'Cada instalação cria um administrador, que pode convidar usuários comuns. Branding, permissões e preferências ficam no seu banco local.',
    'Each installation creates an administrator who can add regular users. Branding, permissions, and preferences stay in your local database.',
  ],
  [
    '▣',
    'PWA instalável',
    'Installable PWA',
    'Instale como aplicativo no desktop, Android ou iOS, com manifesto e identidade derivados do dashboard.',
    'Install it as an app on desktop, Android, or iOS, with a manifest and identity derived from your dashboard.',
  ],
  [
    '●',
    'Estado portátil',
    'Portable state',
    'Configuração e imagens persistidas em um volume SQLite simples de copiar, inspecionar e restaurar.',
    'Configuration and images persist in a SQLite volume that is easy to copy, inspect, and restore.',
  ],
] as const;

export function LandingPage() {
  const { language, theme, text, toggleLanguage, toggleTheme } = useSitePreferences({
    pt: 'DashLab+ — seu homelab, do seu jeito',
    en: 'DashLab+ — your homelab, your way',
  });
  const [copied, setCopied] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('.reveal');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }),
      { threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onPointerMove = (event: PointerEvent) => {
      const stage = dashboardRef.current;
      if (!stage || window.innerWidth < 900) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 5;
      const y = (event.clientY / window.innerHeight - 0.5) * -5;
      stage.style.transform = `perspective(1200px) rotateX(${y}deg) rotateY(${x}deg)`;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  async function copyCommand() {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <div className="signal-field" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <PublicHeader landing language={language} theme={theme} text={text} toggleLanguage={toggleLanguage} toggleTheme={toggleTheme} />

      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy reveal">
            <p className="eyebrow">
              <span /> MULTI-USER · SELF-HOSTED · OPEN SOURCE
            </p>
            <h1>
              {text('Seu homelab,', 'Your homelab,')}
              <br />
              <em>{text('em uma única superfície.', 'in one unified workspace.')}</em>
            </h1>
            <p className="hero-intro">
              {text(
                'O DashLab+ reúne serviços, métricas e atalhos em um workspace pessoal que você controla por inteiro. Sem nuvem obrigatória, sem conta externa, sem ruído.',
                'DashLab+ brings services, metrics, and shortcuts into a personal workspace you fully control. No mandatory cloud, no external account, no noise.',
              )}
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#instalacao">
                {text('Ver como instalar', 'See how to install')} <span>→</span>
              </a>
              <a className="button secondary" href="/docs/">
                {text('Ler documentação', 'Read the docs')}
              </a>
            </div>
            <div className="hero-proof" aria-label={text('Resumo do produto', 'Product summary')}>
              <div>
                <strong>01</strong>
                <span>{text('Servidor local', 'Local server')}</span>
                <small>{text('Seus dados permanecem no homelab.', 'Your data stays in the homelab.')}</small>
              </div>
              <div>
                <strong>02</strong>
                <span>{text('Acesso por papéis', 'Role-based access')}</span>
                <small>{text('Admin e usuários no mesmo workspace.', 'Admins and users in one workspace.')}</small>
              </div>
              <div>
                <strong>03</strong>
                <span>{text('Atualização em um clique', 'One-click updates')}</span>
                <small>{text('Frontend e API seguem juntos.', 'Frontend and API move together.')}</small>
              </div>
            </div>
          </div>
          <div
            className="dashboard-stage reveal"
            aria-label={text('Prévia conceitual do DashLab+', 'DashLab+ concept preview')}
          >
            <div className="stage-orbit orbit-a" />
            <div className="stage-orbit orbit-b" />
            <div className="dashboard-window" ref={dashboardRef}>
              <div className="window-bar">
                <div className="mini-brand">
                  <b>
                    <img src="/logo.svg" alt="" />
                  </b>
                  <span>
                    DASHLAB+<small>WORKSPACE</small>
                  </span>
                </div>
                <div className="window-clock">22:14</div>
                <div className="window-status">
                  <i /> NODE READY
                </div>
              </div>
              <div className="window-grid">
                <article className="metric orange">
                  <small>{text('PROCESSAMENTO', 'PROCESSING')}</small>
                  <strong>
                    18<sup>%</sup>
                  </strong>
                  <span className="spark">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </article>
                <article className="metric">
                  <small>{text('MEMÓRIA', 'MEMORY')}</small>
                  <strong>
                    42<sup>%</sup>
                  </strong>
                  <span className="meter">
                    <i />
                  </span>
                </article>
                <article className="service">
                  <span className="service-icon">P</span>
                  <div>
                    <strong>Proxmox</strong>
                    <small>12 ms</small>
                  </div>
                  <i className="online" />
                </article>
                <article className="service">
                  <span className="service-icon">N</span>
                  <div>
                    <strong>NAS</strong>
                    <small>8 ms</small>
                  </div>
                  <i className="online" />
                </article>
                <article className="metric wide">
                  <small>{text('REDE · ÚLTIMA HORA', 'NETWORK · LAST HOUR')}</small>
                  <strong>
                    84.2 <sup>MB/s</sup>
                  </strong>
                  <svg viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 50 C25 44 35 18 60 30 S95 52 120 32 S160 8 185 25 S220 45 245 21 S280 18 300 9" />
                  </svg>
                </article>
                <article className="service">
                  <span className="service-icon">G</span>
                  <div>
                    <strong>Grafana</strong>
                    <small>online</small>
                  </div>
                  <i className="online" />
                </article>
                <article className="service">
                  <span className="service-icon">H</span>
                  <div>
                    <strong>Home</strong>
                    <small>online</small>
                  </div>
                  <i className="online" />
                </article>
              </div>
              <footer>
                <span>DL—01 / LOCAL</span>
                <span>04 SERVICES</span>
                <span>
                  <i /> SYSTEM READY
                </span>
              </footer>
            </div>
          </div>
          <a className="scroll-cue" href="#manifesto">
            {text('EXPLORE O SISTEMA', 'EXPLORE THE SYSTEM')} <span>↓</span>
          </a>
        </section>

        <section className="manifesto section-shell" id="manifesto">
          <p className="section-index">01 / {text('PRINCÍPIO', 'PRINCIPLE')}</p>
          <div className="manifesto-copy reveal">
            <p>
              {text(
                'Um dashboard pessoal não precisa de uma plataforma inteira por trás.',
                'A personal dashboard does not need an entire platform behind it.',
              )}
            </p>
            <h2>
              {text('Seu servidor.', 'Your server.')}
              <br />
              {text('Seus dados.', 'Your data.')}
              <br />
              <em>{text('Sua interface.', 'Your interface.')}</em>
            </h2>
            <div className="principle-list" aria-label={text('Princípios do DashLab+', 'DashLab+ principles')}>
              <div>
                <strong>{text('LOCAL', 'LOCAL')}</strong>
                <span>{text('Roda onde seus dados estão.', 'Runs where your data lives.')}</span>
              </div>
              <div>
                <strong>{text('PRIVADO', 'PRIVATE')}</strong>
                <span>{text('Sem conta externa ou nuvem obrigatória.', 'No external account or mandatory cloud.')}</span>
              </div>
              <div>
                <strong>{text('COMPOSTO', 'COMPOSABLE')}</strong>
                <span>{text('Serviços, métricas e atalhos em um só lugar.', 'Services, metrics, and shortcuts in one place.')}</span>
              </div>
            </div>
          </div>
          <aside className="manifesto-note reveal">
            <span>{text('FILOSOFIA', 'PHILOSOPHY')}</span>
            <p>
              {text(
                'O DashLab+ foi reduzido ao essencial: um frontend expressivo, uma API Go pequena e um único arquivo SQLite. A landing vive na borda; sua instalação continua dentro de casa.',
                'DashLab+ is reduced to the essentials: an expressive frontend, a small Go API, and one SQLite file. The landing page lives at the edge; your installation stays at home.',
              )}
            </p>
            <div className="philosophy-list">
              <div>
                <strong>{text('CONTROLE', 'CONTROL')}</strong>
                <span>{text('Você decide onde os dados vivem e quem pode acessá-los.', 'You decide where data lives and who can access it.')}</span>
              </div>
              <div>
                <strong>{text('CLAREZA', 'CLARITY')}</strong>
                <span>{text('Uma interface direta, sem camadas, contas ou serviços obrigatórios.', 'A direct interface without layers, accounts, or mandatory services.')}</span>
              </div>
              <div>
                <strong>{text('CONTINUIDADE', 'CONTINUITY')}</strong>
                <span>{text('Seu workspace permanece portátil, legível e fácil de restaurar.', 'Your workspace stays portable, readable, and easy to restore.')}</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="features section-shell" id="recursos">
          <header className="section-heading reveal">
            <p className="section-index">02 / {text('RECURSOS', 'FEATURES')}</p>
            <h2>
              {text('Menos infraestrutura.', 'Less infrastructure.')}
              <br />
              <em>{text('Mais controle.', 'More control.')}</em>
            </h2>
            <p>
              {text(
                'Construído para sua equipe, vários dispositivos e um homelab de verdade.',
                'Built for your team, multiple devices, and a real homelab.',
              )}
            </p>
          </header>
          <div className="feature-grid">
            {features.map(([symbol, ptTitle, enTitle, ptBody, enBody], index) => (
              <article className="feature-card reveal" key={ptTitle}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div className="feature-symbol">{symbol}</div>
                <h3>{text(ptTitle, enTitle)}</h3>
                <p>{text(ptBody, enBody)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="architecture section-shell" id="arquitetura">
          <div className="architecture-copy reveal">
            <p className="section-index">03 / {text('ARQUITETURA', 'ARCHITECTURE')}</p>
            <h2>
              {text('Uma imagem.', 'One image.')}
              <br />
              <em>{text('Um propósito.', 'One purpose.')}</em>
            </h2>
            <p>
              {text(
                'Autenticação local, sem ORM ou banco remoto. Você define os usuários e o limite de confiança da sua rede.',
                'Local authentication, with no ORM or remote database. You define the users and your network trust boundary.',
              )}
            </p>
            <a className="text-link" href="/docs/#arquitetura">
              {text('ENTENDER A ARQUITETURA', 'UNDERSTAND THE ARCHITECTURE')} <span>→</span>
            </a>
          </div>
          <div className="system-map reveal">
            <div className="node primary-node">
              <small>INTERFACE</small>
              <strong>React + Vite</strong>
              <span>
                {text('Landing + Lab responsivo', 'Responsive landing + Lab')}
              </span>
            </div>
            <div className="connector">
              <i />
              <span>HTTP / JSON</span>
            </div>
            <div className="node">
              <small>{text('SERVIÇO LOCAL', 'LOCAL SERVICE')}</small>
              <strong>API Go</strong>
              <span>
                {text(
                  'Arquivos web, persistência e integrações',
                  'Web files, persistence, and integrations',
                )}
              </span>
            </div>
            <div className="branch">
              <i />
              <i />
              <i />
            </div>
            <div className="node small-node">
              <small>{text('ESTADO', 'STATE')}</small>
              <strong>SQLite</strong>
              <span>/data/dashlab-plus.db</span>
            </div>
            <div className="node small-node">
              <small>{text('TELEMETRIA', 'TELEMETRY')}</small>
              <strong>Prometheus</strong>
              <span>{text('Rede privada', 'Private network')}</span>
            </div>
            <div className="node small-node">
              <small>{text('ENTREGA', 'DELIVERY')}</small>
              <strong>Go HTTP</strong>
              <span>Landing + Lab + /api</span>
            </div>
          </div>
        </section>

        <section className="installation section-shell" id="instalacao">
          <header className="section-heading reveal">
            <p className="section-index">04 / {text('INSTALAÇÃO', 'INSTALLATION')}</p>
            <h2>
              {text('Do zero ao painel', 'From zero to dashboard')}
              <br />
              <em>{text('em um único comando.', 'with a single command.')}</em>
            </h2>
          </header>
          <div className="install-layout">
            <ol className="steps reveal">
              <li>
                <span>01</span>
                <div>
                  <strong>{text('Execute o instalador', 'Run the installer')}</strong>
                  <p>
                    {text(
                      'O script verifica Docker e Compose antes de baixar a imagem oficial.',
                      'The script checks Docker and Compose before downloading the official image.',
                    )}
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>{text('Personalize se precisar', 'Customize when needed')}</strong>
                  <p>
                    {text('Porta e Prometheus ficam em', 'Port and Prometheus settings live at')}{' '}
                    <code>~/.dashlab-plus/.env</code>.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>{text('Acesse o painel', 'Open your dashboard')}</strong>
                  <p>
                    {text(
                      'Configuração e imagens permanecem no volume SQLite entre atualizações.',
                      'Configuration and images remain in the SQLite volume across updates.',
                    )}
                  </p>
                </div>
              </li>
            </ol>
            <div className="terminal reveal">
              <header>
                <span />
                <span />
                <span />
                <small>dashlab-plus / install</small>
              </header>
              <pre>
                <code>
                  <i>$</i> {installCommand}
                  {'\n\n'}
                  <span># {text('interface disponível em', 'interface available at')}</span>
                  {'\n'}http://seu-servidor:3000
                </code>
              </pre>
              <button type="button" onClick={copyCommand}>
                {copied ? text('Copiado', 'Copied') : text('Copiar comando', 'Copy command')}
              </button>
            </div>
          </div>
          <div className="install-actions reveal">
            <a className="button primary" href="/docs/#instalacao">
              {text('Guia completo', 'Complete guide')} <span>→</span>
            </a>
            <a className="button secondary" href="https://github.com/ferforastieri/dashlab">
              {text('Ver código-fonte ↗', 'View source code ↗')}
            </a>
          </div>
        </section>

        <section className="closing">
          <div className="closing-grid" aria-hidden="true" />
          <div className="reveal">
            <p className="eyebrow">
              <span /> LOCAL BY DESIGN
            </p>
            <h2>
              {text('Transforme serviços soltos', 'Turn scattered services')}
              <br />
              {text('no seu', 'into your')} <em>{text('centro de comando.', 'command center.')}</em>
            </h2>
            <p>
              {text(
                'Leve, direto e sob seu controle.',
                'Lightweight, direct, and under your control.',
              )}
            </p>
            <a className="button primary" href="/docs/#instalacao">
              {text('Ver guia de instalação', 'View installation guide')} <span>→</span>
            </a>
          </div>
        </section>
      </main>

      <PublicFooter language={language} text={text} />
    </>
  );
}
