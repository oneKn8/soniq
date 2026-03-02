#!/bin/bash
# Start Dashboard with aggressive lock cleanup

echo "=== Starting Dashboard ==="

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null && echo "Killed stale Next.js processes"
kill $(lsof -t -i:3000) 2>/dev/null && echo "Killed process on :3000"
kill $(lsof -t -i:3002) 2>/dev/null && echo "Killed process on :3002"

# Aggressive lock cleanup
rm -rf /home/oneknight/Work/callagent/soniq-dashboard/.next/dev/lock 2>/dev/null
rm -rf /home/oneknight/Work/callagent/soniq-dashboard/.next/cache 2>/dev/null

# Small delay to ensure ports are freed
sleep 1

echo "Starting Next.js..."
cd /home/oneknight/Work/callagent/soniq-dashboard
npm run dev
