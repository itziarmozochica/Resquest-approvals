#!/usr/bin/env bash
# Builds the prototype, adds the handoff docs under /handoff and writes dist/vercel-static, a folder that can be
# served as plain static files (Vercel, any static host). Needs `pnpm install` done first (private registries).
#
#   /            the prototype (single-page app)
#   /handoff/    the handoff docs
set -euo pipefail

cd "$(dirname "$0")/.."
DOCS="../r&a-handoff-doc"
OUT="dist/vercel-static"
BUILD="dist/vercel-static-build"

rm -rf "$OUT" "$BUILD"
node --max_old_space_size=8048 ./node_modules/@angular/cli/bin/ng.js build --configuration localStaging ${NG_OPTIMIZATION:---optimization} --source-map=false --output-path "$BUILD"

mkdir -p "$OUT"
cp -R "$BUILD/browser/." "$OUT/"

# The interface is always English: the other translation files are never loaded.
find "$OUT/assets/i18n" -type f ! -name 'en.json' -delete 2>/dev/null || true

# Handoff docs (without their own README, config and ignore file)
mkdir -p "$OUT/handoff"
rsync -a --exclude README.md --exclude vercel.json --exclude .gitignore --exclude .DS_Store "$DOCS/" "$OUT/handoff/"

cat > "$OUT/vercel.json" <<'JSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "",
  "buildCommand": "",
  "outputDirectory": ".",
  "redirects": [{ "source": "/handoff", "destination": "/handoff/", "permanent": false }],
  "rewrites": [{ "source": "/((?!handoff/|assets/).*)", "destination": "/index.html" }]
}
JSON

echo
echo "Static site ready in $OUT ($(du -sh "$OUT" | cut -f1))."
echo "Publish it with scripts/publish-vercel-static.sh, or deploy it by hand:  cd $OUT && npx vercel --prod"
