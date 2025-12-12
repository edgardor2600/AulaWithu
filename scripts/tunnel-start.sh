#!/bin/bash
# Cloudflare Tunnel Script
# Exposes local server to internet for testing

echo "🌐 Starting Cloudflare Tunnel..."
echo ""
echo "⚠️  Make sure cloudflared is installed:"
echo "   Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared not found. Please install it first."
    exit 1
fi

# Start tunnel
echo "🚀 Starting tunnel to http://localhost:3002..."
echo ""
cloudflared tunnel --url http://localhost:3002

# Note: The URL will be printed by cloudflared
# Share that URL with students/testers
