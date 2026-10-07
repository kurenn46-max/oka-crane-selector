#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/gr120n-reach/assets"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PDF="$TMP/gr120n.pdf"
URL="https://www.tadano.co.jp/products/upload/docs/GR-120N-1-00111_00118.pdf"
mkdir -p "$OUT_DIR"
if [[ -n "${SOURCE_PDF:-}" ]]; then
  cp "$SOURCE_PDF" "$PDF"
else
  curl -fsSL --retry 3 --connect-timeout 20 --max-time 120 "$URL" -o "$PDF"
fi
[[ -s "$PDF" ]] || { echo "GR-120N PDF download failed" >&2; exit 1; }
SIZE=$(wc -c < "$PDF")
(( SIZE > 1000000 )) || { echo "GR-120N PDF is unexpectedly small: $SIZE" >&2; exit 1; }
command -v pdftocairo >/dev/null || { echo "pdftocairo is required (poppler-utils)" >&2; exit 1; }
pdftocairo -f 5 -l 5 -svg "$PDF" "$TMP/page5"
SVG="$TMP/page5"
[[ -f "$SVG" ]] || SVG="$TMP/page5.svg"
[[ -s "$SVG" ]] || { echo "SVG extraction failed" >&2; exit 1; }
python3 - "$SVG" "$OUT_DIR/gr120n-range-chart.svg" <<'PY'
from pathlib import Path
import re, sys
src=Path(sys.argv[1]).read_text(encoding='utf-8')
pat=r'width="595\.27539pt" height="841\.88965pt" viewBox="0 0 595\.27539 841\.88965"'
rep='width="505pt" height="704pt" viewBox="45 46 505 704"'
if not re.search(pat, src):
    src2=re.sub(r'width="[0-9.]+pt" height="[0-9.]+pt" viewBox="0 0 [0-9.]+ [0-9.]+"',rep,src,count=1)
    if src2==src:
        raise SystemExit('unexpected SVG root; crop not applied')
    src=src2
else:
    src=re.sub(pat,rep,src,count=1)
Path(sys.argv[2]).write_text(src,encoding='utf-8')
PY
grep -q 'viewBox="45 46 505 704"' "$OUT_DIR/gr120n-range-chart.svg"
echo "GR-120N official range chart: BUILT ($SIZE byte source PDF)"
