# DashLab+

Dashboard self-hosted multiusuário para organizar serviços, atalhos e métricas de um homelab.

Site público: [dashlabplus.vercel.app](https://dashlabplus.vercel.app/)

## Visão geral

O projeto tem duas experiências:

- **Landing** — apresentação pública, documentação e releases, publicada na Vercel.
- **Lab** — dashboard que roda no servidor do usuário, junto da API e do SQLite.

Na instalação Docker, uma única imagem contém o frontend compilado e o servidor Go. O Compose publica a porta somente em `127.0.0.1`; use um reverse proxy HTTPS com Basic/SSO para acesso pela LAN/VPN.

## Arquitetura

```text
navegador / PWA
        │
        ▼
DashLab+ (Docker :3000)
   ├── Lab React
   ├── API Go (HTTP + integrações)
   └── SQLite em /data
        ├── Prometheus (opcional)
        └── updater próprio (Compose)
```

O volume `dashlab_plus_data` preserva dashboard, layout, branding, aplicações, widgets e configurações entre atualizações.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19, TypeScript, Vite 7 |
| Estilo | CSS responsivo |
| Ícones | Lucide React |
| PWA | Service Worker e manifest |
| API | Go 1.24, `net/http` |
| Persistência | SQLite (`modernc.org/sqlite`) |
| Integrações | Prometheus, clima e disponibilidade |
| Distribuição | Docker, Compose, GHCR e Vercel |

## Rotas

| Rota | Função |
| --- | --- |
| `/` | Landing na Vercel; Lab na instalação self-hosted |
| `/lab/` | Dashboard Lab |
| `/docs/` | Documentação de instalação e operação |
| `/releases/` | Releases publicados no GitHub |
| `/api/health` | Health check |
| `/api/version` | Versão do servidor instalado |

## Instalação

Requisitos: Docker Engine e Docker Compose v2.

```bash
curl -fsSL https://dashlabplus.vercel.app/install.sh | sh
```

Para uma instalação reprodutível, baixe o instalador de uma release e execute com `DASHLAB_RELEASE_REF=refs/tags/vX.Y.Z`.

O instalador cria `~/.dashlab-plus`, prepara o updater interno e inicia a aplicação. Acesse `http://IP-DO-HOST:3000`. Executar o comando novamente atualiza a instalação sem remover o volume de dados.

Execução manual:

```bash
docker run -d --name dashlab-plus --restart unless-stopped \
  -p 0.0.0.0:3000:3000 -v dashlab_plus_data:/data \
  ghcr.io/ferforastieri/dashlab-plus:latest
```

## Configuração inicial

Após iniciar o Lab, abra **Personalizar → Integrações** para informar a URL do Prometheus e os filtros de labels. Esses valores podem ser alterados sem editar o Compose.

As configurações são definidas no primeiro acesso e persistidas no SQLite:

| Configuração | Onde alterar |
| --- | --- |
| Prometheus e filtros | Personalizar → Integrações |
| Usuários e permissões | Lab → Gerenciar usuários |

Prometheus é opcional. Tokens e preferências adicionais podem ser configurados no Lab e são persistidos no SQLite.

## Desenvolvimento local

Frontend:

```bash
cd web
npm ci
npm run dev
```

API:

```bash
cd api
go test ./...
DATABASE_PATH=./dashlab-plus.db go run ./cmd/server
```

O Vite encaminha `/api` para `http://localhost:3001`. Para validar a imagem completa:

```bash
docker build -t dashlab-plus .
docker run --rm -p 3000:3000 -v dashlab_plus_data:/data dashlab-plus
```

## Releases e atualização

Cada push na branch `main` testa a API, compila a imagem multi-arquitetura (`amd64` e `arm64`), publica no GHCR e cria um release no GitHub com instalador e Compose.

O Lab consulta a versão pública e mostra uma notificação quando há atualização. Clique em **Atualizar** para o updater baixar a nova imagem e recriar o container; frontend e backend são atualizados juntos. Não publique a porta diretamente na internet.

## Segurança operacional

A API exige autenticação e rejeita requisições mutáveis de origens diferentes. Configure os destinos de status e Prometheus em **Personalizar → Integrações**. Faça backup periódico do volume `dashlab_plus_data`.

## Licença

Distribuído sob a [Licença MIT](LICENSE).
