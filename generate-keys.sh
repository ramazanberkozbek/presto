#!/bin/bash

# Script per generare le chiavi di firma per gli aggiornamenti Tauri
# Questo script deve essere eseguito nella directory del progetto

echo "🔐 Generating update signing keys for Tauri..."

# Verifica se tauri CLI è disponibile
if ! command -v tauri &> /dev/null; then
    echo "❌ Tauri CLI not found. Please install it first:"
    echo "npm install --save-dev @tauri-apps/cli@latest"
    exit 1
fi

# Genera le chiavi di firma
echo "📝 Generating signing keypair..."
tauri signer generate -w ~/.tauri/tempo_signing_key

if [ $? -eq 0 ]; then
    echo "✅ Keys generated successfully!"
    echo ""
    echo "🔑 Your public key is:"
    tauri signer sign -k ~/.tauri/tempo_signing_key --password "" | head -1
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy the public key above"
    echo "2. Replace 'YOUR_PUBLIC_KEY_HERE' in src-tauri/tauri.conf.json with your public key"
    echo "3. Keep your private key secure (~/.tauri/tempo_signing_key)"
    echo "4. Add the private key to your GitHub Actions secrets as TAURI_SIGNING_PRIVATE_KEY"
    echo ""
    echo "⚠️  Important: Never commit your private key to version control!"
else
    echo "❌ Failed to generate keys"
    exit 1
fi
