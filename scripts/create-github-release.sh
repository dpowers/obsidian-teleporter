#!/bin/bash

# Script to create a GitHub release for Obsidian Teleporter
# This script uses the GitHub API to create a release and upload assets

set -e

# Configuration
REPO_OWNER="dpowers"
REPO_NAME="obsidian-teleporter"
VERSION="1.0.0"
RELEASE_DIR="releases/v${VERSION}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to print colored output
print_color() {
    color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Welcome message
print_color "$CYAN" "
╔════════════════════════════════════════════════╗
║     GitHub Release Creator for Teleporter     ║
║                 Version ${VERSION}                  ║
╚════════════════════════════════════════════════╝
"

# Check prerequisites
print_color "$BOLD" "Checking prerequisites..."

if ! command_exists curl; then
    print_color "$RED" "✗ curl is not installed. Please install curl first."
    exit 1
fi

if ! command_exists jq; then
    print_color "$YELLOW" "⚠ jq is not installed. JSON parsing will be limited."
    print_color "$YELLOW" "  Install jq for better error handling: brew install jq (macOS) or apt-get install jq (Linux)"
fi

# Check if release files exist
if [ ! -d "$RELEASE_DIR" ]; then
    print_color "$RED" "✗ Release directory not found: $RELEASE_DIR"
    print_color "$YELLOW" "  Please run: node scripts/prepare-release.mjs"
    exit 1
fi

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    print_color "$YELLOW" "\n⚠ GITHUB_TOKEN environment variable not set."
    print_color "$CYAN" "\nTo create a GitHub personal access token:"
    print_color "$NC" "  1. Go to: https://github.com/settings/tokens/new"
    print_color "$NC" "  2. Give it a name (e.g., 'Obsidian Teleporter Release')"
    print_color "$NC" "  3. Select scope: 'repo' (Full control of private repositories)"
    print_color "$NC" "  4. Click 'Generate token'"
    print_color "$NC" "  5. Copy the token (you won't see it again!)"
    print_color "$NC" ""
    read -p "Enter your GitHub personal access token: " -s GITHUB_TOKEN
    echo

    if [ -z "$GITHUB_TOKEN" ]; then
        print_color "$RED" "✗ No token provided. Exiting."
        exit 1
    fi
fi

# API endpoints
API_BASE="https://api.github.com"
UPLOAD_BASE="https://uploads.github.com"
REPO_API="${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}"

# Function to make API request
api_request() {
    method=$1
    endpoint=$2
    data=$3

    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$endpoint"
    fi
}

# Check if release already exists
print_color "$BOLD" "\nChecking for existing release..."
existing_release=$(api_request GET "${REPO_API}/releases/tags/${VERSION}" 2>/dev/null)

if echo "$existing_release" | grep -q "\"tag_name\""; then
    print_color "$YELLOW" "⚠ Release ${VERSION} already exists!"
    read -p "Do you want to delete it and create a new one? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command_exists jq; then
            release_id=$(echo "$existing_release" | jq -r '.id')
        else
            release_id=$(echo "$existing_release" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
        fi

        print_color "$YELLOW" "Deleting existing release..."
        api_request DELETE "${REPO_API}/releases/${release_id}" > /dev/null
        print_color "$GREEN" "✓ Existing release deleted"
    else
        print_color "$RED" "✗ Aborted. Existing release kept."
        exit 1
    fi
fi

# Read release notes
if [ -f "${RELEASE_DIR}/RELEASE_NOTES.md" ]; then
    RELEASE_NOTES=$(cat "${RELEASE_DIR}/RELEASE_NOTES.md")
else
    RELEASE_NOTES="Release v${VERSION}"
fi

# Create release
print_color "$BOLD" "\nCreating GitHub release v${VERSION}..."

release_data=$(cat <<EOF
{
  "tag_name": "${VERSION}",
  "target_commitish": "main",
  "name": "v${VERSION}",
  "body": $(echo "$RELEASE_NOTES" | jq -Rs . 2>/dev/null || echo "\"$RELEASE_NOTES\""),
  "draft": false,
  "prerelease": false
}
EOF
)

response=$(api_request POST "${REPO_API}/releases" "$release_data")

if echo "$response" | grep -q "\"upload_url\""; then
    print_color "$GREEN" "✓ Release created successfully!"

    # Extract upload URL
    if command_exists jq; then
        upload_url=$(echo "$response" | jq -r '.upload_url' | cut -d'{' -f1)
    else
        upload_url=$(echo "$response" | grep -o '"upload_url":"[^"]*' | cut -d'"' -f4 | cut -d'{' -f1)
    fi
else
    print_color "$RED" "✗ Failed to create release"
    print_color "$YELLOW" "Response: $response"
    exit 1
fi

# Upload assets
print_color "$BOLD" "\nUploading release assets..."

upload_asset() {
    file_path=$1
    file_name=$(basename "$file_path")

    # Determine content type
    case "$file_name" in
        *.js) content_type="application/javascript";;
        *.json) content_type="application/json";;
        *.css) content_type="text/css";;
        *.zip) content_type="application/zip";;
        *.md) content_type="text/markdown";;
        *) content_type="application/octet-stream";;
    esac

    print_color "$NC" "  Uploading: $file_name"

    response=$(curl -s \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: $content_type" \
        --data-binary "@$file_path" \
        "${upload_url}?name=${file_name}")

    if echo "$response" | grep -q "\"state\":\"uploaded\""; then
        print_color "$GREEN" "  ✓ Uploaded: $file_name"
    else
        print_color "$RED" "  ✗ Failed to upload: $file_name"
        print_color "$YELLOW" "    Response: $response"
    fi
}

# Upload main files
for file in main.js manifest.json styles.css; do
    if [ -f "${RELEASE_DIR}/${file}" ]; then
        upload_asset "${RELEASE_DIR}/${file}"
    fi
done

# Upload ZIP if it exists
if [ -f "${RELEASE_DIR}/obsidian-teleporter-${VERSION}.zip" ]; then
    upload_asset "${RELEASE_DIR}/obsidian-teleporter-${VERSION}.zip"
fi

# Success message
print_color "$GREEN" "\n✨ Release v${VERSION} created successfully!"
print_color "$CYAN" "\nView your release at:"
print_color "$BLUE" "  https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${VERSION}"
print_color "$CYAN" "\nDirect download link:"
print_color "$BLUE" "  https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${VERSION}/obsidian-teleporter-${VERSION}.zip"

print_color "$BOLD" "\n📋 Next steps:"
print_color "$NC" "  1. Visit the release page to verify everything looks correct"
print_color "$NC" "  2. Edit the release if you need to make any changes"
print_color "$NC" "  3. Share the release link with users"
print_color "$NC" "  4. Consider submitting to Obsidian Community Plugins"

# Optionally save token for future use
echo
read -p "Would you like to save the GitHub token for future use? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "export GITHUB_TOKEN='$GITHUB_TOKEN'" >> ~/.zshrc
    print_color "$GREEN" "✓ Token saved to ~/.zshrc"
    print_color "$YELLOW" "  Run 'source ~/.zshrc' to use it in the current session"
fi
