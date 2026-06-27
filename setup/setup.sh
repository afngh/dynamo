#!/bin/bash

# ─────────────────────────────────────────────
#  setup.sh — Full Stack Environment Setup
#  Usage: bash setup/setup.sh
# ─────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================"
echo "      Starting Dynamo Full Setup        "
echo "========================================"
echo ""

bash "$SCRIPT_DIR/setup_backend.sh"
echo ""
bash "$SCRIPT_DIR/setup_frontend.sh"

echo ""
echo "========================================"
echo "      Full Setup Completed! 🚀          "
echo "========================================"
echo "  Backend:  python manage.py runserver"
echo "  Frontend: cd frontend && npm run dev"
echo "========================================"
echo ""