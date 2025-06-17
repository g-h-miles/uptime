package server

import (
	"log"
	"net/http"

	"os"
	"uptime"
	"uptime/storage"

	"github.com/g-h-miles/httpmux"
	mw "github.com/g-h-miles/std-middleware"
)

func Run() error {
	if err := storage.Init(); err != nil {
		return err
	}
	if s, err := storage.GetSettings(); err == nil {
		mu.Lock()
		settings = &Settings{Frequency: s.Frequency, TimeframeHours: s.TimeframeHours}
		mu.Unlock()
	}
	StartMonitoring()

	spaHandler := mw.SPA(mw.SPAConfig{
		DistFS:    uptime.FrontEndDist,
		DistPath:  uptime.FrontEndDistPath,
		IsDevMode: os.Getenv("ENV") == "dev",
	})

	multi := httpmux.NewMultiRouter()
	api := httpmux.NewServeMux()
	registerAPI(api)
	multi.Group("/api", api)

	// dist := filepath.Join("frontend", "dist")
	frontend := httpmux.NewServeMux()
	frontend.GET("/{everything...}", spaHandler(nil))

	multi.Default(frontend)

	log.Println("listening on :8080")
	return http.ListenAndServe(":8080", multi)
}
