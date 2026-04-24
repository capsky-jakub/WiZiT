#!/bin/bash

# ==============================================================================
# WIZIT DEPLOYMENT REPORT
# Executable script for Building, Syncing, and Deploying WiZiT
# ==============================================================================

# --- CONFIGURATION ---
# Load local environment variables if available
set -a; [ -f .env.local ] && . .env.local; set +a

WIZIT_PROJECT_DIR="/home/capsky-jakub/Dev/WebDev/WiZiT"
WIZIT_FIREBASE_KEY="${VITE_FIREBASE_API_KEY:-}"

# Exit immediately if a command exits with a non-zero status
set -e

# --- HELPER FUNCTIONS (Subroutines) ---
# source ~/.bashrc

function _log() {
    echo "========================================================"
    echo "$1"
    echo "========================================================"
}

# 1. Enter Directory
function _wizit_cd() {
    _log "STEP 0: Navigating to Project Directory"
    cd "$WIZIT_PROJECT_DIR" || { echo "!!! ERROR: Could not find project directory !!!"; exit 1; }
    echo "PWD: $(pwd)"
}

# 2. Git Pull
function _wizit_sync() {
    _log "STEP 1: Pulling latest from GitHub"
    git pull origin main
}

# 3. Clean & Build
function _wizit_build() {
    _log "STEP 2: Cleaning dist folder"
    rm -rf dist

    _log "STEP 3: Running Vite Build"
    npm run build
}

# 4. Sanitize, Version & Deploy
function _wizit_deploy_logic() {
    local ENTRY_FILE="dist/index.html"

    # Check if the compiler produced the file
    if [ ! -f "$ENTRY_FILE" ]; then
        echo "!!! ERROR: $ENTRY_FILE was not found after build !!!"
        exit 1
    fi

    _log "STEP 4: Versioning & Sanitizing"

    # --- VERSION INJECTION ---
    local NEW_VERSION="v$(date +'%y.%m%d.%H%M')"
    echo "Injecting Version: $NEW_VERSION"
    sed -i "s/WIZIT_APP_VERSION/$NEW_VERSION/g" "$ENTRY_FILE"

    # --- API KEY SANITIZATION ---
    # 1. Protect specific Firebase key via placeholder
    sed -i "s/$WIZIT_FIREBASE_KEY/MY_PROTECTED_FIREBASE_KEY/g" "$ENTRY_FILE"
    
    # 2. Wipe ALL other Google API keys (AIzaSy + 33 chars)
    sed -i -E 's/AIzaSy[A-Za-z0-9_-]{33}//g' "$ENTRY_FILE"
    
    # 3. Restore specific key from placeholder
    sed -i "s/MY_PROTECTED_FIREBASE_KEY/$WIZIT_FIREBASE_KEY/g" "$ENTRY_FILE"

    _log "STEP 5: Deploying to Firebase Hosting"
    
    # --- DEBUG TRACE START ---
    set -x 
    
    # Deploy to Firebase Hosting
    npx firebase deploy --only hosting
    
    set +x
    # --- DEBUG TRACE END ---

    echo ""
    echo "------------------------------------------------"
    echo "SUCCESS: Build, Sanitized, and Deployed to Firebase!"
    echo "URL      : https://wizit.web.app"
    echo "Version  : $NEW_VERSION"
    echo "------------------------------------------------"
}

# ==============================================================================
# MAIN DISPATCHER (Selection Screen)
# ==============================================================================

# Ensure we are in the right place before doing anything
_wizit_cd

COMMAND=$1

case "$COMMAND" in
    "sync-build-deploy")
        _wizit_sync && _wizit_build && _wizit_deploy_logic
        ;;
    "sync-build")
        _wizit_sync && _wizit_build
        ;;
    "build-deploy")
        _wizit_build && _wizit_deploy_logic
        ;;
    "deploy")
        _wizit_deploy_logic
        ;;
    "build")
        _wizit_build
        ;;
    *)
        echo "Usage: ./deploy.sh [sync-build-deploy | sync-build | build-deploy | deploy | build]"
        echo "Example: ./deploy.sh build-deploy"
        exit 1
        ;;
esac