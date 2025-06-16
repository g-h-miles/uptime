package server

import (
	"log"
	"sync"
	"time"

	"uptime/probes"
	"uptime/storage"
)

var once sync.Once

func StartMonitoring() {
	once.Do(func() {
		go monitorLoop()
	})
}

func monitorLoop() {
	targets := []probes.Target{
		probes.HTTP{URL: "https://www.google.com"},
		probes.HTTP{URL: "https://github.com"},
		probes.Postgres{DSN: "postgres://user:pass@localhost:5432/postgres?sslmode=disable"},
		probes.Redis{Addr: "localhost:6379"},
	}
	for {
		freq := GetFrequency()
		for _, t := range targets {
			res := t.Check()
			if err := storage.SaveCheck(res); err != nil {
				log.Println("save error:", err)
			}
		}
		time.Sleep(freq)
	}
}
