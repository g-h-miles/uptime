package main

import (
	"log"

	"uptime/server"
)

func main() {
	if err := server.Run(); err != nil {
		log.Fatal(err)
	}
}
