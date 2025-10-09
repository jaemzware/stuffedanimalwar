#!/bin/bash

# Generate self-signed SSL certificate for Jaemzware LLC
# Valid for both stuffedanimalwar.local and analogarchive.local

CERT_DIR="/home/jaemzware/stuffedanimalwar/sslcert"

echo "Generating self-signed SSL certificate for Jaemzware LLC..."

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 365 -nodes \
  -subj "/C=US/ST=Washington/L=Seattle/O=Jaemzware LLC/CN=stuffedanimalwar.local" \
  -addext "subjectAltName=DNS:stuffedanimalwar.local,DNS:analogarchive.local,IP:192.168.4.1"

# Set permissions
chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

echo "Certificate generated at $CERT_DIR"
echo "  - Certificate: $CERT_DIR/cert.pem"
echo "  - Private Key: $CERT_DIR/key.pem"
echo ""
echo "SSL certificate generation complete!"
echo "Make sure your .env files reference these certificate paths."