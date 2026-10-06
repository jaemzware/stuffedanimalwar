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
# CERT_HOST is the hostname other devices will use (e.g. mini.local). Apple devices require
# a matching subjectAltName and <= 825 days validity, and the cert must be trusted on each client (see README)
ARG CERT_HOST=localhost
RUN apk add --no-cache openssl && \
    openssl req -x509 -newkey rsa:4096 -sha256 -nodes \
        -days 825 \
        -keyout /app/sslcert/key.pem \
        -out /app/sslcert/cert.pem \
        -subj "/CN=${CERT_HOST}/O=stuffedanimalwar/C=US" \
        -addext "subjectAltName=DNS:${CERT_HOST},DNS:localhost,IP:127.0.0.1" \
        -addext "extendedKeyUsage=serverAuth"

# Expose the port the app runs on
EXPOSE 55556

# Set default environment variables
ENV SSL_KEY_PATH=/app/sslcert/key.pem
ENV SSL_CERT_PATH=/app/sslcert/cert.pem

# Start the application
CMD ["node", "index.js"]