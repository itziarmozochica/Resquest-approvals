#!/usr/bin/env bash
# Publishes dist/vercel-static (see deploy-vercel-static.sh) to the `vercel-static` branch of `origin`.
# The branch holds only the built site, no source, and is replaced on every run (force push), so build artifacts
# never pile up in the history of `main`. In Vercel, set that branch as the Production Branch with no build command.
set -euo pipefail

cd "$(dirname "$0")/.."
"$(pwd)/scripts/deploy-vercel-static.sh"

REMOTE="$(git remote get-url origin)"
SHA="$(git rev-parse --short HEAD)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -R dist/vercel-static/. "$TMP/"
cd "$TMP"
git init -q -b vercel-static
git add -A
git commit -q -m "Static build of the prototype and its handoff docs (source ${SHA})"
git push -f "$REMOTE" vercel-static
echo "Pushed branch vercel-static (source ${SHA})."
