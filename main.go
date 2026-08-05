package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

func main() {
	target := os.Getenv("TARGET_URL")
	if target == "" {
		log.Fatal("TARGET_URL is not set")
	}

	u, err := url.Parse(target)
	if err != nil {
		log.Fatal(err)
	}

	proxy := httputil.NewSingleHostReverseProxy(u)

	// Не переписываем Host, если целевой сервер ожидает оригинальный.
	originalDirector := proxy.Director
	proxy.Director = func(r *http.Request) {
		originalDirector(r)
		// Если нужен Host целевого сервера, оставь следующую строку:
		// r.Host = u.Host
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Listening on :%s -> %s", port, target)
	log.Fatal(http.ListenAndServe(":"+port, proxy))
}