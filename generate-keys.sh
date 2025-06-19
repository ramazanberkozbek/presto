#!/bin/bash

# Script per generare le chiavi di firma per gli aggiornamenti Tauri
# Questo script deve essere eseguito nella directory del progetto

echo "🔐 Generating update signing keys for Tauri..."

# Verifica se npm è disponibile
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js first."
    exit 1
fi

# Controlla se è stata passata l'opzione --force
FORCE_OPTION=""
if [[ "$@" == *"--force"* ]]; then
    FORCE_OPTION="--force"
    echo "⚠️ Force option detected. Will overwrite existing keys."
fi

# Genera le chiavi di firma
echo "📝 Generating signing keypair..."
npx tauri signer generate -w ~/.tauri/tempo_signing_key $FORCE_OPTION

if [ $? -eq 0 ]; then
    echo "✅ Keys generated successfully!"
    echo ""
    echo "🔑 Your public key is:"
    npx tauri signer sign -k ~/.tauri/tempo_signing_key --password "" | head -1
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
