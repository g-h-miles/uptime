# Stage 1: Build the Go binary
FROM golang:1.24-alpine AS builder

# Install build dependencies for CGO
RUN apk add --no-cache build-base sqlite-dev

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source code
COPY . .

# Build the Go app with CGO enabled
RUN go build -o main ./cmd/uptime

# Stage 2: Create the final, lightweight image
FROM alpine:latest

# Install runtime dependencies for sqlite3
RUN apk add --no-cache sqlite-libs

WORKDIR /root/

# Copy the pre-built binary from the builder stage
COPY --from=builder /app/main .

# Declare a volume for the database
VOLUME /root/

# Expose port 8080 to the outside world
EXPOSE 8080

# Command to run the executable
CMD ["./main"]
