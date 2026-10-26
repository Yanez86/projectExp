#!/bin/bash
# Installa la skill pxl (pixel art come codice) in .claude/skills/pxl-pixel-art.
# Fissata a un commit: per aggiornarla cambia PXL_REF. La galleria di immagini
# della documentazione (~40 MB) non viene scaricata.
set -euo pipefail

PXL_REPO="https://github.com/augusto-scarvalho/claude-pxl"
PXL_REF="5a5e2c036c7e5879c7f55e01a3c519cc41b72b6a"
DEST="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/skills/pxl-pixel-art"

if [ "$(git -C "$DEST" rev-parse HEAD 2>/dev/null)" = "$PXL_REF" ]; then
  exit 0
fi

export GIT_LFS_SKIP_SMUDGE=1
if [ ! -d "$DEST/.git" ]; then
  mkdir -p "$DEST"
  git -C "$DEST" init -q
  git -C "$DEST" remote add origin "$PXL_REPO"
  git -C "$DEST" config core.sparseCheckout true
  printf '/*\n!/docs/gallery/\n' > "$DEST/.git/info/sparse-checkout"
fi
git -C "$DEST" fetch -q --depth 1 --filter=blob:none origin "$PXL_REF"
git -C "$DEST" checkout -q --force FETCH_HEAD
