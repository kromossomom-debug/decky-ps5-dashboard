#!/usr/bin/env bash
# Builds the plugin and packs it the way Decky Loader's "Install plugin from ZIP" expects:
# a single ps5-dashboard/ folder with the built frontend, the Python backend and the metadata.
set -euo pipefail

cd "$(dirname "$0")/.."

# The panel shows VERSION from src/index.tsx; refuse to ship a ZIP that would show the wrong one.
version="$(node -p 'require("./package.json").version')"
if ! grep -q "const VERSION = \"$version\";" src/index.tsx; then
  echo "src/index.tsx VERSION doesn't match package.json ($version)" >&2
  exit 1
fi

npm run build

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
dest="$stage/ps5-dashboard"
mkdir -p "$dest/dist" "$dest/py_modules"
cp dist/index.js "$dest/dist/"
cp py_modules/*.py "$dest/py_modules/"
cp main.py plugin.json package.json LICENSE README.md "$dest/"

rm -f ps5-dashboard.zip
(cd "$stage" && zip -rq "$OLDPWD/ps5-dashboard.zip" ps5-dashboard)
echo "Created ps5-dashboard.zip"
