FROM golang:1.24 AS builder

WORKDIR /app

COPY main.go .

RUN CGO_ENABLED=0 GOOS=linux go build -o proxy .

FROM alpine:latest

COPY --from=builder /app/proxy /proxy

EXPOSE 8080

CMD ["/proxy"]