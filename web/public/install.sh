#!/bin/sh
set -eu

RELEASE_REF="${DASHLAB_RELEASE_REF:-main}"
REPOSITORY="https://raw.githubusercontent.com/ferforastieri/dashlab/$RELEASE_REF"
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
curl --fail --silent --show-error --location --retry 3 --connect-timeout 10 --max-time 60 \
  "$REPOSITORY/docker-compose.yml" -o "$TEMP_COMPOSE"
mv "$TEMP_COMPOSE" "$COMPOSE_FILE"

if [ ! -f "$ENV_FILE" ]; then
  umask 077
  curl --fail --silent --show-error --location --retry 3 --connect-timeout 10 --max-time 60 \
    "$REPOSITORY/.env.example" -o "$ENV_FILE"
fi

if ! grep -q '^DASHLAB_IMAGE=' "$ENV_FILE"; then
  printf 'DASHLAB_IMAGE=ghcr.io/ferforastieri/dashlab-plus:latest\n' >> "$ENV_FILE"
elif grep -q '^DASHLAB_IMAGE=.*@sha256:' "$ENV_FILE"; then
  # Migrate installations created by the digest-pinned updater so the
  # click-to-update flow can follow the published tag again.
  sed -i 's#^DASHLAB_IMAGE=.*#DASHLAB_IMAGE=ghcr.io/ferforastieri/dashlab-plus:latest#' "$ENV_FILE"
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

if ! grep -q '^DASHLAB_AUTH_USER=' "$ENV_FILE"; then
  printf 'DASHLAB_AUTH_USER=dashlab\n' >> "$ENV_FILE"
fi
if ! grep -q '^DASHLAB_AUTH_PASSWORD=' "$ENV_FILE" || [ -z "$(sed -n 's/^DASHLAB_AUTH_PASSWORD=//p' "$ENV_FILE" | tail -n 1)" ]; then
  AUTH_PASSWORD=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  if grep -q '^DASHLAB_AUTH_PASSWORD=' "$ENV_FILE"; then
    sed -i "s/^DASHLAB_AUTH_PASSWORD=.*/DASHLAB_AUTH_PASSWORD=$AUTH_PASSWORD/" "$ENV_FILE"
  else
    printf 'DASHLAB_AUTH_PASSWORD=%s\n' "$AUTH_PASSWORD" >> "$ENV_FILE"
  fi
fi
chmod 600 "$ENV_FILE"

docker compose --project-directory "$INSTALL_DIR" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --project-directory "$INSTALL_DIR" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

PORT=$(sed -n 's/^WEB_PORT=//p' "$ENV_FILE" | tail -n 1)
PORT=${PORT:-3000}
echo "DashLab+ está disponível em http://localhost:$PORT"
echo "Configuração: $ENV_FILE"
