#!/usr/bin/env bash
# Builds the prototype and prepares a static folder ready for `vercel deploy`.
# Run from anywhere inside the project folder; needs `pnpm install` done first.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="dist/vercel-static"
BUILD="dist/vercel-static-build"

rm -rf "$OUT" "$BUILD"
pnpm exec ng build --configuration localStaging --optimization --source-map=false --output-path "$BUILD"

mkdir -p "$OUT"
cp -R "$BUILD/browser/." "$OUT/"
cat > "$OUT/vercel.json" <<'JSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "",
  "buildCommand": "",
  "outputDirectory": ".",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
JSON

echo
echo "Static build ready in $OUT ($(du -sh "$OUT" | cut -f1))."
echo "Deploy it with:  cd $OUT && npx vercel --prod"
