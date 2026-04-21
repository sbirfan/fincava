#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  REMINDER: Update fincava-architecture.md                   ║"
echo "║  This merge may have changed features, routes, or schema.   ║"
echo "║  Open fincava-architecture.md and add a changelog entry.    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
