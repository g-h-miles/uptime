package server

import (
	"log"
	"net/http"
	"path/filepath"

	"uptime/storage"
)

func Run() error {
	if err := storage.Init(); err != nil {
		return err
	}
	StartMonitoring()

	mux := http.NewServeMux()
	registerAPI(mux)

	dist := filepath.Join("frontend", "dist")
	mux.Handle("/", http.FileServer(http.Dir(dist)))

	log.Println("listening on :8080")
	return http.ListenAndServe(":8080", mux)
}
