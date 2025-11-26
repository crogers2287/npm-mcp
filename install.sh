#!/bin/bash
#
# NPM MCP Installer
# Automated setup for Nginx Proxy Manager MCP Server
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default paths
CLAUDE_SETTINGS_DIR="$HOME/.claude"
CLAUDE_SETTINGS_FILE="$CLAUDE_SETTINGS_DIR/settings.json"

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║   ${BOLD}NPM MCP Installer${NC}${CYAN}                                       ║"
    echo "║   Nginx Proxy Manager MCP Server for Claude Code          ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print colored messages
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
prompt() { echo -e "${CYAN}[?]${NC} $1"; }

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."

    local missing=()

    if ! command_exists node; then
        missing+=("node")
    else
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 18 ]; then
            error "Node.js version 18+ required (found: $(node --version))"
            exit 1
        fi
        success "Node.js $(node --version) found"
    fi

    if ! command_exists npm; then
        missing+=("npm")
    else
        success "npm $(npm --version) found"
    fi

    if ! command_exists jq; then
        warning "jq not found - will attempt to install"
        if command_exists apt-get; then
            sudo apt-get update && sudo apt-get install -y jq
        elif command_exists brew; then
            brew install jq
        elif command_exists yum; then
            sudo yum install -y jq
        else
            error "Please install jq manually: https://stedolan.github.io/jq/download/"
            exit 1
        fi
    fi
    success "jq found"

    if [ ${#missing[@]} -gt 0 ]; then
        error "Missing required tools: ${missing[*]}"
        echo ""
        echo "Please install the missing tools and run the installer again."
        echo ""
        echo "On Ubuntu/Debian:"
        echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "  sudo apt-get install -y nodejs"
        echo ""
        exit 1
    fi

    success "All prerequisites met"
    echo ""
}

# Install npm dependencies
install_dependencies() {
    info "Installing npm dependencies..."
    cd "$SCRIPT_DIR"

    if [ -f "package-lock.json" ] && [ -d "node_modules" ]; then
        info "Dependencies already installed, checking for updates..."
        npm install --silent
    else
        npm install --silent
    fi

    success "Dependencies installed"
}

# Build TypeScript
build_project() {
    info "Building TypeScript project..."
    cd "$SCRIPT_DIR"

    npm run build --silent

    if [ -f "dist/index.js" ]; then
        success "Build completed"
    else
        error "Build failed - dist/index.js not found"
        exit 1
    fi
}

# Prompt for NPM configuration
configure_npm() {
    echo ""
    echo -e "${BOLD}NPM Configuration${NC}"
    echo "─────────────────────────────────────────────────────────────"
    echo ""

    # Check for existing config
    if [ -f "$SCRIPT_DIR/.env" ]; then
        source "$SCRIPT_DIR/.env"
        info "Found existing configuration"
        prompt "Use existing settings? (y/n)"
        read -r use_existing
        if [ "$use_existing" = "y" ] || [ "$use_existing" = "Y" ]; then
            return 0
        fi
    fi

    # NPM Host
    prompt "Enter your NPM hostname (e.g., npm.example.com):"
    read -r NPM_HOST
    if [ -z "$NPM_HOST" ]; then
        error "NPM host is required"
        exit 1
    fi

    # HTTPS
    prompt "Use HTTPS? (y/n) [y]:"
    read -r use_https
    if [ "$use_https" = "n" ] || [ "$use_https" = "N" ]; then
        NPM_HTTPS="false"
    else
        NPM_HTTPS="true"
    fi

    # Port (optional)
    prompt "Enter NPM port (leave empty for default 80/443):"
    read -r NPM_PORT

    # Email
    prompt "Enter your NPM admin email:"
    read -r NPM_EMAIL
    if [ -z "$NPM_EMAIL" ]; then
        error "Email is required"
        exit 1
    fi

    # Password
    prompt "Enter your NPM admin password:"
    read -rs NPM_PASSWORD
    echo ""
    if [ -z "$NPM_PASSWORD" ]; then
        error "Password is required"
        exit 1
    fi

    # Save to .env file
    cat > "$SCRIPT_DIR/.env" << EOF
NPM_HOST="$NPM_HOST"
NPM_HTTPS="$NPM_HTTPS"
NPM_PORT="$NPM_PORT"
NPM_EMAIL="$NPM_EMAIL"
NPM_PASSWORD='$NPM_PASSWORD'
EOF
    chmod 600 "$SCRIPT_DIR/.env"

    success "Configuration saved to .env"
}

# Test NPM connection
test_connection() {
    info "Testing connection to NPM..."

    source "$SCRIPT_DIR/.env"

    local protocol="http"
    [ "$NPM_HTTPS" = "true" ] && protocol="https"

    local url="$protocol://$NPM_HOST"
    [ -n "$NPM_PORT" ] && url="$url:$NPM_PORT"
    url="$url/api/"

    local response
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        local version=$(echo "$body" | jq -r '.version | "\(.major).\(.minor).\(.revision)"' 2>/dev/null)
        success "Connected to NPM v$version"
    else
        error "Failed to connect to NPM (HTTP $http_code)"
        echo ""
        echo "Please check:"
        echo "  - NPM host is correct: $NPM_HOST"
        echo "  - NPM is running and accessible"
        echo "  - HTTPS setting is correct: $NPM_HTTPS"
        echo ""
        prompt "Continue anyway? (y/n)"
        read -r continue_anyway
        if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
            exit 1
        fi
    fi

    # Test authentication
    info "Testing authentication..."

    local auth_url="$protocol://$NPM_HOST"
    [ -n "$NPM_PORT" ] && auth_url="$auth_url:$NPM_PORT"
    auth_url="$auth_url/api/tokens"

    local auth_response
    auth_response=$(curl -s -X POST "$auth_url" \
        -H "Content-Type: application/json" \
        -d "{\"identity\":\"$NPM_EMAIL\",\"secret\":\"$NPM_PASSWORD\"}" 2>/dev/null)

    if echo "$auth_response" | jq -e '.token' >/dev/null 2>&1; then
        success "Authentication successful"
    else
        local error_msg=$(echo "$auth_response" | jq -r '.error.message' 2>/dev/null)
        error "Authentication failed: $error_msg"
        echo ""
        echo "Please check your email and password."
        prompt "Re-enter credentials? (y/n)"
        read -r retry
        if [ "$retry" = "y" ] || [ "$retry" = "Y" ]; then
            configure_npm
            test_connection
        else
            exit 1
        fi
    fi
}

# Configure Claude Code settings
configure_claude() {
    echo ""
    echo -e "${BOLD}Claude Code Configuration${NC}"
    echo "─────────────────────────────────────────────────────────────"
    echo ""

    source "$SCRIPT_DIR/.env"

    # Create .claude directory if needed
    if [ ! -d "$CLAUDE_SETTINGS_DIR" ]; then
        info "Creating $CLAUDE_SETTINGS_DIR..."
        mkdir -p "$CLAUDE_SETTINGS_DIR"
    fi

    # Build env object for JSON
    local env_json="{\"NPM_HOST\":\"$NPM_HOST\",\"NPM_HTTPS\":\"$NPM_HTTPS\",\"NPM_EMAIL\":\"$NPM_EMAIL\",\"NPM_PASSWORD\":\"$NPM_PASSWORD\""
    [ -n "$NPM_PORT" ] && env_json="$env_json,\"NPM_PORT\":\"$NPM_PORT\""
    env_json="$env_json}"

    # New MCP server config
    local mcp_config=$(cat << EOF
{
  "command": "node",
  "args": ["$SCRIPT_DIR/dist/index.js"],
  "env": $env_json
}
EOF
)

    if [ -f "$CLAUDE_SETTINGS_FILE" ]; then
        info "Found existing Claude Code settings"

        # Check if npm MCP already configured
        if jq -e '.mcpServers.npm' "$CLAUDE_SETTINGS_FILE" >/dev/null 2>&1; then
            prompt "NPM MCP already configured. Update it? (y/n)"
            read -r update_mcp
            if [ "$update_mcp" != "y" ] && [ "$update_mcp" != "Y" ]; then
                info "Keeping existing MCP configuration"
                return 0
            fi
        fi

        # Backup existing settings
        cp "$CLAUDE_SETTINGS_FILE" "$CLAUDE_SETTINGS_FILE.backup"
        info "Backed up settings to $CLAUDE_SETTINGS_FILE.backup"

        # Update settings
        local updated_settings
        if jq -e '.mcpServers' "$CLAUDE_SETTINGS_FILE" >/dev/null 2>&1; then
            # mcpServers exists, add/update npm
            updated_settings=$(jq --argjson npm "$mcp_config" '.mcpServers.npm = $npm' "$CLAUDE_SETTINGS_FILE")
        else
            # mcpServers doesn't exist, create it
            updated_settings=$(jq --argjson npm "$mcp_config" '. + {mcpServers: {npm: $npm}}' "$CLAUDE_SETTINGS_FILE")
        fi

        echo "$updated_settings" > "$CLAUDE_SETTINGS_FILE"
        success "Updated Claude Code settings"
    else
        # Create new settings file
        info "Creating new Claude Code settings..."

        cat > "$CLAUDE_SETTINGS_FILE" << EOF
{
  "mcpServers": {
    "npm": $mcp_config
  }
}
EOF
        success "Created Claude Code settings"
    fi

    echo ""
    success "Claude Code configured to use NPM MCP"
}

# Print completion message
print_completion() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║   ${BOLD}Installation Complete!${NC}${GREEN}                                 ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo ""
    echo "  1. ${YELLOW}Restart Claude Code${NC} to load the MCP server"
    echo ""
    echo "  2. Try these commands in Claude Code:"
    echo "     - \"List my NPM proxy hosts\""
    echo "     - \"Create a proxy host for app.example.com\""
    echo "     - \"Show my SSL certificates\""
    echo ""
    echo -e "${BOLD}Useful Files:${NC}"
    echo "  - Settings: $CLAUDE_SETTINGS_FILE"
    echo "  - Config:   $SCRIPT_DIR/.env"
    echo "  - Logs:     Run with DEBUG=1 for verbose output"
    echo ""
    echo -e "${BOLD}Need Help?${NC}"
    echo "  - GitHub: https://github.com/crogers2287/npm-mcp"
    echo "  - Issues: https://github.com/crogers2287/npm-mcp/issues"
    echo ""
}

