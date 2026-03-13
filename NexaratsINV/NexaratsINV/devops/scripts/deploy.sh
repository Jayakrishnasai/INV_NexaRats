#!/bin/bash
# Nexarats One-Command Local Deployment

echo "🚀 Starting Nexarats Local Environment..."

# Ensure we are in the devops/docker directory
cd "$(dirname "$0")/../docker"

# Spin up services
docker-compose up -d --build

echo "⏳ Waiting for services to stabilize..."
sleep 5

# Run health check
bash ../scripts/healthcheck.sh

echo "🎉 Services are running!"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:5000"
echo "WhatsApp: http://localhost:5005"
