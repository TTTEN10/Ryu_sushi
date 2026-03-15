#!/bin/bash

# Script to start PostgreSQL database server on localhost:5432

set -e

echo "🐘 Starting PostgreSQL database server..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running."
    echo ""
    
    # Try to start Docker Desktop on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "🐳 Attempting to start Docker Desktop..."
        open -a Docker 2>/dev/null || echo "⚠️  Could not automatically start Docker Desktop"
        echo ""
        echo "⏳ Waiting for Docker Desktop to start (this may take 30-60 seconds)..."
        
        max_wait=60
        waited=0
        while [ $waited -lt $max_wait ]; do
            if docker info > /dev/null 2>&1; then
                echo "✅ Docker Desktop is now running!"
                break
            fi
            waited=$((waited + 2))
            sleep 2
            echo -n "."
        done
        echo ""
        
        if ! docker info > /dev/null 2>&1; then
            echo "❌ Docker Desktop did not start in time."
            echo ""
            echo "Please manually:"
            echo "  1. Open Docker Desktop application"
            echo "  2. Wait for it to fully start (whale icon in menu bar)"
            echo "  3. Run this script again: ./start-postgres.sh"
            exit 1
        fi
    else
        echo "Please start Docker Desktop manually and run this script again."
        exit 1
    fi
fi

# Check if PostgreSQL container is already running
if docker ps --format '{{.Names}}' | grep -q '^.*postgres.*$'; then
    echo "✅ PostgreSQL container is already running"
    docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    exit 0
fi

# Start PostgreSQL using docker-compose
echo "🚀 Starting PostgreSQL container..."
cd "$(dirname "$0")"

# Set default password if not set
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-safepsy_dev_password}

docker compose -f docker-compose.dev.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U safepsy_user > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready and running on localhost:5432"
        echo ""
        echo "Connection details:"
        echo "  Host: localhost"
        echo "  Port: 5432"
        echo "  User: safepsy_user"
        echo "  Database: safepsy_dev"
        echo "  Password: ${POSTGRES_PASSWORD}"
        echo ""
        echo "DATABASE_URL: postgresql://safepsy_user:${POSTGRES_PASSWORD}@localhost:5432/safepsy_dev"
        exit 0
    fi
    attempt=$((attempt + 1))
    sleep 1
done

echo "❌ PostgreSQL failed to start within $max_attempts seconds"
echo "Check logs with: docker compose -f docker-compose.dev.yml logs postgres"
exit 1

