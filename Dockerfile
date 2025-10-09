# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create SSL certificate directory
RUN mkdir -p /app/sslcert

# Generate self-signed SSL certificates for development
RUN apk add --no-cache openssl && \
    openssl genrsa -out /app/sslcert/key.pem 4096 && \
    openssl req -x509 -new -sha256 -nodes \
        -key /app/sslcert/key.pem \
        -days 1095 \
        -out /app/sslcert/cert.pem \
        -subj "/CN=localhost/O=stuffedanimalwar/C=US"

# Expose the port the app runs on
EXPOSE 55556

# Set default environment variables
ENV SSL_KEY_PATH=/app/sslcert/key.pem
ENV SSL_CERT_PATH=/app/sslcert/certificate.pem

# Start the application
CMD ["node", "index.js"]