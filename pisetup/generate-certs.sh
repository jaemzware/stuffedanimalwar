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

# Update stuffedanimalwar .env file
SAW_ENV="/home/jaemzware/stuffedanimalwar/.env"
if [ -f "$SAW_ENV" ]; then
    sed -i '/^SSL_KEY=/d' "$SAW_ENV"
    sed -i '/^SSL_CERT=/d' "$SAW_ENV"
    echo "SSL_KEY=$CERT_DIR/key.pem" >> "$SAW_ENV"
    echo "SSL_CERT=$CERT_DIR/cert.pem" >> "$SAW_ENV"
    echo "Updated $SAW_ENV"
fi

# Update analogarchive .env file
AA_ENV="/home/jaemzware/analogarchive/.env"
if [ -f "$AA_ENV" ]; then
    sed -i '/^SSL_KEY_PATH=/d' "$AA_ENV"
    sed -i '/^SSL_CERT_PATH=/d' "$AA_ENV"
    echo "SSL_KEY_PATH=$CERT_DIR/key.pem" >> "$AA_ENV"
    echo "SSL_CERT_PATH=$CERT_DIR/cert.pem" >> "$AA_ENV"
    echo "Updated $AA_ENV"
fi

echo "SSL certificate setup complete!"