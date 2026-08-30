FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/dashlab-updater .

FROM docker:cli
COPY --from=build /out/dashlab-updater /usr/local/bin/dashlab-updater
USER root
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/dashlab-updater"]
