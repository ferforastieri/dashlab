FROM node:22-alpine AS web
WORKDIR /src/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM golang:1.24-alpine AS api
WORKDIR /src/api
RUN apk add --no-cache ca-certificates
COPY api/go.mod api/go.sum* ./
RUN go mod download
COPY api/ ./
RUN go test ./... && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/dashlab-plus ./cmd/server

FROM alpine:3.22
LABEL org.opencontainers.image.source="https://github.com/ferforastieri/dashlab"
LABEL org.opencontainers.image.description="DashLab+ self-hosted homelab dashboard"
RUN apk add --no-cache ca-certificates tzdata \
  && addgroup -S dashlabplus \
  && adduser -S -G dashlabplus dashlabplus \
  && mkdir -p /data /app/web \
  && chown -R dashlabplus:dashlabplus /data /app
WORKDIR /app
COPY --from=api /out/dashlab-plus /usr/local/bin/dashlab-plus
COPY --from=web /src/web/dist /app/web
USER dashlabplus
ENV PORT=3000 DATABASE_PATH=/data/dashlab-plus.db WEB_ROOT=/app/web
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=20s --timeout=5s --retries=6 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["dashlab-plus"]
