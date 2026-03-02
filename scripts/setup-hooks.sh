#!/usr/bin/env bash
set -euo pipefail

echo "Setting up git hooks..."

# Configure git to use .githooks directory
git config core.hooksPath .githooks

# Make hooks executable
chmod +x .githooks/*

echo "Git hooks configured successfully!"
echo ""
echo "Hooks enabled:"
echo "  - pre-commit: Format, type check, lint, and block secrets"
echo "  - commit-msg: Auto-add Claude attribution"
