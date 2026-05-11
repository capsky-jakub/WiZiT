#!/bin/bash
# ==============================================================================
# BRANDING SYNCHRONIZER
# Ensures that branding.json is the Single Source of Truth (SSoT) for:
# 1. package.json (author, repository)
# 2. README.md (footer and license links)
# ==============================================================================

set -euo pipefail

BRANDING_FILE="branding.json"
PACKAGE_FILE="package.json"
README_FILE="README.md"

# --- 1. Load Data from branding.json ---
# Using jq for robust JSON parsing. 
# The -r flag returns 'raw' strings without quotes.
AUTHOR=$(jq -r '.author' "$BRANDING_FILE")
EMAIL=$(jq -r '.email' "$BRANDING_FILE")
GITHUB=$(jq -r '.githubUrl' "$BRANDING_FILE")
LICENSE_NAME=$(jq -r '.license' "$BRANDING_FILE")
LICENSE_URL=$(jq -r '.licenseUrl' "$BRANDING_FILE")
START_YEAR=$(jq -r '.copyrightStartYear' "$BRANDING_FILE")
CURRENT_YEAR=$(date +%Y)

echo ">>> Syncing branding for: $AUTHOR ($EMAIL)"

# --- 2. Update package.json ---
# We update the author and ensure it reflects the latest data.
# Note: jq outputs to a temp file then we move it back to avoid race conditions.
jq --arg author "$AUTHOR" '.author = $author' "$PACKAGE_FILE" > "$PACKAGE_FILE.tmp" && mv "$PACKAGE_FILE.tmp" "$PACKAGE_FILE"

# --- 3. Update README.md Footer ---
# We use Python to handle multi-line replacement between markers safely.
# This is much cleaner than complex sed/awk for multi-line blocks.

python3 - <<EOF
import os

branding_file = "$BRANDING_FILE"
readme_file = "$README_FILE"
start_year = "$START_YEAR"
current_year = "$CURRENT_YEAR"
email = "$EMAIL"
author = "$AUTHOR"
github = "$GITHUB"

new_footer = f"""<!-- FOOTER_START -->
<div align="center">
  Copyright © {start_year}-{current_year} | <a href="mailto:{email}">{author}</a> | <a href="{github}">GitHub</a>
</div>
<!-- FOOTER_END -->"""

with open(readme_file, 'r') as f:
    content = f.read()

import re
pattern = r"<!-- FOOTER_START -->.*?<!-- FOOTER_END -->"
new_content = re.sub(pattern, new_footer, content, flags=re.DOTALL)

with open(readme_file, 'w') as f:
    f.write(new_content)
EOF


# --- 4. Update README.md License Badge/Link (Optional but good) ---
# [![License](https://img.shields.io/badge/License-AGPL_3.0-green.svg?style=for-the-badge)](https://www.gnu.org/licenses/agpl-3.0.html)
# We update the license link if it exists.
sed -i -E "s|\[!\[License\].*\(https://www.gnu.org/licenses/.*\)|[![License](https://img.shields.io/badge/License-${LICENSE_NAME}-green.svg?style=for-the-badge)]($LICENSE_URL)|" "$README_FILE"

echo ">>> Sync complete!"
echo "    - Updated: $PACKAGE_FILE"
echo "    - Updated: $README_FILE"
echo "    - Logic: SSoT is $BRANDING_FILE"
