package uptime

import (
	"embed"
	"io/fs"
)

var (
	//go:embed frontend/dist/*
	FrontEndDist     embed.FS
	FrontEndDistPath = "frontend/dist"

	FrontEndDistDirFS     fs.FS
	FrontEndDistIndexHTML fs.FS
)
