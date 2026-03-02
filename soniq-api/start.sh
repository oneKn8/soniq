#!/bin/bash
# Quick start script - starts ngrok + server

MODEL=${1:-llama70b}

# Kill existing processes
kill $(lsof -t -i:3100) 2>/dev/null && echo "Killed server on :3100"
pkill -f ngrok 2>/dev/null && echo "Killed ngrok"

# Start ngrok in background
echo "Starting ngrok tunnel..."
npx ngrok http 3100 --domain=centerable-lennon-sarcastic.ngrok-free.dev > /dev/null 2>&1 &
sleep 3

# Verify ngrok is up
if curl -s https://centerable-lennon-sarcastic.ngrok-free.dev > /dev/null 2>&1; then
  echo "ngrok tunnel active"
else
  echo "Warning: ngrok may still be connecting..."
fi

# Start the server
echo "Starting API with model: $MODEL"
npm run dev:$MODEL
