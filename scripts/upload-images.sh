#!/usr/bin/env bash
# Upload local images to Cloudinary.
#
# Usage:
#   ./scripts/upload-images.sh <file-or-dir> [<file-or-dir> ...]
#
# Files must live under images/. Public IDs are derived from the path:
#   images/adventures/africa/cover.jpg  →  adventures/africa/cover
#   images/sponsors/Norda/logo.png      →  sponsors/norda/logo
#
# Existing assets at the same public_id are overwritten. The script prints
# the secure URL for each upload — paste those into Supabase (or ask Claude
# to wire them up).
#
# Requires: shasum, curl, python3, and CLOUDINARY_* vars in .env.local.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${CLOUDINARY_CLOUD_NAME:?CLOUDINARY_CLOUD_NAME not set in .env.local}"
: "${CLOUDINARY_API_KEY:?CLOUDINARY_API_KEY not set in .env.local}"
: "${CLOUDINARY_API_SECRET:?CLOUDINARY_API_SECRET not set in .env.local}"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <file-or-dir> [<file-or-dir> ...]" >&2
  exit 1
fi

upload_one() {
  local file="$1"
  local rel="${file#$ROOT/}"
  if [[ "$rel" != images/* ]]; then
    echo "Skipping (not under images/): $rel" >&2
    return 0
  fi

  local pid="${rel#images/}"
  pid="${pid%.*}"
  pid=$(echo "$pid" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

  # Cloudinary free tier caps uploads at 10 MB. Raw camera photos (PNG/HEIC,
  # often 12–25 MB) will fail unless we shrink them first. For files above 9 MB,
  # resize the longest side to 3500 px (we serve up to 2880 px in srcset, so
  # this leaves headroom) and re-encode as JPEG quality 92 via sips. Cloudinary
  # still negotiates AVIF/WebP at delivery, so format here doesn't matter for
  # the user — only that we stay under the upload cap with maximum source detail.
  local upload_path="$file"
  local tmp=""
  local size
  size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
  if [ "$size" -gt 9000000 ]; then
    tmp=$(mktemp -t cloudinary-upload).jpg
    if sips -s format jpeg -s formatOptions 92 -Z 3500 "$file" --out "$tmp" >/dev/null 2>&1; then
      upload_path="$tmp"
      local new_size
      new_size=$(stat -f%z "$tmp" 2>/dev/null || stat -c%s "$tmp")
      printf '  (resized + compressed %s → %s for upload)\n' \
        "$(awk -v b=$size 'BEGIN{printf "%.1fMB", b/1048576}')" \
        "$(awk -v b=$new_size 'BEGIN{printf "%.1fMB", b/1048576}')" >&2
    else
      echo "  (compression failed, attempting upload anyway)" >&2
    fi
  fi

  local ts
  ts=$(date +%s)

  local to_sign="overwrite=true&public_id=${pid}&timestamp=${ts}"
  local sig
  sig=$(printf '%s%s' "$to_sign" "$CLOUDINARY_API_SECRET" | shasum -a 1 | awk '{print $1}')

  local response
  response=$(curl -sS -X POST "https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload" \
    -F "file=@${upload_path}" \
    -F "api_key=${CLOUDINARY_API_KEY}" \
    -F "timestamp=${ts}" \
    -F "public_id=${pid}" \
    -F "overwrite=true" \
    -F "signature=${sig}")

  [ -n "$tmp" ] && rm -f "$tmp"

  local url
  url=$(echo "$response" | python3 -c '
import json, sys
try:
  r = json.load(sys.stdin)
  if "secure_url" in r:
    print(r["secure_url"])
  else:
    print("ERROR: " + json.dumps(r))
except Exception as e:
  print("ERROR: " + str(e))
')
  printf '%s  →  %s\n' "$rel" "$url"
}

abs_path() {
  local p="$1"
  p="${p%/}"
  if [[ "$p" = /* ]]; then printf '%s' "$p"; else printf '%s' "$ROOT/$p"; fi
}

files=()
for arg in "$@"; do
  abs=$(abs_path "$arg")
  if [ -d "$abs" ]; then
    while IFS= read -r -d '' f; do
      files+=("$f")
    done < <(find "$abs" -type f \( \
      -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \
      -o -iname '*.webp' -o -iname '*.heic' -o -iname '*.gif' \
      -o -iname '*.avif' \
    \) -print0)
  elif [ -f "$abs" ]; then
    files+=("$abs")
  else
    echo "Not found: $arg" >&2
  fi
done

if [ ${#files[@]} -eq 0 ]; then
  echo "No images found." >&2
  exit 0
fi

echo "Uploading ${#files[@]} file(s) to Cloudinary cloud '${CLOUDINARY_CLOUD_NAME}'..."
for f in "${files[@]}"; do
  upload_one "$f"
done
