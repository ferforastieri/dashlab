#!/bin/sh
set -eu

RELEASE_REF="${DASHLAB_RELEASE_REF:-main}"
REPOSITORY="https://raw.githubusercontent.com/ferforastieri/dashlab/$RELEASE_REF"
INSTALL_DIR="${DASHLAB_PLUS_DIR:-${HOME:-.}/.dashlab-plus}"
COMPOSE_FILE="$INSTALL_DIR/docker-compose.yml"
TEMP_COMPOSE="$INSTALL_DIR/.docker-compose.yml.$$"
UPDATER_DIR="$INSTALL_DIR/updater"

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
trap 'rm -f "$TEMP_COMPOSE" "$UPDATER_DIR"/.*.$$' EXIT HUP INT TERM
curl --fail --silent --show-error --location --retry 3 --connect-timeout 10 --max-time 60 \
  "$REPOSITORY/docker-compose.yml" -o "$TEMP_COMPOSE"
mv "$TEMP_COMPOSE" "$COMPOSE_FILE"

# The updater is built locally by Compose; download its complete source tree
# alongside the Compose file instead of assuming it exists on the host.
mkdir -p "$UPDATER_DIR"
for file in Dockerfile go.mod main.go; do
  temp_file="$UPDATER_DIR/.$file.$$"
  curl --fail --silent --show-error --location --retry 3 --connect-timeout 10 --max-time 60 \
    "$REPOSITORY/updater/$file" -o "$temp_file"
  mv "$temp_file" "$UPDATER_DIR/$file"
done

docker compose --project-directory "$INSTALL_DIR" -f "$COMPOSE_FILE" pull
docker compose --project-directory "$INSTALL_DIR" -f "$COMPOSE_FILE" up -d --remove-orphans

echo "DashLab+ está disponível em http://localhost:3000"
echo "Configuração: $INSTALL_DIR"
