#!/bin/sh
echo "ApexChain Environment Diagnostics"
echo "=================================="
echo ""

# Check Node.js
if command -v node >/dev/null 2>&1; then
  echo "Node.js: $(node --version) ✓"
else
  echo "Node.js: NOT FOUND ✗"
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
  echo "npm: $(npm --version) ✓"
else
  echo "npm: NOT FOUND ✗"
fi

# Check Git
if command -v git >/dev/null 2>&1; then
  echo "Git: $(git --version) ✓"
else
  echo "Git: NOT FOUND ✗"
fi

# Check node_modules
if [ -d "node_modules" ]; then
  echo "node_modules: EXISTS ✓"
else
  echo "node_modules: MISSING ✗ (run npm install)"
fi

# Check .env.local
if [ -f ".env.local" ]; then
  echo ".env.local: EXISTS ✓"
else
  echo ".env.local: MISSING (optional)"
fi

# Check TypeScript
if command -v npx >/dev/null 2>&1; then
  echo "TypeScript: $(npx tsc --version 2>/dev/null || echo 'NOT FOUND')"
fi

echo ""
echo "Done!"
