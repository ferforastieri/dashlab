import { Fragment } from 'react';
import { useSitePreferences } from '../shared/SiteTools';
import { PublicFooter, PublicHeader } from '../shared/SiteChrome';

const installCommand = 'curl -fsSL https://dashlabplus.vercel.app/install.sh | sh';

export function DocsPage() {
  const { language, theme, text, toggleLanguage, toggleTheme } = useSitePreferences({
    pt: 'Documentação — DashLab+',
    en: 'Documentation — DashLab+',
  });

  const navigation = [
    {
      title: text('COMECE AQUI', 'START HERE'),
      links: [
        ['#visao-geral', text('Visão geral', 'Overview')],
        ['#requisitos', text('Requisitos', 'Requirements')],
        ['#instalacao', text('Instalação', 'Installation')],
        ['#lab', text('Como funciona o Lab', 'How the Lab works')],
      ],
    },
    {
      title: text('CONFIGURAÇÃO', 'CONFIGURATION'),
      links: [
        ['#ambiente', text('Variáveis de ambiente', 'Environment variables')],
        ['#prometheus', 'Prometheus'],
        ['#primeiro-uso', text('Primeiro uso', 'First use')],
      ],
    },
    {
      title: text('REFERÊNCIA', 'REFERENCE'),
      links: [
        ['#arquitetura', text('Arquitetura', 'Architecture')],
        ['#persistencia', text('Persistência e backup', 'Persistence and backup')],
        ['#atualizacao', text('Atualização', 'Updating')],
        ['#seguranca', text('Segurança', 'Security')],
        ['#problemas', text('Solução de problemas', 'Troubleshooting')],
      ],
    },
  ];

  return (
    <>
      <PublicHeader language={language} theme={theme} text={text} toggleLanguage={toggleLanguage} toggleTheme={toggleTheme} />

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <nav aria-label={text('Documentação', 'Documentation')}>
            {navigation.map((group) => (
              <Fragment key={group.title}>
                <strong>{group.title}</strong>
                {group.links.map(([href, label]) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
              </Fragment>
            ))}
          </nav>
        </aside>

        <main className="docs-content">
          <div className="docs-hero" id="visao-geral">
            <p className="eyebrow">
              <span /> {text('DOCUMENTAÇÃO / V1', 'DOCUMENTATION / V1')}
            </p>
            <h1>DashLab+</h1>
            <p>
              {text(
                'Guia para instalar, configurar, usar e manter seu dashboard pessoal dentro do homelab.',
                'A guide to installing, configuring, using, and maintaining your personal dashboard inside the homelab.',
              )}
            </p>
            <div className="docs-callout">
              <strong>{text('Modelo single-user', 'Single-user model')}</strong>
              <p>
                {text(
                  'O DashLab+ não possui contas ou autenticação própria. Publique-o apenas em uma rede confiável, atrás de VPN ou de autenticação no proxy reverso.',
                  'O primeiro usuário é administrador e pode criar usuários comuns. Mantenha o Lab atrás de VPN ou proxy autenticado.',
                )}
              </p>
            </div>
          </div>

          <section>
            <h2>{text('Visão geral', 'Overview')}</h2>
            <p>
              {text(
                'O DashLab+ centraliza atalhos, métricas e disponibilidade dos serviços da sua rede. Uma única imagem contém a landing, o Lab e a API Go.',
                'DashLab+ centralizes shortcuts, metrics, and service availability on your network. A single image contains the landing page, Lab, and Go API.',
              )}
            </p>
            <div className="docs-callout">
              <strong>
                {text('Site público ou instalação local?', 'Public site or local installation?')}
              </strong>
              <p>
                {text(
                  'dashlabplus.vercel.app apresenta o projeto, hospeda esta documentação e entrega o instalador. O dashboard completo roda no seu servidor, normalmente em http://IP-DO-HOST:3000, com Docker, API e banco de dados.',
                  'dashlabplus.vercel.app presents the project, hosts this documentation, and delivers the installer. The complete dashboard runs on your server, usually at http://HOST-IP:3000, with Docker, API, and database.',
                )}
              </p>
            </div>
            <p>
              {text(
                'A API serve os arquivos web, persiste o estado no SQLite e integra Prometheus, clima e serviços internos. Todo o estado persistente fica no volume Docker dashlab_plus_data.',
                'The API serves web files, persists state in SQLite, and integrates Prometheus, weather, and internal services. All persistent state stays in the dashlab_plus_data Docker volume.',
              )}
            </p>
          </section>

          <section id="requisitos">
            <p className="doc-index">01</p>
            <h2>{text('Requisitos', 'Requirements')}</h2>
            <ul>
              <li>{text('Docker Engine 24 ou mais recente.', 'Docker Engine 24 or newer.')}</li>
              <li>{text('Docker Compose v2.', 'Docker Compose v2.')}</li>
              <li>
                {text(
                  'Um host Linux com acesso aos serviços monitorados.',
                  'A Linux host with access to the monitored services.',
                )}
              </li>
              <li>
                {text(
                  'Prometheus é opcional, mas necessário para widgets de CPU, memória, discos e rede.',
                  'Prometheus is optional, but required for CPU, memory, disk, and network widgets.',
                )}
              </li>
            </ul>
            <p>
              {text(
                'O navegador não precisa de Node.js no host de produção. As imagens oficiais suportam amd64 e arm64.',
                'The browser does not require Node.js on the production host. Official images support amd64 and arm64.',
              )}
            </p>
          </section>

          <section id="instalacao">
            <p className="doc-index">02</p>
            <h2>{text('Instalação', 'Installation')}</h2>
            <p>
              {text(
                'O comando abaixo automatiza o Docker Compose: baixa a configuração, busca a imagem oficial e inicia o container.',
                'The command below automates Docker Compose: it downloads the configuration, pulls the official image, and starts the container.',
              )}
            </p>
            <h3>{text('1. Execute', '1. Run')}</h3>
            <pre>
              <code>{installCommand}</code>
            </pre>
            <p>
              {text(
                'O instalador verifica Docker e Compose, cria ~/.dashlab-plus, configura um atualizador interno e preserva sua configuração entre atualizações.',
                'The installer checks Docker and Compose, creates ~/.dashlab-plus, configures an internal updater, and preserves your configuration across updates.',
              )}
            </p>
            <h3>{text('2. Configure, se necessário', '2. Configure if needed')}</h3>
            <p>
              {text(
                'As configurações são persistidas no banco. Para conectar o Prometheus e ajustar os filtros, abra Personalizar no Lab.',
                'Settings are persisted in the database. To connect Prometheus and adjust filters, open Customize in the Lab.',
              )}
            </p>
            <h3>{text('3. Confirme a saúde', '3. Check health')}</h3>
            <pre>
              <code>curl http://IP-DO-HOST:3000/api/health</code>
            </pre>
            <p>
              {text(
                'A resposta deve indicar status ok e armazenamento SQLite.',
                'The response must report an ok status and SQLite storage.',
              )}
            </p>
            <div className="docs-callout">
              <strong>
                {text('Prefere instalar manualmente?', 'Prefer a manual installation?')}
              </strong>
              <p>
                {text(
                  'O README no GitHub contém comandos para Docker Compose e docker run. As três opções usam a mesma imagem do GHCR.',
                  'The GitHub README includes Docker Compose and docker run commands. All three options use the same GHCR image.',
                )}
              </p>
            </div>
          </section>

          <section id="ambiente">
            <p className="doc-index">03</p>
            <h2>{text('Variáveis de ambiente', 'Environment variables')}</h2>
            <div className="docs-table">
              <table>
                <thead>
                  <tr>
                    <th>{text('Variável', 'Variable')}</th>
                    <th>{text('Padrão', 'Default')}</th>
                    <th>{text('Finalidade', 'Purpose')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>WEB_PORT</code>
                    </td>
                    <td>
                      <code>3000</code>
                    </td>
                    <td>
                      {text('Porta publicada pelo container.', 'Port published by the container.')}
                    </td>
                  </tr>
                  <tr><td><code>Updater</code></td><td>interno</td><td>{text('Serviço interno acionado pelo botão Atualizar.', 'Internal service triggered by the Update button.')}</td></tr>
                  <tr>
                    <td>
                      <code>PROMETHEUS_URL</code>
                    </td>
                    <td>—</td>
                    <td>
                      {text('Compatibilidade; prefira configurar em Personalizar → Integrações.', 'Compatibility fallback; prefer Customize → Integrations.')}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>PROMETHEUS_TARGET_LABELS</code>
                    </td>
                    <td>{text('vazio', 'empty')}</td>
                    <td>
                      {text(
                        'Labels comuns ao host monitorado.',
                        'Labels shared by the monitored host.',
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>PROMETHEUS_NETWORK_LABELS</code>
                    </td>
                    <td>
                      <code>device!=&quot;lo&quot;</code>
                    </td>
                    <td>
                      {text(
                        'Interfaces incluídas nas métricas.',
                        'Interfaces included in metrics.',
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>PROMETHEUS_DISK_LABELS</code>
                    </td>
                    <td>NVMe / sdX</td>
                    <td>{text('Discos incluídos nas consultas.', 'Disks included in queries.')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              {text(
                'DATABASE_PATH, WEB_ROOT e PORT já são definidos pela imagem. Altere-os somente ao executar o binário Go fora do Docker.',
                'DATABASE_PATH, WEB_ROOT, and PORT are already defined by the image. Change them only when running the Go binary outside Docker.',
              )}
            </p>
          </section>

          <section id="prometheus">
            <p className="doc-index">04</p>
            <h2>Prometheus</h2>
            <p>
              {text(
                'Configure a URL e o token em Lab → Personalizar → Integrações. A URL precisa ser resolvida de dentro do container dashlab-plus. Use um IP da LAN ou um nome DNS disponível na mesma rede Docker.',
                'Configure the URL and token in Lab → Customize → Integrations. The URL must resolve from inside the dashlab-plus container. Use a LAN IP or a DNS name available on the same Docker network.',
              )}
            </p>
            <pre>
              <code>{`PROMETHEUS_URL=http://192.168.15.20:9090
PROMETHEUS_TARGET_LABELS=instance="node-exporter:9100"
PROMETHEUS_NETWORK_LABELS=device=~"enp.*|eth.*",device!="lo"
PROMETHEUS_DISK_LABELS=device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"`}</code>
            </pre>
            <p>
              {text(
                'Sem PROMETHEUS_URL, o dashboard continua funcionando, mas os widgets de sistema, armazenamento e rede ficam indisponíveis.',
                'Without PROMETHEUS_URL, the dashboard keeps working, but system, storage, and network widgets remain unavailable.',
              )}
            </p>
          </section>

          <section id="primeiro-uso">
            <p className="doc-index">05</p>
            <h2>{text('Primeiro uso', 'First use')}</h2>
            <ol>
              <li>
                {text(
                  'Abra Personalizar para definir nome, cores, logo, favicon, wallpaper, escala e comportamento mobile.',
                  'Open Customize to set the name, colors, logo, favicon, wallpaper, scale, and mobile behavior.',
                )}
              </li>
              <li>
                {text(
                  'Use Adicionar para cadastrar aplicativos, widgets ou seções.',
                  'Use Add to create applications, widgets, or sections.',
                )}
              </li>
              <li>
                {text(
                  'Em aplicativos, informe o endereço principal e, opcionalmente, uma URL de status e um deep link mobile.',
                  'For applications, provide the main address and optionally a status URL and mobile deep link.',
                )}
              </li>
              <li>
                {text(
                  'Crie widgets de sistema, armazenamento, rede, relógio, status, PromQL ou divisória.',
                  'Create system, storage, network, clock, status, PromQL, or divider widgets.',
                )}
              </li>
              <li>
                {text(
                  'No desktop, ative Editar organização, selecione um item e arraste ou redimensione pelas alças.',
                  'On desktop, enable Edit layout, select an item, and drag it or resize it with the handles.',
                )}
              </li>
              <li>
                {text(
                  'No celular, escolha Grade, Menu lateral ou Barra inferior em Personalizar.',
                  'On mobile, choose Grid, Side menu, or Bottom bar under Customize.',
                )}
              </li>
              <li>
                {text(
                  'Instale o PWA pelo menu do navegador para abrir o dashboard como aplicativo.',
                  'Install the PWA from the browser menu to open the dashboard as an app.',
                )}
              </li>
            </ol>
            <p>
              {text(
                'As alterações são salvas imediatamente no SQLite e ficam disponíveis em todos os seus dispositivos.',
                'Changes are immediately saved to SQLite and become available on all your devices.',
              )}
            </p>
          </section>

          <section id="lab">
            <p className="doc-index">06</p>
            <h2>{text('Como funciona o Lab', 'How the Lab works')}</h2>
            <p>
              {text(
                'O Lab é o dashboard operacional do DashLab+. O primeiro usuário é administrador e pode criar usuários comuns, que acessam e editam o dashboard sem gerenciar contas ou atualizações.',
                'The Lab is DashLab+’s operational dashboard. The first user is an administrator and can create regular users, who can access and edit the dashboard without managing accounts or updates.',
              )}
            </p>
            <h3>{text('Aplicações e seções', 'Applications and sections')}</h3>
            <p>
              {text(
                'Cadastre cada serviço com nome, URL, descrição, ícone, URL de status e deep link mobile. Aplicações podem ser agrupadas em seções recolhíveis; o indicador de disponibilidade consulta a URL de status (ou a URL principal quando ela não existe).',
                'Register each service with a name, URL, description, icon, status URL, and mobile deep link. Applications can be grouped into collapsible sections; the availability indicator checks the status URL (or the main URL when none is provided).',
              )}
            </p>
            <h3>{text('Widgets e métricas', 'Widgets and metrics')}</h3>
            <p>
              {text(
                'Widgets de sistema, armazenamento e rede usam métricas do Prometheus. Status resume as verificações das aplicações, PromQL executa uma consulta configurada por você e relógio mostra a hora local. O clima exibido no cabeçalho usa localização configurada ou geolocalização do navegador; não é um widget editável.',
                'System, storage, and network widgets use Prometheus metrics. Status summarizes application checks, PromQL runs a query you configure, and the clock shows local time. Weather shown in the header uses configured coordinates or browser geolocation; it is not an editable widget.',
              )}
            </p>
            <h3>{text('Organização e personalização', 'Layout and customization')}</h3>
            <p>
              {text(
                'No desktop, ative Editar organização para selecionar, arrastar e redimensionar elementos. No celular, o Lab aplica o modo Grade, Menu lateral ou Barra inferior escolhido em Personalizar. Nome, cores, logo, favicon, wallpaper, escala e opacidade são salvos no dashboard.',
                'On desktop, enable Edit layout to select, drag, and resize elements. On mobile, the Lab applies the Grid, Side menu, or Bottom bar mode chosen in Customize. Name, colors, logo, favicon, wallpaper, scale, and opacity are saved with the dashboard.',
              )}
            </p>
            <h3>{text('API do Lab', 'Lab API')}</h3>
            <p>
              {text(
                'O frontend React conversa somente com a API Go local. A API valida e persiste alterações, consulta integrações e serve os arquivos estáticos. Os principais recursos são:',
                'The React frontend communicates only with the local Go API. The API validates and persists changes, queries integrations, and serves static files. Its main resources are:',
              )}
            </p>
            <ul>
              <li><code>GET /api/dashboard</code> — estado do dashboard e layouts.</li>
              <li><code>PUT /api/branding</code> — preferências visuais.</li>
              <li><code>POST/PATCH/DELETE /api/applications</code> — atalhos e serviços.</li>
              <li><code>POST/PATCH/DELETE /api/widgets</code> — widgets e configurações.</li>
              <li><code>GET /api/metrics/*</code> — métricas do Prometheus.</li>
              <li><code>GET /api/applications/status</code> — disponibilidade dos serviços.</li>
            </ul>
          </section>

          <section id="arquitetura">
            <p className="doc-index">07</p>
            <h2>{text('Arquitetura', 'Architecture')}</h2>
            <pre className="diagram">
              <code>{`Navegador
   │
   ▼
DashLab+ :3000
   ├── Landing + Lab
   ├── API /api
   ├── SQLite /data/dashlab-plus.db
   ├── Prometheus
   ├── Open-Meteo
   └── serviços da LAN`}</code>
            </pre>
            <p>
              {text(
                'Um único processo Go serve os arquivos React/Vite e a API consumida pelo dashboard. Ele guarda configuração e imagens no SQLite.',
                'A single Go process serves the React/Vite files and the API consumed by the dashboard. It stores configuration and images in SQLite.',
              )}
            </p>
            <h3>{text('Por que uma API ainda existe?', 'Why is there still an API?')}</h3>
            <p>
              {text(
                'O navegador não deve acessar diretamente o Prometheus e não consegue verificar todos os serviços internos por causa de CORS. A API também mantém o mesmo estado entre desktop e celular.',
                'The browser should not access Prometheus directly and cannot check every internal service because of CORS. The API also keeps the same state across desktop and mobile.',
              )}
            </p>
          </section>

          <section id="persistencia">
            <p className="doc-index">08</p>
            <h2>{text('Persistência e backup', 'Persistence and backup')}</h2>
            <p>
              {text(
                'O volume dashlab_plus_data contém o banco e os arquivos auxiliares de WAL. Pare o container antes de copiar o volume:',
                'The dashlab_plus_data volume contains the database and WAL auxiliary files. Stop the container before copying the volume:',
              )}
            </p>
            <pre>
              <code>{`docker stop dashlab-plus
docker run --rm -v dashlab_plus_data:/source -v "$PWD":/backup alpine \\
  tar -czf /backup/dashlab-plus-data.tar.gz -C /source .
docker start dashlab-plus`}</code>
            </pre>
            <p>
              {text(
                'Para restaurar, crie uma instalação limpa, pare o container e extraia o backup no mesmo volume. Mantenha uma cópia fora do host.',
                'To restore, create a clean installation, stop the container, and extract the backup into the same volume. Keep a copy outside the host.',
              )}
            </p>
          </section>

          <section id="atualizacao">
            <p className="doc-index">09</p>
            <h2>{text('Atualização', 'Updating')}</h2>
            <pre>
              <code>{installCommand}</code>
            </pre>
            <p>
              {text(
                'O instalador configura o updater interno. O volume SQLite permanece intacto durante as atualizações.',
                'The installer configures the internal updater. The SQLite volume remains intact during updates.',
              )}
            </p>
            <p>
              {text(
                'Quando uma versão publicada for detectada, o DashLab+ mostra um aviso. Clique em Atualizar para baixar a imagem nova e recriar o container; frontend e backend são atualizados juntos.',
                'When a published version is detected, DashLab+ shows a notice. Click Update to pull the new image and recreate the container; frontend and backend update together.',
              )}
            </p>
          </section>

          <section id="seguranca">
            <p className="doc-index">10</p>
            <h2>{text('Segurança', 'Security')}</h2>
            <div className="docs-callout warning">
              <strong>
                {text(
                  'Não exponha a aplicação diretamente à internet',
                  'Do not expose the application directly to the internet',
                )}
              </strong>
              <p>
                {text(
                  'A interface e a API exigem autenticação Basic. Mantenha a porta atrás de um proxy HTTPS e limite o acesso à LAN/VPN.',
                  'The interface and API require Basic authentication. Keep the port behind an HTTPS proxy and limit access to your LAN/VPN.',
                )}
              </p>
            </div>
            <ul>
              <li>
                {text(
                  'Prefira Tailscale, WireGuard ou outra VPN para acesso remoto.',
                  'Prefer Tailscale, WireGuard, or another VPN for remote access.',
                )}
              </li>
              <li>
                {text(
                  'Se usar proxy reverso público, exija autenticação em todas as rotas, inclusive /api.',
                  'If you use a public reverse proxy, require authentication on every route, including /api.',
                )}
              </li>
              <li>
                {text('Defina OUTBOUND_ALLOWLIST para hosts privados usados pelo Prometheus e pelos checks de status.', 'Set OUTBOUND_ALLOWLIST for private hosts used by Prometheus and status checks.')}
              </li>
              <li>
                {text('Não publique Prometheus ou SQLite.', 'Do not publish Prometheus or SQLite.')}
              </li>
              <li>
                {text(
                  'Mantenha as imagens Docker e o host atualizados.',
                  'Keep Docker images and the host up to date.',
                )}
              </li>
              <li>
                {text(
                  'O atualizador interno usa o socket do Docker e um token local; mantenha o arquivo ~/.dashlab-plus/.env protegido.',
                  'The internal updater uses the Docker socket and a local token; keep ~/.dashlab-plus/.env protected.',
                )}
              </li>
              <li>
                {text(
                  'Use HTTPS quando houver tráfego fora da LAN.',
                  'Use HTTPS whenever traffic leaves the LAN.',
                )}
              </li>
            </ul>
          </section>

          <section id="problemas">
            <p className="doc-index">11</p>
            <h2>{text('Solução de problemas', 'Troubleshooting')}</h2>
            <h3>
              {text('Widgets exibem zero ou indisponível', 'Widgets show zero or unavailable')}
            </h3>
            <p>
              {text(
                'Confira PROMETHEUS_URL, labels e conectividade a partir do container.',
                'Check PROMETHEUS_URL, labels, and connectivity from the container.',
              )}
            </p>
            <h3>{text('Um serviço aparece offline', 'A service appears offline')}</h3>
            <p>
              {text(
                'A URL de status precisa ser acessível pela rede do container. Prefira um endpoint de saúde sem login interativo.',
                'The status URL must be reachable from the container network. Prefer a health endpoint without interactive login.',
              )}
            </p>
            <h3>{text('Alterações não permanecem', 'Changes do not persist')}</h3>
            <p>
              {text(
                'Verifique o volume e execute docker logs dashlab-plus. O container precisa escrever em /data.',
                'Check the volume and run docker logs dashlab-plus. The container must be able to write to /data.',
              )}
            </p>
            <h3>{text('PWA mantém conteúdo antigo', 'PWA keeps old content')}</h3>
            <p>
              {text(
                'Recarregue ignorando o cache ou remova e instale novamente o PWA.',
                'Reload while bypassing the cache, or remove and reinstall the PWA.',
              )}
            </p>
            <h3>{text('Suporte', 'Support')}</h3>
            <p>
              {text(
                'Abra uma issue no GitHub com versão, logs relevantes e passos para reproduzir, removendo informações sensíveis.',
                'Open a GitHub issue with the version, relevant logs, and reproduction steps, removing sensitive information.',
              )}
            </p>
          </section>

        </main>
      </div>
      <PublicFooter language={language} text={text} />
    </>
  );
}
