#!/usr/bin/env bash
# ==============================================================================
# WiZiT Security Audit & Remediation Verification Script
# ==============================================================================
# Strict error handling:
# -e: Exit immediately if any command exits with a non-zero exit status.
# -u: Treat unset variables as an error and exit immediately.
# -o pipefail: Pipeline return value is that of the last command to fail.
set -euo pipefail

PROJECT_DIR="/home/capsky-jakub/Dev/WebDev/WiZiT"
cd "$PROJECT_DIR"

echo "=== [1/5] Checking Git & Secret Hygiene ==="
if [ -d "migrated_prompt_history" ]; then
    echo "FAIL: migrated_prompt_history directory still exists!" >&2
    exit 1
fi
if git ls-files --error-unmatch migrated_prompt_history 2>/dev/null; then
    echo "FAIL: migrated_prompt_history is still tracked in Git!" >&2
    exit 1
fi
if git ls-files --error-unmatch services/security.ts 2>/dev/null; then
    echo "FAIL: services/security.ts is still tracked in Git!" >&2
    exit 1
fi
echo "PASS: No leaked prompt history or deprecated security stubs in working tree."

echo "=== [2/5] Checking Honeypot / Decoy Guardrails ==="
if ! grep -q "deobfuscateKey" App.tsx || ! grep -q "HARDCODED_FB_KEY" App.tsx; then
    echo "FAIL: Decoy/honeypot key logic in App.tsx was modified or removed!" >&2
    exit 1
fi
echo "PASS: Decoy / honeypot logic in App.tsx remains intact."

echo "=== [3/5] Checking Runtime CDN & SRI Integrity in index.html ==="
if grep -q "cdn.tailwindcss.com" index.html; then
    echo "FAIL: Insecure runtime cdn.tailwindcss.com found in index.html!" >&2
    exit 1
fi
if grep -q "xlsx-latest" index.html; then
    echo "FAIL: Unpinned xlsx-latest found in index.html!" >&2
    exit 1
fi
if grep -q "esm.sh" index.html; then
    echo "FAIL: Dead esm.sh importmap found in index.html!" >&2
    exit 1
fi
if ! grep -q "sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT" index.html; then
    echo "FAIL: Missing or incorrect SHA-384 SRI hash for SheetJS in index.html!" >&2
    exit 1
fi
echo "PASS: index.html has zero unpinned CDNs and verified SheetJS SRI hash."

echo "=== [4/5] Running TypeScript & Vite Production Single-File Build ==="
npm run build

ENTRY_FILE="dist/index.html"
if [ ! -f "$ENTRY_FILE" ]; then
    echo "FAIL: $ENTRY_FILE was not generated!" >&2
    exit 1
fi

BUNDLE_SIZE_BYTES=$(wc -c < "$ENTRY_FILE")
BUNDLE_SIZE_KB=$(( BUNDLE_SIZE_BYTES / 1024 ))
echo "Compiled bundle size: ${BUNDLE_SIZE_KB} KB ($BUNDLE_SIZE_BYTES bytes)"

# Target budget: ~500-650 KB (ensuring xlsx was NOT bundled and Tailwind compiled cleanly)
if [ "$BUNDLE_SIZE_KB" -gt 700 ]; then
    echo "FAIL: Bundle size exceeded 700 KB (${BUNDLE_SIZE_KB} KB)! Check if heavy dependencies were bundled." >&2
    exit 1
fi
if [ "$BUNDLE_SIZE_KB" -lt 400 ]; then
    echo "FAIL: Bundle size suspiciously small (${BUNDLE_SIZE_KB} KB)!" >&2
    exit 1
fi
echo "PASS: Single-file bundle strictly within budget (${BUNDLE_SIZE_KB} KB)."

echo "=== [5/5] Auditing Production Dependencies ==="
# Audit production dependencies only (dev dependencies like firebase-tools CLI are not bundled)
npm audit --omit=dev

echo ""
echo "=============================================================================="
echo "SUCCESS: All WiZiT security audit and remediation checks passed!"
echo "=============================================================================="