# Uninstall function
uninstall() {
    print_banner
    echo -e "${BOLD}Uninstalling NPM MCP...${NC}"
    echo ""

    # Remove from Claude settings
    if [ -f "$CLAUDE_SETTINGS_FILE" ]; then
        if jq -e '.mcpServers.npm' "$CLAUDE_SETTINGS_FILE" >/dev/null 2>&1; then
            info "Removing NPM MCP from Claude Code settings..."
            local updated=$(jq 'del(.mcpServers.npm)' "$CLAUDE_SETTINGS_FILE")

            # Clean up empty mcpServers
            if [ "$(echo "$updated" | jq '.mcpServers | length')" = "0" ]; then
                updated=$(echo "$updated" | jq 'del(.mcpServers)')
            fi

            echo "$updated" > "$CLAUDE_SETTINGS_FILE"
            success "Removed from Claude Code settings"
        fi
    fi

    # Remove .env
    if [ -f "$SCRIPT_DIR/.env" ]; then
        rm "$SCRIPT_DIR/.env"
        success "Removed configuration file"
    fi

    # Remove node_modules and dist
    prompt "Remove node_modules and dist? (y/n)"
    read -r remove_deps
    if [ "$remove_deps" = "y" ] || [ "$remove_deps" = "Y" ]; then
        rm -rf "$SCRIPT_DIR/node_modules" "$SCRIPT_DIR/dist"
        success "Removed dependencies and build files"
    fi

    echo ""
    success "NPM MCP uninstalled"
    echo ""
    echo "Note: Restart Claude Code to apply changes"
    echo ""
}

# Main installation flow
main() {
    print_banner

    # Parse arguments
    case "${1:-}" in
        --uninstall|-u)
            uninstall
            exit 0
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --help, -h       Show this help message"
            echo "  --uninstall, -u  Uninstall NPM MCP"
            echo ""
            exit 0
            ;;
    esac

    check_prerequisites
    install_dependencies
    build_project
    configure_npm
    test_connection
    configure_claude
    print_completion
}

# Run main
main "$@"
