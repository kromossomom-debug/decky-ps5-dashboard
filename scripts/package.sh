#!/usr/bin/env bash
# Builds the plugin and packs it the way Decky Loader's "Install plugin from ZIP" expects:
# a single ps5-dashboard/ folder with the built frontend, the Python backend and the metadata.
set -euo pipefail

cd "$(dirname "$0")/.."
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
