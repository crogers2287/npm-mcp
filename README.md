# NPM MCP - Nginx Proxy Manager MCP Server

An MCP (Model Context Protocol) server for managing [Nginx Proxy Manager](https://nginxproxymanager.com/) through Claude and other MCP-compatible AI assistants.

## Features

- **Proxy Hosts**: Create, update, delete, enable/disable proxy hosts
- **SSL Certificates**: Manage Let's Encrypt certificates with DNS challenge support
- **Streams**: Configure TCP/UDP port forwarding
- **Access Lists**: Set up authentication with basic auth and IP rules
- **Redirection Hosts**: Configure URL redirections
- **Dead Hosts (404)**: Set up custom 404 pages
- **Users**: Manage NPM user accounts
- **System**: View audit logs, settings, and host reports

## Installation

```bash
# Clone the repository
git clone https://github.com/crogers2287/npm-mcp.git
cd npm-mcp

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

Set the following environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NPM_HOST` | Yes | - | NPM server hostname (e.g., `npm.example.com`) |
| `NPM_PORT` | No | - | NPM API port (omit for standard 80/443) |
| `NPM_EMAIL` | Yes | - | Admin email for authentication |
| `NPM_PASSWORD` | Yes | - | Admin password |
| `NPM_HTTPS` | No | `false` | Set to `true` for HTTPS connections |

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/.config/claude/claude_desktop_config.json` on Linux or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "npm": {
      "command": "node",
      "args": ["/path/to/npm-mcp/dist/index.js"],
      "env": {
        "NPM_HOST": "npm.example.com",
        "NPM_HTTPS": "true",
        "NPM_EMAIL": "admin@example.com",
        "NPM_PASSWORD": "your-password"
      }
    }
  }
}
```

## Claude Code Configuration

Add to your MCP settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "npm": {
      "command": "node",
      "args": ["/path/to/npm-mcp/dist/index.js"],
      "env": {
        "NPM_HOST": "npm.example.com",
        "NPM_HTTPS": "true",
        "NPM_EMAIL": "admin@example.com",
        "NPM_PASSWORD": "your-password"
      }
    }
  }
}
```

## Available Tools

### Proxy Hosts
- `npm_list_proxy_hosts` - List all proxy hosts
- `npm_get_proxy_host` - Get proxy host details
- `npm_create_proxy_host` - Create a new proxy host
- `npm_update_proxy_host` - Update a proxy host
- `npm_delete_proxy_host` - Delete a proxy host
- `npm_enable_proxy_host` - Enable a proxy host
- `npm_disable_proxy_host` - Disable a proxy host

### SSL Certificates
- `npm_list_certificates` - List all certificates
- `npm_get_certificate` - Get certificate details
- `npm_create_certificate` - Create a Let's Encrypt certificate
- `npm_delete_certificate` - Delete a certificate
- `npm_renew_certificate` - Renew a certificate

### Streams (TCP/UDP)
- `npm_list_streams` - List all streams
- `npm_get_stream` - Get stream details
- `npm_create_stream` - Create a new stream
- `npm_update_stream` - Update a stream
- `npm_delete_stream` - Delete a stream
- `npm_enable_stream` - Enable a stream
- `npm_disable_stream` - Disable a stream

### Access Lists
- `npm_list_access_lists` - List all access lists
- `npm_get_access_list` - Get access list details
- `npm_create_access_list` - Create an access list
- `npm_update_access_list` - Update an access list
- `npm_delete_access_list` - Delete an access list

### Redirection Hosts
- `npm_list_redirection_hosts` - List all redirections
- `npm_get_redirection_host` - Get redirection details
- `npm_create_redirection_host` - Create a redirection
- `npm_update_redirection_host` - Update a redirection
- `npm_delete_redirection_host` - Delete a redirection
- `npm_enable_redirection_host` - Enable a redirection
- `npm_disable_redirection_host` - Disable a redirection

### Dead Hosts (404)
- `npm_list_dead_hosts` - List all 404 hosts
- `npm_get_dead_host` - Get 404 host details
- `npm_create_dead_host` - Create a 404 host
- `npm_delete_dead_host` - Delete a 404 host

### Users
- `npm_list_users` - List all users
- `npm_get_user` - Get user details
- `npm_create_user` - Create a user
- `npm_delete_user` - Delete a user

### System
- `npm_list_audit_log` - View audit log
- `npm_list_settings` - List settings
- `npm_get_setting` - Get a setting value
- `npm_update_setting` - Update a setting
- `npm_get_hosts_report` - Get hosts summary

## Resources

The MCP server also exposes these resources:

- `npm://hosts/summary` - Summary of all configured hosts
- `npm://certificates/summary` - Summary of SSL certificates

## Usage Examples

### Create a Proxy Host

```
Create a proxy host for app.example.com that forwards to 192.168.1.100:8080
```

### Request SSL Certificate

```
Create a Let's Encrypt certificate for app.example.com
```

### Set Up Stream Forwarding

```
Create a TCP stream to forward port 25565 to minecraft-server:25565
```

### Create Access List with Basic Auth

```
Create an access list called "admin-only" with username "admin" and password "secret123"
```

## API Reference

This MCP server wraps the [Nginx Proxy Manager API](https://github.com/NginxProxyManager/nginx-proxy-manager/tree/develop/backend/schema). For detailed API documentation, see:

- [API Discussion](https://github.com/NginxProxyManager/nginx-proxy-manager/discussions/3265)
- [Bash API Tool](https://github.com/Erreur32/nginx-proxy-manager-Bash-API)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or pull request.
