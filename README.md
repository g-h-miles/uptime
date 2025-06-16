# Uptime Monitor

This project is a simple uptime monitoring tool written in Go with a Vite based frontend. It periodically checks a few targets and stores the results in a SQLite database.

## Running

1. Build the frontend assets
   ```sh
   cd frontend
   npm install
   npm run build
   ```
2. Run the Go server
   ```sh
   go run ./cmd/uptime
   ```

The application listens on `http://localhost:8080`.

## Settings

On the web page you can set the check frequency (seconds) and the time frame shown in the chart (hours).
