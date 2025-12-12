#!/bin/bash
# Script para arrancar server y client en paralelo (Linux/Mac)

echo "🚀 Starting Aula Colaborativa..."

# Start server in background
echo "📡 Starting server..."
cd server && npm run dev &
SERVER_PID=$!

# Wait a bit for server to start
sleep 3

# Start client in background
echo "🎨 Starting client..."
cd ../client && npm run dev &
CLIENT_PID=$!

echo ""
echo "✅ Both services started!"
echo "   Server PID: $SERVER_PID"
echo "   Client PID: $CLIENT_PID"
echo ""
echo "📍 URLs:"
echo "   API: http://localhost:3002"
echo "   Client: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID; exit" INT
wait
