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
      <PublicHeader compact language={language} theme={theme} text={text} toggleLanguage={toggleLanguage} toggleTheme={toggleTheme} />

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
                  'DashLab+ has no accounts or built-in authentication. Publish it only on a trusted network, behind a VPN or reverse-proxy authentication.',
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
                'Edite ~/.dashlab-plus/.env apenas para alterar a porta. Para conectar o Prometheus e seus tokens, abra Personalizar no Lab; a configuração é salva no SQLite.',
                'Edit ~/.dashlab-plus/.env only to change the port. To connect Prometheus and its tokens, open Customize in the Lab; the configuration is saved in SQLite.',
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
                  <tr>
                    <td>
                      <code>UPDATE_TOKEN</code>
                    </td>
                    <td>gerado pelo instalador</td>
                    <td>
                      {text(
                        'Token interno usado pelo botão Atualizar. Não compartilhe nem publique este valor.',
                        'Internal token used by the Update button. Do not share or publish this value.',
                      )}
                    </td>
                  </tr>
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
                  'Crie widgets de sistema, armazenamento, rede, relógio, clima, pesquisa, status, PromQL ou divisória.',
                  'Create system, storage, network, clock, weather, search, status, PromQL, or divider widgets.',
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

          <section id="arquitetura">
            <p className="doc-index">06</p>
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
            <p className="doc-index">07</p>
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
            <p className="doc-index">08</p>
            <h2>{text('Atualização', 'Updating')}</h2>
            <pre>
              <code>{installCommand}</code>
            </pre>
            <p>
              {text(
                'O instalador baixa a imagem mais recente e recria somente o container. O volume SQLite permanece intacto. Faça um backup antes de atualizações importantes.',
                'The installer pulls the latest image and recreates only the container. The SQLite volume remains intact. Back up before major updates.',
              )}
            </p>
            <p>
              {text(
                'Quando uma versão publicada for detectada, o DashLab+ mostra um único aviso. Atualizações apenas da interface são aplicadas no navegador; quando a imagem do servidor também mudou, clique em Atualizar para iniciar o processo no atualizador interno e recarregar a página após o reinício. Esta ação está disponível na instalação Compose feita pelo instalador; em um docker run direto, use o comando acima.',
                'When a published version is detected, DashLab+ shows a single notice. Interface-only updates are applied in the browser; when the server image also changed, click Update to start the internal updater and reload the page after the restart. This action is available in the Compose installation created by the installer; with a direct docker run, use the command above.',
              )}
            </p>
          </section>

          <section id="seguranca">
            <p className="doc-index">09</p>
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
                  'Qualquer pessoa que alcance a interface pode alterar seu dashboard. A LAN, VPN ou autenticação externa deve ser o limite de confiança.',
                  'Anyone who reaches the interface can change your dashboard. Your LAN, VPN, or external authentication must be the trust boundary.',
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
            <p className="doc-index">10</p>
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

          <PublicFooter compact language={language} text={text} />
        </main>
      </div>
    </>
  );
}
