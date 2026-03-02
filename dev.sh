#!/bin/bash
# Soniq Dev Startup Script
# Starts both API (backend) and Dashboard (frontend) + ngrok
#
# Usage:
#   ./dev.sh           # Start both BE + FE (recommended)
#   ./dev.sh --api     # Start only API
#   ./dev.sh --fe      # Start only Frontend
#   ./dev.sh --docker  # Use Docker for API

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

API_PORT=3100
FE_PORT=3000
NGROK_PORT=4040

# Defaults
START_API=true
START_FE=true
USE_DOCKER=false

# Parse args
for arg in "$@"; do
    case $arg in
        --api) START_FE=false ;;
        --fe) START_API=false ;;
        --docker) USE_DOCKER=true ;;
    esac
done

log() { echo -e "${GREEN}[DEV]${NC} $1"; }
log_api() { echo -e "${CYAN}[API]${NC} $1"; }
log_fe() { echo -e "${YELLOW}[FE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

cleanup() {
    echo ""
    log "Shutting down..."

    # Kill processes
    $USE_DOCKER && docker compose down 2>/dev/null || true
    lsof -ti:$API_PORT | xargs -r kill -9 2>/dev/null || true
    lsof -ti:$FE_PORT | xargs -r kill -9 2>/dev/null || true
    pkill -f "ngrok http" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    exit 0
}

trap cleanup SIGINT SIGTERM

# Header
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}      Soniq Voice AI - Dev${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check env files
if $START_API && [ ! -f "soniq-api/.env" ]; then
    error "Missing soniq-api/.env file!"
    exit 1
fi

# Cleanup old processes
log "Cleaning up old processes..."
pkill -f "ngrok http" 2>/dev/null || true
lsof -ti:$API_PORT | xargs -r kill -9 2>/dev/null || true
lsof -ti:$FE_PORT | xargs -r kill -9 2>/dev/null || true
lsof -ti:$NGROK_PORT | xargs -r kill -9 2>/dev/null || true
docker compose down 2>/dev/null || true
sleep 1

# ============================================
# Start API (Backend)
# ============================================
if $START_API; then
    if $USE_DOCKER; then
        log_api "Starting API with Docker..."
        cp soniq-api/.env .env 2>/dev/null || true
        docker compose up -d --build api

        log_api "Waiting for container..."
        for i in {1..60}; do
            curl -s http://localhost:$API_PORT/health > /dev/null 2>&1 && break
            sleep 2
            echo -n "."
        done
        echo ""
    else
        log_api "Starting API server..."
        cd soniq-api

        # Load nvm and use correct node version (requires node >= 22)
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        if [ -f .nvmrc ]; then
            nvm use > /dev/null 2>&1 || nvm install > /dev/null 2>&1
            log_api "Using node $(node --version)"
        fi

        npm run dev > /tmp/soniq-api.log 2>&1 &
        API_PID=$!
        cd ..

        log_api "Waiting for server..."
        for i in {1..30}; do
            curl -s http://localhost:$API_PORT/health > /dev/null 2>&1 && break
            sleep 1
            echo -n "."
        done
        echo ""
    fi

    # Verify API
    if curl -s http://localhost:$API_PORT/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:$API_PORT/health)
        log_api "Running on :$API_PORT | LLM: $(echo $HEALTH | jq -r '.services.llm.model')"
    else
        error "API failed to start!"
        [ -f /tmp/soniq-api.log ] && tail -20 /tmp/soniq-api.log
        exit 1
    fi
fi

# ============================================
# Start Dashboard (Frontend)
# ============================================
if $START_FE; then
    log_fe "Starting Dashboard..."
    cd soniq-dashboard

    # Set API URL for frontend
    export NEXT_PUBLIC_API_URL="http://localhost:$API_PORT"

    npm run dev > /tmp/soniq-dashboard.log 2>&1 &
    FE_PID=$!
    cd ..

    log_fe "Waiting for Next.js..."
    for i in {1..30}; do
        curl -s http://localhost:$FE_PORT > /dev/null 2>&1 && break
        sleep 1
        echo -n "."
    done
    echo ""

    if curl -s http://localhost:$FE_PORT > /dev/null 2>&1; then
        log_fe "Running on :$FE_PORT"
    else
        warn "Dashboard may still be compiling - check http://localhost:$FE_PORT"
    fi
fi

# ============================================
# Start ngrok (for API webhooks)
# ============================================
if $START_API; then
    log "Starting ngrok tunnel for API..."
    npx ngrok http $API_PORT --log=stdout > /tmp/ngrok.log 2>&1 &

    sleep 3
    NGROK_URL=$(curl -s http://localhost:$NGROK_PORT/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null)
    [ -z "$NGROK_URL" ] || [ "$NGROK_URL" == "null" ] && NGROK_URL="(run manually: npx ngrok http $API_PORT)"
fi

# ============================================
# Summary
# ============================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Dev Environment Ready${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if $START_API; then
    echo -e "  ${CYAN}Backend API:${NC}"
    echo -e "    Local:    ${GREEN}http://localhost:$API_PORT${NC}"
    echo -e "    Public:   ${GREEN}$NGROK_URL${NC}"
    echo -e "    Health:   http://localhost:$API_PORT/health"
    echo ""
fi

if $START_FE; then
    echo -e "  ${YELLOW}Frontend Dashboard:${NC}"
    echo -e "    Local:    ${GREEN}http://localhost:$FE_PORT${NC}"
    echo ""
fi

if $START_API; then
    echo -e "  ${CYAN}SignalWire Webhooks:${NC}"
    echo -e "    Voice:    $NGROK_URL/signalwire/voice"
    echo -e "    Stream:   ${NGROK_URL/https/wss}/signalwire/stream"
    echo ""
fi

echo -e "  ${YELLOW}Logs:${NC}"
$START_API && echo -e "    API:      tail -f /tmp/soniq-api.log"
$START_FE && echo -e "    FE:       tail -f /tmp/soniq-dashboard.log"
echo -e "    ngrok:    tail -f /tmp/ngrok.log"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop all services"
echo ""

# ============================================
# Stream logs (combined)
# ============================================
if $START_API && $START_FE; then
    # Show both logs with prefixes
    tail -f /tmp/soniq-api.log 2>/dev/null | sed 's/^/[API] /' &
    tail -f /tmp/soniq-dashboard.log 2>/dev/null | sed 's/^/[FE]  /' &
    wait
elif $START_API; then
    if $USE_DOCKER; then
        docker compose logs -f api
    else
        tail -f /tmp/soniq-api.log
    fi
elif $START_FE; then
    tail -f /tmp/soniq-dashboard.log
fi
