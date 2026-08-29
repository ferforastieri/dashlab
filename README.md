# DashLab+

Dashboard single-user e self-hosted para organizar serviços, atalhos e métricas de um homelab.

Site: [dashlabplus.vercel.app](https://dashlabplus.vercel.app/)

## Acessos

| Rota | Conteúdo |
| --- | --- |
| `/` | Landing page |
| `/hub/` | Server Hub |
| `/docs/` | Documentação |
| `/api/health` | Saúde da API |

## Instalação

Requer Docker Engine e Docker Compose v2.

```bash
git clone https://github.com/ferforastieri/dashlab
cd dashlab
cp .env.example .env
docker compose up -d --build
```

Acesse `http://IP-DO-HOST:3000`. O SQLite e o dashboard inicial são criados automaticamente.

## Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `WEB_PORT` | `3000` | Porta HTTP publicada pelo Nginx. |
| `PROMETHEUS_URL` | vazio | URL do Prometheus acessível pela API. |
| `PROMETHEUS_TARGET_LABELS` | vazio | Labels comuns ao host monitorado. |
| `PROMETHEUS_NETWORK_LABELS` | `device!="lo"` | Filtro das interfaces de rede. |
| `PROMETHEUS_DISK_LABELS` | discos NVMe/SATA | Filtro dos discos monitorados. |

O Prometheus é opcional. Sem `PROMETHEUS_URL`, apenas os widgets dependentes de métricas ficam indisponíveis.

## Desenvolvimento

Frontend:

```bash
cd web
npm ci
npm run dev
```

API, com Go 1.24:

```bash
cd api
go test ./...
DATABASE_PATH=./dashlab-plus.db go run ./cmd/server
```

O Vite encaminha `/api` para `http://localhost:3001`.

## Persistência

O volume `dashlab_plus_data` armazena `/data/dashlab-plus.db`. Para backups consistentes, pare o serviço `api` antes de copiar o volume.

## Segurança

O DashLab+ não possui autenticação. Utilize somente em rede confiável, VPN ou atrás de autenticação no proxy reverso. Apenas o Nginx deve ser exposto; API, SQLite e Prometheus permanecem internos.
