package main

import (
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
)

func main() {
	target := os.Getenv("TARGET_URL")
	if target == "" {
		log.Fatal("TARGET_URL is not set")
	}

	baseURL, err := url.Parse(target)
	if err != nil {
		log.Fatal(err)
	}

	client := &http.Client{}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		dest := *baseURL
		dest.Path = r.URL.Path
		dest.RawQuery = r.URL.RawQuery

		log.Printf("Proxying request to: %s", dest.String())
		req, err := http.NewRequest(r.Method, dest.String(), r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Копируем заголовки
		req.Header = r.Header.Clone()

		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Копируем заголовки ответа
		for k, values := range resp.Header {
			for _, v := range values {
				w.Header().Add(k, v)
			}
		}

		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}