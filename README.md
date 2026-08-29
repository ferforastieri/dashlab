# DashLab

<p align="center">
  <strong>Seu homelab, do seu jeito.</strong><br>
  Um dashboard pessoal, single-user e self-hosted para serviços, atalhos e métricas.
</p>

## Sobre

O DashLab transforma os serviços de um homelab em um workspace responsivo. Aplicativos, widgets, seções, layouts, wallpapers e cores são configurados diretamente no dashboard e compartilhados entre desktop e celular.

O projeto é deliberadamente single-user: não há cadastro, login, JWT, ORM ou banco remoto. O limite de confiança é a rede privada, VPN ou autenticação fornecida pelo proxy reverso.

## Recursos

- Canvas livre no desktop e três experiências móveis.
- Cadastro de aplicativos, deep links, categorias e ícones.
- Seções recolhíveis e widgets configuráveis.
- Métricas de CPU, memória, discos e rede via Prometheus.
- Consultas PromQL personalizadas.
- Status e latência dos serviços internos.
- Relógio, clima e pesquisa.
- PWA instalável com identidade personalizada.
- Estado e imagens persistidos em um único SQLite.
- Deploy com dois containers: Go e Nginx.
- Landing e documentação estáticas prontas para Vercel.

## Arquitetura

```text
Navegador ── Nginx ── React/Vite
                │
                └── /api ── Go ── SQLite
                              ├── Prometheus
                              ├── Open-Meteo
                              └── serviços da LAN
```

| Pasta    | Responsabilidade                             |
| -------- | -------------------------------------------- |
| `api/`   | API Go, SQLite, assets e integrações locais. |
| `web/`   | Dashboard React/Vite e PWA.                  |
| `nginx/` | Entrega da SPA e proxy interno de `/api`.    |
| `site/`  | Landing e documentação públicas para Vercel. |

## Instalação

Requisitos: Docker Engine e Docker Compose v2.

```bash
git clone https://github.com/ferforastieri/dashlab
cd dashlab
cp .env.example .env
docker compose up -d --build
```

Abra `http://IP-DO-HOST:3000`. O banco e os widgets iniciais são criados automaticamente na primeira execução.

## Configuração

| Variável                    | Uso                                       |
| --------------------------- | ----------------------------------------- |
| `WEB_PORT`                  | Porta publicada pelo Nginx.               |
| `PROMETHEUS_URL`            | URL interna do Prometheus. É opcional.    |
| `PROMETHEUS_TARGET_LABELS`  | Labels que identificam o host monitorado. |
| `PROMETHEUS_NETWORK_LABELS` | Filtro das interfaces de rede.            |
| `PROMETHEUS_DISK_LABELS`    | Filtro dos discos monitorados.            |

Também são aceitas consultas completas nas variáveis `PROMETHEUS_CPU_QUERY`, `PROMETHEUS_MEMORY_QUERY`, `PROMETHEUS_DOWNLOAD_QUERY`, `PROMETHEUS_UPLOAD_QUERY`, `PROMETHEUS_DISK_INFO_QUERY`, `PROMETHEUS_DISK_UTILIZATION_QUERY`, `PROMETHEUS_DISK_READ_QUERY`, `PROMETHEUS_DISK_WRITE_QUERY`, `PROMETHEUS_DISK_TEMPERATURE_QUERY` e `PROMETHEUS_DISK_HEALTH_QUERY`.

## Desenvolvimento

Frontend:

```bash
cd web
npm ci
npm run dev
```

API, com Go 1.24 instalado:

```bash
cd api
go test ./...
DATABASE_PATH=./dashlab.db go run .
```

O Vite encaminha `/api` para `http://localhost:3001` durante o desenvolvimento.

## Persistência e backup

O volume Docker `dashlab_data` contém `/data/dashlab.db`. Para uma cópia consistente, pare o serviço `api` antes de copiar o volume e inicie-o novamente ao terminar.

## Landing no Vercel

Importe este repositório como um projeto no Vercel. O arquivo `vercel.json` já configura a publicação estática:

- Framework preset: `Other`
- Build command: nenhum
- Output directory: `site`

A aplicação do homelab e o site público são independentes. A landing não conhece a URL, os dados ou a disponibilidade da instalação privada.

## Segurança

O DashLab single-user não possui autenticação própria. Não publique a aplicação diretamente na internet. Para acesso remoto, prefira Tailscale, WireGuard ou autenticação no proxy reverso, protegendo tanto a interface quanto `/api`.

Somente o Nginx é publicado pelo Compose. A API Go, o SQLite e o Prometheus permanecem internos.

## Licença

Projeto pessoal. Adicione uma licença antes de aceitar contribuições ou redistribuir o software.
