# DashLab+

Dashboard single-user e self-hosted para organizar serviços, atalhos e métricas de um homelab.

Site: [dashlabplus.vercel.app](https://dashlabplus.vercel.app/)

O site público na Vercel apresenta o projeto e sua documentação. A instalação
self-hosted usa uma única imagem Docker com landing page, Server Hub, API Go e
persistência SQLite.

## Acessos

| Rota | Conteúdo |
| --- | --- |
| `/` | Landing page |
| `/hub/` | Server Hub |
| `/docs/` | Documentação |
| `/api/health` | Saúde da API |
| `/api/version` | Versão publicada instalada |

## Instalação rápida

Requer Docker Engine e Docker Compose v2:

```bash
curl -fsSL https://dashlabplus.vercel.app/install.sh | sh
```

O instalador salva a configuração em `~/.dashlab-plus`, baixa a imagem pública do GHCR e preserva os dados no volume Docker. Execute o mesmo comando para atualizar.

O Lab compara a versão instalada com a última versão publicada. Um único aviso cobre interface e servidor: atualizações do PWA são aplicadas no navegador; quando a imagem Docker mudou, o botão copia o comando de atualização para execução no host.

Também é possível iniciar diretamente:

```bash
docker run -d \
  --name dashlab-plus \
  --restart unless-stopped \
  -p 3000:3000 \
  -v dashlab_plus_data:/data \
  ghcr.io/ferforastieri/dashlab-plus:latest
```

Acesse `http://IP-DO-HOST:3000`.

## Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `WEB_PORT` | `3000` | Porta HTTP publicada pelo container. |
| `PROMETHEUS_URL` | vazio | URL do Prometheus acessível pela API. |
| `PROMETHEUS_TARGET_LABELS` | vazio | Labels comuns ao host monitorado. |
| `PROMETHEUS_NETWORK_LABELS` | `device!="lo"` | Filtro das interfaces de rede. |
| `PROMETHEUS_DISK_LABELS` | discos NVMe/SATA | Filtro dos discos monitorados. |

O Prometheus é opcional. Sem `PROMETHEUS_URL`, apenas os widgets dependentes de métricas ficam indisponíveis.

## Desenvolvimento

| Pasta | Responsabilidade |
| --- | --- |
| `web/landing` | Landing e documentação React. |
| `web/lab` | Server Hub React e cliente da API. |
| `web/public` | Assets estáticos, PWA e instalador. |
| `api` | Servidor Go, integrações e SQLite. |

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

Imagem completa:

```bash
docker build -t dashlab-plus .
docker run --rm -p 3000:3000 -v dashlab_plus_data:/data dashlab-plus
```

## Persistência

O volume `dashlab_plus_data` armazena `/data/dashlab-plus.db`. Para backups consistentes, pare o container `dashlab-plus` antes de copiar o volume.

## Segurança

O DashLab+ não possui autenticação. Utilize somente em rede confiável, VPN ou atrás de autenticação no proxy reverso. Não exponha SQLite, Prometheus ou outros serviços internos.
