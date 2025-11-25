#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  NPMApiClient,
  NPMConfig,
  CreateProxyHostRequest,
  CreateCertificateRequest,
  CreateStreamRequest,
  CreateAccessListRequest,
  CreateRedirectionHostRequest,
  CreateDeadHostRequest,
  CreateUserRequest,
} from "./api-client.js";

// Get configuration from environment variables
function getConfig(): NPMConfig {
  const host = process.env.NPM_HOST;
  const port = process.env.NPM_PORT;
  const email = process.env.NPM_EMAIL;
  const password = process.env.NPM_PASSWORD;
  const useHttps = process.env.NPM_HTTPS?.toLowerCase() === "true";

  if (!host || !email || !password) {
    throw new Error(
      "Missing required environment variables: NPM_HOST, NPM_EMAIL, NPM_PASSWORD"
    );
  }

  return {
    host,
    port: port ? parseInt(port, 10) : undefined,
    email,
    password,
    useHttps,
  };
}

// Initialize API client
let apiClient: NPMApiClient;

try {
  apiClient = new NPMApiClient(getConfig());
} catch (error) {
  console.error("Failed to initialize API client:", error);
  process.exit(1);
}

// Create MCP server
const server = new Server(
  {
    name: "npm-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ==================== Proxy Hosts ====================
      {
        name: "npm_list_proxy_hosts",
        description: "List all proxy hosts configured in Nginx Proxy Manager",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_get_proxy_host",
        description: "Get details of a specific proxy host by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The proxy host ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_create_proxy_host",
        description: "Create a new proxy host to forward traffic to a backend server",
        inputSchema: {
          type: "object",
          properties: {
            domain_names: {
              type: "array",
              items: { type: "string" },
              description: "Domain names to proxy (e.g., ['example.com', 'www.example.com'])",
            },
            forward_host: {
              type: "string",
              description: "Backend server hostname or IP address",
            },
            forward_port: {
              type: "number",
              description: "Backend server port",
            },
            forward_scheme: {
              type: "string",
              enum: ["http", "https"],
              description: "Protocol to use when forwarding (default: http)",
            },
            ssl_forced: {
              type: "boolean",
              description: "Force HTTPS redirect",
            },
            http2_support: {
              type: "boolean",
              description: "Enable HTTP/2 support",
            },
            block_exploits: {
              type: "boolean",
              description: "Block common exploits",
            },
            allow_websocket_upgrade: {
              type: "boolean",
              description: "Allow WebSocket upgrades",
            },
            certificate_id: {
              type: "number",
              description: "SSL certificate ID to use (0 for none)",
            },
            access_list_id: {
              type: "number",
              description: "Access list ID for authentication (0 for none)",
            },
            advanced_config: {
              type: "string",
              description: "Custom nginx configuration",
            },
          },
          required: ["domain_names", "forward_host", "forward_port"],
        },
      },
      {
        name: "npm_update_proxy_host",
        description: "Update an existing proxy host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The proxy host ID to update",
            },
            domain_names: {
              type: "array",
              items: { type: "string" },
              description: "Domain names to proxy",
            },
            forward_host: {
              type: "string",
              description: "Backend server hostname or IP address",
            },
            forward_port: {
              type: "number",
              description: "Backend server port",
            },
            forward_scheme: {
              type: "string",
              enum: ["http", "https"],
              description: "Protocol to use when forwarding",
            },
            ssl_forced: {
              type: "boolean",
              description: "Force HTTPS redirect",
            },
            http2_support: {
              type: "boolean",
              description: "Enable HTTP/2 support",
            },
            block_exploits: {
              type: "boolean",
              description: "Block common exploits",
            },
            allow_websocket_upgrade: {
              type: "boolean",
              description: "Allow WebSocket upgrades",
            },
            certificate_id: {
              type: "number",
              description: "SSL certificate ID to use",
            },
            access_list_id: {
              type: "number",
              description: "Access list ID for authentication",
            },
            advanced_config: {
              type: "string",
              description: "Custom nginx configuration",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_delete_proxy_host",
        description: "Delete a proxy host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The proxy host ID to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_enable_proxy_host",
        description: "Enable a proxy host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The proxy host ID to enable",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_disable_proxy_host",
        description: "Disable a proxy host without deleting it",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The proxy host ID to disable",
            },
          },
          required: ["id"],
        },
      },

      // ==================== Certificates ====================
      {
        name: "npm_list_certificates",
        description: "List all SSL certificates",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_get_certificate",
        description: "Get details of a specific certificate",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The certificate ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_create_certificate",
        description: "Create a new Let's Encrypt SSL certificate",
        inputSchema: {
          type: "object",
          properties: {
            domain_names: {
              type: "array",
              items: { type: "string" },
              description: "Domain names for the certificate",
            },
            nice_name: {
              type: "string",
              description: "Friendly name for the certificate",
            },
            dns_challenge: {
              type: "boolean",
              description: "Use DNS challenge instead of HTTP",
            },
            dns_provider: {
              type: "string",
              description: "DNS provider for DNS challenge (e.g., cloudflare)",
            },
            dns_provider_credentials: {
              type: "string",
              description: "DNS provider API credentials",
            },
            letsencrypt_email: {
              type: "string",
              description: "Email for Let's Encrypt notifications",
            },
          },
          required: ["domain_names"],
        },
      },
      {
        name: "npm_delete_certificate",
        description: "Delete a certificate",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The certificate ID to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_renew_certificate",
        description: "Renew a Let's Encrypt certificate",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The certificate ID to renew",
            },
          },
          required: ["id"],
        },
      },

      // ==================== Streams ====================
      {
        name: "npm_list_streams",
        description: "List all TCP/UDP stream configurations",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_get_stream",
        description: "Get details of a specific stream",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The stream ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_create_stream",
        description: "Create a new TCP/UDP stream to forward traffic",
        inputSchema: {
          type: "object",
          properties: {
            incoming_port: {
              type: "number",
              description: "Port to listen on",
            },
            forwarding_host: {
              type: "string",
              description: "Backend server hostname or IP",
            },
            forwarding_port: {
              type: "number",
              description: "Backend server port",
            },
            tcp_forwarding: {
              type: "boolean",
              description: "Enable TCP forwarding (default: true)",
            },
            udp_forwarding: {
              type: "boolean",
              description: "Enable UDP forwarding (default: false)",
            },
          },
          required: ["incoming_port", "forwarding_host", "forwarding_port"],
        },
      },
      {
        name: "npm_update_stream",
        description: "Update an existing stream",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The stream ID to update",
            },
            incoming_port: {
              type: "number",
              description: "Port to listen on",
            },
            forwarding_host: {
              type: "string",
              description: "Backend server hostname or IP",
            },
            forwarding_port: {
              type: "number",
              description: "Backend server port",
            },
            tcp_forwarding: {
              type: "boolean",
              description: "Enable TCP forwarding",
            },
            udp_forwarding: {
              type: "boolean",
              description: "Enable UDP forwarding",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_delete_stream",
        description: "Delete a stream",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The stream ID to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_enable_stream",
        description: "Enable a stream",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The stream ID to enable",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_disable_stream",
        description: "Disable a stream without deleting it",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The stream ID to disable",
            },
          },
          required: ["id"],
        },
      },

      // ==================== Access Lists ====================
      {
        name: "npm_list_access_lists",
        description: "List all access lists for authentication",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_get_access_list",
        description: "Get details of a specific access list",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The access list ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_create_access_list",
        description: "Create a new access list for authentication",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the access list",
            },
            satisfy_any: {
              type: "boolean",
              description: "Allow access if ANY rule matches (vs ALL)",
            },
            pass_auth: {
              type: "boolean",
              description: "Pass authentication header to backend",
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                },
              },
              description: "Username/password pairs for basic auth",
            },
            clients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  address: { type: "string" },
                  directive: { type: "string", enum: ["allow", "deny"] },
                },
              },
              description: "IP-based access rules",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "npm_update_access_list",
        description: "Update an existing access list",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The access list ID to update",
            },
            name: {
              type: "string",
              description: "Name of the access list",
            },
            satisfy_any: {
              type: "boolean",
              description: "Allow access if ANY rule matches (vs ALL)",
            },
            pass_auth: {
              type: "boolean",
              description: "Pass authentication header to backend",
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                },
              },
              description: "Username/password pairs for basic auth",
            },
            clients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  address: { type: "string" },
                  directive: { type: "string", enum: ["allow", "deny"] },
                },
              },
              description: "IP-based access rules",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_delete_access_list",
        description: "Delete an access list",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The access list ID to delete",
            },
          },
          required: ["id"],
        },
      },

      // ==================== Redirection Hosts ====================
      {
        name: "npm_list_redirection_hosts",
        description: "List all URL redirection hosts",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_get_redirection_host",
        description: "Get details of a specific redirection host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The redirection host ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_create_redirection_host",
        description: "Create a new URL redirection host",
        inputSchema: {
          type: "object",
          properties: {
            domain_names: {
              type: "array",
              items: { type: "string" },
              description: "Domain names to redirect from",
            },
            forward_scheme: {
              type: "string",
              enum: ["http", "https", "$scheme"],
              description: "Scheme to use in redirect URL",
            },
            forward_domain_name: {
              type: "string",
              description: "Domain name to redirect to",
            },
            forward_http_code: {
              type: "number",
              description: "HTTP redirect code (301, 302, etc.)",
            },
            preserve_path: {
              type: "boolean",
              description: "Preserve the URL path in redirect",
            },
            ssl_forced: {
              type: "boolean",
              description: "Force HTTPS",
            },
            certificate_id: {
              type: "number",
              description: "SSL certificate ID",
            },
          },
          required: ["domain_names", "forward_scheme", "forward_domain_name"],
        },
      },
      {
        name: "npm_update_redirection_host",
        description: "Update an existing redirection host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The redirection host ID to update",
            },
            domain_names: {
              type: "array",
              items: { type: "string" },
              description: "Domain names to redirect from",
            },
            forward_scheme: {
              type: "string",
              enum: ["http", "https", "$scheme"],
              description: "Scheme to use in redirect URL",
            },
            forward_domain_name: {
              type: "string",
              description: "Domain name to redirect to",
            },
            forward_http_code: {
              type: "number",
              description: "HTTP redirect code",
            },
            preserve_path: {
              type: "boolean",
              description: "Preserve the URL path in redirect",
            },
            ssl_forced: {
              type: "boolean",
              description: "Force HTTPS",
            },
            certificate_id: {
              type: "number",
              description: "SSL certificate ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_delete_redirection_host",
        description: "Delete a redirection host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The redirection host ID to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_enable_redirection_host",
        description: "Enable a redirection host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The redirection host ID to enable",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_disable_redirection_host",
        description: "Disable a redirection host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The redirection host ID to disable",
            },
          },
          required: ["id"],
        },
      },

      // ==================== Dead Hosts (404) ====================
      {
        name: "npm_list_dead_hosts",
        description: "List all 404 hosts (dead hosts)",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_get_dead_host",
        description: "Get details of a specific 404 host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The dead host ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_create_dead_host",
        description: "Create a new 404 host to show a dead page",
        inputSchema: {
          type: "object",
          properties: {
            domain_names: {
              type: "array",
              items: { type: "string" },
              description: "Domain names for the 404 page",
            },
            ssl_forced: {
              type: "boolean",
              description: "Force HTTPS",
            },
            certificate_id: {
              type: "number",
              description: "SSL certificate ID",
            },
          },
          required: ["domain_names"],
        },
      },
      {
        name: "npm_delete_dead_host",
        description: "Delete a 404 host",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The dead host ID to delete",
            },
          },
          required: ["id"],
        },
      },

      // ==================== Users ====================
      {
        name: "npm_list_users",
        description: "List all NPM users",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_get_user",
        description: "Get details of a specific user",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The user ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_create_user",
        description: "Create a new NPM user",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Full name of the user",
            },
            nickname: {
              type: "string",
              description: "Nickname/display name",
            },
            email: {
              type: "string",
              description: "Email address (used for login)",
            },
            password: {
              type: "string",
              description: "Password for the user",
            },
            roles: {
              type: "array",
              items: { type: "string" },
              description: "User roles (e.g., ['admin'])",
            },
            is_disabled: {
              type: "boolean",
              description: "Whether the user is disabled",
            },
          },
          required: ["name", "nickname", "email", "password", "roles"],
        },
      },
      {
        name: "npm_delete_user",
        description: "Delete a user",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The user ID to delete",
            },
          },
          required: ["id"],
        },
      },

      // ==================== System ====================
      {
        name: "npm_list_audit_log",
        description: "List audit log entries",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_list_settings",
        description: "List all NPM settings",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "npm_get_setting",
        description: "Get a specific setting value",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The setting ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "npm_update_setting",
        description: "Update a setting value",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The setting ID",
            },
            value: {
              type: "string",
              description: "The new value",
            },
          },
          required: ["id", "value"],
        },
      },
      {
        name: "npm_get_hosts_report",
        description: "Get a summary report of all host types",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Define resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "npm://hosts/summary",
        name: "Hosts Summary",
        description: "Summary of all configured hosts in NPM",
        mimeType: "application/json",
      },
      {
        uri: "npm://certificates/summary",
        name: "Certificates Summary",
        description: "Summary of all SSL certificates",
        mimeType: "application/json",
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "npm://hosts/summary") {
    const [proxyHosts, redirectionHosts, streams, deadHosts] = await Promise.all([
      apiClient.listProxyHosts(),
      apiClient.listRedirectionHosts(),
      apiClient.listStreams(),
      apiClient.listDeadHosts(),
    ]);

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              proxy_hosts: proxyHosts.length,
              redirection_hosts: redirectionHosts.length,
              streams: streams.length,
              dead_hosts: deadHosts.length,
              proxy_host_details: proxyHosts.map((h) => ({
                id: h.id,
                domains: h.domain_names,
                forward: `${h.forward_scheme}://${h.forward_host}:${h.forward_port}`,
                enabled: h.enabled,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (uri === "npm://certificates/summary") {
    const certificates = await apiClient.listCertificates();

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              total: certificates.length,
              certificates: certificates.map((c) => ({
                id: c.id,
                name: c.nice_name,
                domains: c.domain_names,
                provider: c.provider,
                expires: c.expires_on,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      // ==================== Proxy Hosts ====================
      case "npm_list_proxy_hosts":
        result = await apiClient.listProxyHosts();
        break;

      case "npm_get_proxy_host":
        result = await apiClient.getProxyHost(args?.id as number);
        break;

      case "npm_create_proxy_host":
        result = await apiClient.createProxyHost(args as unknown as CreateProxyHostRequest);
        break;

      case "npm_update_proxy_host": {
        const { id, ...updateData } = args as { id: number } & Partial<CreateProxyHostRequest>;
        result = await apiClient.updateProxyHost(id, updateData);
        break;
      }

      case "npm_delete_proxy_host":
        await apiClient.deleteProxyHost(args?.id as number);
        result = { success: true, message: "Proxy host deleted" };
        break;

      case "npm_enable_proxy_host":
        result = await apiClient.enableProxyHost(args?.id as number);
        break;

      case "npm_disable_proxy_host":
        result = await apiClient.disableProxyHost(args?.id as number);
        break;

      // ==================== Certificates ====================
      case "npm_list_certificates":
        result = await apiClient.listCertificates();
        break;

      case "npm_get_certificate":
        result = await apiClient.getCertificate(args?.id as number);
        break;

      case "npm_create_certificate": {
        const certArgs = args as {
          domain_names: string[];
          nice_name?: string;
          dns_challenge?: boolean;
          dns_provider?: string;
          dns_provider_credentials?: string;
          letsencrypt_email?: string;
        };
        result = await apiClient.createCertificate({
          provider: "letsencrypt",
          domain_names: certArgs.domain_names,
          nice_name: certArgs.nice_name,
          meta: {
            letsencrypt_agree: true,
            dns_challenge: certArgs.dns_challenge,
            dns_provider: certArgs.dns_provider,
            dns_provider_credentials: certArgs.dns_provider_credentials,
            letsencrypt_email: certArgs.letsencrypt_email,
          },
        });
        break;
      }

      case "npm_delete_certificate":
        await apiClient.deleteCertificate(args?.id as number);
        result = { success: true, message: "Certificate deleted" };
        break;

      case "npm_renew_certificate":
        result = await apiClient.renewCertificate(args?.id as number);
        break;

      // ==================== Streams ====================
      case "npm_list_streams":
        result = await apiClient.listStreams();
        break;

      case "npm_get_stream":
        result = await apiClient.getStream(args?.id as number);
        break;

      case "npm_create_stream":
        result = await apiClient.createStream(args as unknown as CreateStreamRequest);
        break;

      case "npm_update_stream": {
        const { id: streamId, ...streamData } = args as { id: number } & Partial<CreateStreamRequest>;
        result = await apiClient.updateStream(streamId, streamData);
        break;
      }

      case "npm_delete_stream":
        await apiClient.deleteStream(args?.id as number);
        result = { success: true, message: "Stream deleted" };
        break;

      case "npm_enable_stream":
        result = await apiClient.enableStream(args?.id as number);
        break;

      case "npm_disable_stream":
        result = await apiClient.disableStream(args?.id as number);
        break;

      // ==================== Access Lists ====================
      case "npm_list_access_lists":
        result = await apiClient.listAccessLists();
        break;

      case "npm_get_access_list":
        result = await apiClient.getAccessList(args?.id as number);
        break;

      case "npm_create_access_list":
        result = await apiClient.createAccessList(args as unknown as CreateAccessListRequest);
        break;

      case "npm_update_access_list": {
        const { id: aclId, ...aclData } = args as { id: number } & Partial<CreateAccessListRequest>;
        result = await apiClient.updateAccessList(aclId, aclData);
        break;
      }

      case "npm_delete_access_list":
        await apiClient.deleteAccessList(args?.id as number);
        result = { success: true, message: "Access list deleted" };
        break;

      // ==================== Redirection Hosts ====================
      case "npm_list_redirection_hosts":
        result = await apiClient.listRedirectionHosts();
        break;

      case "npm_get_redirection_host":
        result = await apiClient.getRedirectionHost(args?.id as number);
        break;

      case "npm_create_redirection_host":
        result = await apiClient.createRedirectionHost(args as unknown as CreateRedirectionHostRequest);
        break;

      case "npm_update_redirection_host": {
        const { id: redirId, ...redirData } = args as { id: number } & Partial<CreateRedirectionHostRequest>;
        result = await apiClient.updateRedirectionHost(redirId, redirData);
        break;
      }

      case "npm_delete_redirection_host":
        await apiClient.deleteRedirectionHost(args?.id as number);
        result = { success: true, message: "Redirection host deleted" };
        break;

      case "npm_enable_redirection_host":
        result = await apiClient.enableRedirectionHost(args?.id as number);
        break;

      case "npm_disable_redirection_host":
        result = await apiClient.disableRedirectionHost(args?.id as number);
        break;

      // ==================== Dead Hosts ====================
      case "npm_list_dead_hosts":
        result = await apiClient.listDeadHosts();
        break;

      case "npm_get_dead_host":
        result = await apiClient.getDeadHost(args?.id as number);
        break;

      case "npm_create_dead_host":
        result = await apiClient.createDeadHost(args as unknown as CreateDeadHostRequest);
        break;

      case "npm_delete_dead_host":
        await apiClient.deleteDeadHost(args?.id as number);
        result = { success: true, message: "Dead host deleted" };
        break;

      // ==================== Users ====================
      case "npm_list_users":
        result = await apiClient.listUsers();
        break;

      case "npm_get_user":
        result = await apiClient.getUser(args?.id as number);
        break;

      case "npm_create_user": {
        const userArgs = args as {
          name: string;
          nickname: string;
          email: string;
          password: string;
          roles: string[];
          is_disabled?: boolean;
        };
        result = await apiClient.createUser({
          name: userArgs.name,
          nickname: userArgs.nickname,
          email: userArgs.email,
          roles: userArgs.roles,
          is_disabled: userArgs.is_disabled,
          auth: {
            type: "password",
            secret: userArgs.password,
          },
        });
        break;
      }

      case "npm_delete_user":
        await apiClient.deleteUser(args?.id as number);
        result = { success: true, message: "User deleted" };
        break;

      // ==================== System ====================
      case "npm_list_audit_log":
        result = await apiClient.listAuditLog();
        break;

      case "npm_list_settings":
        result = await apiClient.listSettings();
        break;

      case "npm_get_setting":
        result = await apiClient.getSetting(args?.id as string);
        break;

      case "npm_update_setting":
        result = await apiClient.updateSetting(args?.id as string, args?.value as string);
        break;

      case "npm_get_hosts_report":
        result = await apiClient.getHostsReport();
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NPM MCP Server started");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
