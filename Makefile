build:
	cd frontend && pnpm build
	ENV=prod go build -buildvcs=false -o ./bin/uptime ./cmd/uptime

dev:
	cd frontend && pnpm dev & ENV=dev air
