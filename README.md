# DashLab

<p align="center">
  <strong>Seu homelab, do seu jeito.</strong><br>
  Um dashboard pessoal e self-hosted inspirado na experiência de desktop do ZimaOS e CasaOS.
</p>

## Sobre

O DashLab transforma os serviços de um homelab em uma tela inicial simples, bonita e adaptada a cada usuário. Depois de criar uma conta, cada pessoa recebe um dashboard privado com aplicativos, widgets e layouts independentes para desktop e celular.

Não existe um painel administrativo separado: links, widgets, wallpaper, cores e organização são alterados diretamente no dashboard.

## Recursos

- Contas e dashboards privados por usuário.
- Interface web fullscreen com canvas livre de aplicativos e widgets.
- Aplicativo Android nativo com Expo.
- Presets editáveis na web e um layout Zima empilhado otimizado para mobile.
- Cadastro de links, deep links, categorias e ícones.
- Widgets de CPU, memória, discos, rede, relógio, clima, pesquisa e status.
- Consultas PromQL personalizadas com acesso controlado ao Prometheus.
- Tema, nome, wallpaper e cor de destaque por usuário.
- Deploy em Docker com PostgreSQL, NestJS, React e Nginx.
- CI/CD pelo Gitea Actions e builds Android pelo Expo Application Services.

## Arquitetura

```text
Web React/Vite ─┐
                ├── NestJS API ── PostgreSQL
Expo Android ───┘       │
                        ├── Prometheus
                        └── Open-Meteo / status dos serviços
```

| Pasta               | Responsabilidade                                                      |
| ------------------- | --------------------------------------------------------------------- |
| `backend/`          | API NestJS, autenticação, Prisma, integrações e regras de isolamento. |
| `web/`              | Dashboard React/Vite servido pelo Nginx.                              |
| `mobile/`           | Aplicativo React Native/Expo para Android.                            |
| `nginx/`            | SPA e proxy interno de `/api` para o backend.                         |
| `.gitea/workflows/` | Build, testes, deploy Docker e disparo do Expo Cloud.                 |

### Organização do código

- O backend é organizado por domínio em `src/modules/<modulo>/`, com `controllers/`,
  `services/`, `dto/`, `guards/` e `test/` dentro de cada módulo.
- Banco de dados, composição da aplicação e demais detalhes técnicos ficam isolados em
  `backend/src/infrastructure/`.
- Web e mobile organizam `api/` por domínio. Cada chamada possui um hook React Query próprio,
  enquanto o cliente Axios compartilhado permanece em `api/http/`.
- Na web, `pages/` compõe hooks e componentes globais de `components/ui/`; no mobile, essa mesma
  responsabilidade pertence a `screens/`.
- Os pontos de entrada ficam em `bootstrap/`, sem arquivos `App` ou `main` misturados à raiz do
  código-fonte.
- Tailwind CSS atende a web e NativeWind fornece a mesma base utilitária no Expo.

## Desenvolvimento

Requisitos: Node.js 22, npm, Docker e Docker Compose.

```bash
cp .env.example .env
docker compose up -d postgres

cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Em outro terminal:

```bash
cd web
npm ci
npm run dev
```

Para o Android:

```bash
cd mobile
npm ci
npm start
```

## Produção

```bash
cp .env.example .env
# Preencha senhas e chaves com valores aleatórios fortes.
docker compose --env-file .env build
docker compose --env-file .env up -d postgres
docker compose --env-file .env run --rm backend npx prisma migrate deploy
docker compose --env-file .env up -d
```

Somente o Nginx é publicado na LAN. PostgreSQL e NestJS permanecem na rede interna do Compose; chamadas `/api` são encaminhadas pelo Nginx.

## Variáveis de ambiente

| Variável            | Uso                              |
| ------------------- | -------------------------------- |
| `POSTGRES_DB`       | Nome do banco.                   |
| `POSTGRES_USER`     | Usuário do PostgreSQL.           |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL.             |
| `JWT_SECRET`        | Assinatura dos tokens de acesso. |
| `PROMETHEUS_URL`    | Endereço interno do Prometheus.  |
| `WEB_PORT`          | Porta publicada pelo Nginx.      |

O workflow do Gitea também exige `EXPO_TOKEN` para iniciar builds no Expo Cloud. Segredos nunca devem ser versionados.

## Segurança

- Todas as consultas de dashboard são filtradas pelo usuário autenticado.
- Senhas são protegidas com Argon2.
- Refresh tokens são armazenados no banco somente como hash.
- PromQL usa apenas o servidor Prometheus definido no deploy.
- Aplicativos e widgets de outros usuários não são acessíveis por IDs manipulados.

## Licença

Projeto pessoal. Adicione uma licença antes de aceitar contribuições ou redistribuir o software.
