#!/bin/bash

# ─────────────────────────────────────────────
#  setup_backend.sh — Backend Environment Setup
#  Usage: bash setup/setup_backend.sh
# ─────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Dynamo Backend Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Python environment check ─────────
echo "[1/5] Checking Python installation..."
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python is not installed or not in PATH."
    exit 1
fi
echo "      ✓ Using $($PYTHON_CMD --version)"
echo ""

# ── Step 2: Environment file setup ───────────
echo "[2/5] Setting up environment configuration (.env)..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "      ✓ Created .env from .env.example"
    else
        echo "      ⚠️  No .env.example found. Skipping .env creation."
    fi
else
    echo "      ✓ .env already exists"
fi
echo ""

# ── Step 3: Create required directories ──────
echo "[3/5] Creating runtime directories..."
mkdir -p bin/model
mkdir -p bin/data
echo "      ✓ Created bin/model and bin/data"
echo ""

# ── Step 4: Install Python dependencies ──────
echo "[4/5] Installing Python dependencies..."
if $PYTHON_CMD -m pip install -r requirements.txt -q 2>/dev/null; then
    echo "      ✓ Dependencies installed successfully"
else
    echo "      Installing dependencies with --break-system-packages..."
    $PYTHON_CMD -m pip install -r requirements.txt --break-system-packages -q
    echo "      ✓ Dependencies installed successfully"
fi
echo ""

# ── Step 5: Django Database Migrations ────────
echo "[5/5] Running database migrations..."
$PYTHON_CMD manage.py migrate
echo "      ✓ Database migrated successfully"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backend Setup Complete! 🎉"
echo ""
echo "  To start the Django server:"
echo "    python manage.py runserver"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
