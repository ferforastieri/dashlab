#!/bin/sh
set -eu

REPOSITORY="https://raw.githubusercontent.com/ferforastieri/dashlab/main"
INSTALL_DIR="${DASHLAB_PLUS_DIR:-${HOME:-.}/.dashlab-plus}"
COMPOSE_FILE="$INSTALL_DIR/docker-compose.yml"
ENV_FILE="$INSTALL_DIR/.env"
TEMP_COMPOSE="$INSTALL_DIR/.docker-compose.yml.$$"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado. Instale o Docker Engine antes de continuar." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 não encontrado." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "O serviço Docker não está disponível para este usuário." >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
trap 'rm -f "$TEMP_COMPOSE"' EXIT HUP INT TERM
curl -fsSL "$REPOSITORY/docker-compose.yml" -o "$TEMP_COMPOSE"
mv "$TEMP_COMPOSE" "$COMPOSE_FILE"

if [ ! -f "$ENV_FILE" ]; then
  umask 077
  curl -fsSL "$REPOSITORY/.env.example" -o "$ENV_FILE"
fi

if ! grep -q '^UPDATE_TOKEN=' "$ENV_FILE" || [ -z "$(sed -n 's/^UPDATE_TOKEN=//p' "$ENV_FILE" | tail -n 1)" ]; then
  UPDATE_TOKEN=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  if grep -q '^UPDATE_TOKEN=' "$ENV_FILE"; then
    sed -i "s/^UPDATE_TOKEN=.*/UPDATE_TOKEN=$UPDATE_TOKEN/" "$ENV_FILE"
  else
    printf '\nUPDATE_TOKEN=%s\n' "$UPDATE_TOKEN" >> "$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE"
fi

docker compose --project-directory "$INSTALL_DIR" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --project-directory "$INSTALL_DIR" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

PORT=$(sed -n 's/^WEB_PORT=//p' "$ENV_FILE" | tail -n 1)
PORT=${PORT:-3000}
echo "DashLab+ está disponível em http://localhost:$PORT"
echo "Configuração: $ENV_FILE"
