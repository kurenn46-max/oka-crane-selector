#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/gr120n-reach/assets"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PDF="$TMP/gr120n.pdf"

if [[ -z "${SOURCE_PDF:-}" ]]; then
  echo "SOURCE_PDF is required. Point it at the original GR-120N-1 PDF." >&2
  exit 2
fi
cp "$SOURCE_PDF" "$PDF"
[[ -s "$PDF" ]] || { echo "GR-120N PDF missing" >&2; exit 1; }
command -v pdftocairo >/dev/null || { echo "pdftocairo is required (poppler-utils)" >&2; exit 1; }
mkdir -p "$OUT_DIR"
pdftocairo -f 5 -l 5 -svg "$PDF" "$TMP/page5"
SVG="$TMP/page5"
[[ -f "$SVG" ]] || SVG="$TMP/page5.svg"
[[ -s "$SVG" ]] || { echo "SVG extraction failed" >&2; exit 1; }
python3 - "$SVG" "$TMP/chart.svg" <<'PY'
from pathlib import Path
import re, sys
src=Path(sys.argv[1]).read_text(encoding='utf-8')
rep='width="505pt" height="704pt" viewBox="45 46 505 704"'
src2=re.sub(r'width="[0-9.]+pt" height="[0-9.]+pt" viewBox="0 0 [0-9.]+ [0-9.]+"',rep,src,count=1)
if src2==src:
    raise SystemExit('unexpected SVG root; crop not applied')
Path(sys.argv[2]).write_text(src2,encoding='utf-8')
PY
gzip -9 -c "$TMP/chart.svg" > "$OUT_DIR/gr120n-range-chart.svg.gz"
echo "GR-120N exact vector chart: BUILT"
