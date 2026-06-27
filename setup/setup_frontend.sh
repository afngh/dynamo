#!/bin/bash

# ─────────────────────────────────────────────
#  setup_frontend.sh — Frontend Environment Setup
#  Usage: bash setup/setup_frontend.sh
# ─────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Dynamo Frontend Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Node & NPM check ─────────────────
echo "[1/4] Checking Node.js and npm..."
if ! command -v node &>/dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH."
    exit 1
fi
if ! command -v npm &>/dev/null; then
    echo "❌ Error: npm is not installed or not in PATH."
    exit 1
fi
echo "      ✓ Node: $(node --version)"
echo "      ✓ npm:  $(npm --version)"
echo ""

# ── Step 2: Navigate to frontend directory ───
echo "[2/4] Verifying frontend workspace..."
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi
cd "$FRONTEND_DIR"
echo "      ✓ Working directory set to frontend"
echo ""

# ── Step 3: Environment file setup ───────────
echo "[3/4] Setting up environment configuration (.env)..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "      ✓ Created frontend/.env from frontend/.env.example"
    else
        echo "      ⚠️  No frontend/.env.example found. Skipping .env creation."
    fi
else
    echo "      ✓ frontend/.env already exists"
fi
echo ""

# ── Step 4: Install NPM dependencies ─────────
echo "[4/4] Installing frontend packages..."
npm install
echo "      ✓ NPM packages installed successfully"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Frontend Setup Complete! 🎉"
echo ""
echo "  To start the frontend development server:"
echo "    cd frontend && npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
