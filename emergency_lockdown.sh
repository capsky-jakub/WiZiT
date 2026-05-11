#!/bin/sh
# POSIX-compliant script to trigger an emergency lockdown for WiZiT.
# This script disables Firebase hosting and deletes all existing GCP API keys,
# creating a single new replacement key to stop an active DDoS or abuse attack.

# Use strict error handling for safety
# set -e: Exit immediately if a command exits with a non-zero status.
# set -u: Treat unset variables as an error when substituting.
# set -o pipefail: The return value of a pipeline is the status of the last command to exit with a non-zero status.
set -eu
set -o pipefail 2>/dev/null || true

PROJECT_ID="proj-visopt"
SITE_NAME="wizit"

echo "============================================================"
echo "🚨 EMERGENCY LOCKDOWN INITIATED 🚨"
echo "Project: $PROJECT_ID"
echo "Target Site: $SITE_NAME"
echo "============================================================"
echo "WARNING: This script will:"
echo "1. Disable the website (take it completely offline)."
echo "2. Delete ALL existing Google Cloud API keys for the project."
echo "3. Generate a new, unrestricted API key."
echo ""

# Safety prompt: Reads user input from standard input to confirm destructive action
printf "Are you absolutely sure you want to proceed? (Type 'YES' to confirm): "
read -r CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Lockdown aborted by user."
    exit 0
fi

echo ""
echo "[1/3] Disabling Firebase Hosting..."
# firebase hosting:disable
# --project "$PROJECT_ID": Ensure we target the correct project explicitly.
# -s "$SITE_NAME": Target the specific site identifier defined in firebase.json/targets.
# -f: Force execution without interactive confirmation, crucial for an automated emergency script.
firebase hosting:disable --project "$PROJECT_ID" -s "$SITE_NAME" -f
echo "✅ Website offline."

echo ""
echo "[2/3] Rotating API Keys (Deleting existing keys)..."
# gcloud services api-keys list
# --format="value(name)": Extracts only the raw resource name string, removing table headers 
# and extra formatting. This allows us to loop through the output cleanly.
KEY_NAMES=$(gcloud services api-keys list --project "$PROJECT_ID" --format="value(name)")

if [ -z "$KEY_NAMES" ]; then
    echo "No existing API keys found to delete."
else
    # Loop over each key resource name and delete it.
    # The variable expansion without quotes ($KEY_NAMES) splits on whitespace/newlines, 
    # iterating over each resource name correctly.
    for KEY in $KEY_NAMES; do
        echo "Deleting key: $KEY"
        # --quiet: Suppresses all interactive prompts to ensure the script doesn't hang.
        gcloud services api-keys delete "$KEY" --project "$PROJECT_ID" --quiet
    done
    echo "✅ Old API keys deleted."
fi

echo ""
echo "[3/3] Generating a new emergency API key..."
# Create a new key so the user isn't left completely locked out of their APIs once the attack subsides.
# --display-name: Helps identify the key in the GCP console later.
gcloud services api-keys create --project "$PROJECT_ID" --display-name="Emergency-Replacement-Key"
echo "✅ New API key generated."
echo ""
echo "============================================================"
echo "🚨 LOCKDOWN COMPLETE 🚨"
echo "The site is offline and all previous API keys have been invalidated."
echo "To restore normal operation later, you will need to:"
echo "1. Deploy the site again (e.g., firebase deploy --only hosting)"
echo "2. Check GCP Console and configure the new API key with the correct HTTP/API restrictions."
echo "============================================================"
