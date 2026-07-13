FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o buddha-village .

# Final minimal image
FROM alpine:latest  
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/
COPY --from=builder /app/buddha-village .

EXPOSE 8080

CMD ["./buddha-village"]
