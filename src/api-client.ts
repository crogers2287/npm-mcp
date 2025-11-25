/**
 * Nginx Proxy Manager API Client
 * Handles authentication and API requests
 */

export interface NPMConfig {
  host: string;
  port: number;
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
  expires: string;
}

export interface ProxyHost {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  domain_names: string[];
  forward_host: string;
  forward_port: number;
  forward_scheme: "http" | "https";
  ssl_forced: boolean;
  hsts_enabled: boolean;
  hsts_subdomains: boolean;
  http2_support: boolean;
  block_exploits: boolean;
  caching_enabled: boolean;
  allow_websocket_upgrade: boolean;
  access_list_id: number;
  certificate_id: number;
  advanced_config: string;
  enabled: boolean;
  meta: Record<string, unknown>;
  locations: ProxyLocation[];
}

export interface ProxyLocation {
  path: string;
  forward_host: string;
  forward_port: number;
  forward_scheme: "http" | "https";
}

export interface CreateProxyHostRequest {
  domain_names: string[];
  forward_host: string;
  forward_port: number;
  forward_scheme?: "http" | "https";
  ssl_forced?: boolean;
  hsts_enabled?: boolean;
  hsts_subdomains?: boolean;
  http2_support?: boolean;
  block_exploits?: boolean;
  caching_enabled?: boolean;
  allow_websocket_upgrade?: boolean;
  access_list_id?: number;
  certificate_id?: number;
  advanced_config?: string;
  enabled?: boolean;
  meta?: Record<string, unknown>;
  locations?: ProxyLocation[];
}

export interface Certificate {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  provider: string;
  nice_name: string;
  domain_names: string[];
  expires_on: string;
  meta: Record<string, unknown>;
}

export interface CreateCertificateRequest {
  provider: "letsencrypt" | "other";
  nice_name?: string;
  domain_names: string[];
  meta?: {
    letsencrypt_agree?: boolean;
    dns_challenge?: boolean;
    dns_provider?: string;
    dns_provider_credentials?: string;
    letsencrypt_email?: string;
  };
}

export interface Stream {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  incoming_port: number;
  forwarding_host: string;
  forwarding_port: number;
  tcp_forwarding: boolean;
  udp_forwarding: boolean;
  enabled: boolean;
  meta: Record<string, unknown>;
}

export interface CreateStreamRequest {
  incoming_port: number;
  forwarding_host: string;
  forwarding_port: number;
  tcp_forwarding?: boolean;
  udp_forwarding?: boolean;
  meta?: Record<string, unknown>;
}

export interface AccessList {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  name: string;
  satisfy_any: boolean;
  pass_auth: boolean;
  items: AccessListItem[];
  clients: AccessListClient[];
  meta: Record<string, unknown>;
}

export interface AccessListItem {
  username: string;
  password: string;
}

export interface AccessListClient {
  address: string;
  directive: "allow" | "deny";
}

export interface CreateAccessListRequest {
  name: string;
  satisfy_any?: boolean;
  pass_auth?: boolean;
  items?: AccessListItem[];
  clients?: AccessListClient[];
  meta?: Record<string, unknown>;
}

export interface User {
  id: number;
  created_on: string;
  modified_on: string;
  is_disabled: boolean;
  email: string;
  name: string;
  nickname: string;
  avatar: string;
  roles: string[];
}

export interface CreateUserRequest {
  name: string;
  nickname: string;
  email: string;
  roles: string[];
  is_disabled?: boolean;
  auth?: {
    type: "password";
    secret: string;
  };
}

export interface RedirectionHost {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  domain_names: string[];
  forward_scheme: "http" | "https" | "$scheme";
  forward_domain_name: string;
  forward_http_code: number;
  preserve_path: boolean;
  block_exploits: boolean;
  certificate_id: number;
  ssl_forced: boolean;
  hsts_enabled: boolean;
  hsts_subdomains: boolean;
  http2_support: boolean;
  enabled: boolean;
  meta: Record<string, unknown>;
}

export interface CreateRedirectionHostRequest {
  domain_names: string[];
  forward_scheme: "http" | "https" | "$scheme";
  forward_domain_name: string;
  forward_http_code?: number;
  preserve_path?: boolean;
  block_exploits?: boolean;
  certificate_id?: number;
  ssl_forced?: boolean;
  hsts_enabled?: boolean;
  hsts_subdomains?: boolean;
  http2_support?: boolean;
  enabled?: boolean;
  meta?: Record<string, unknown>;
}

export interface DeadHost {
  id: number;
  created_on: string;
  modified_on: string;
  owner_user_id: number;
  domain_names: string[];
  certificate_id: number;
  ssl_forced: boolean;
  hsts_enabled: boolean;
  hsts_subdomains: boolean;
  http2_support: boolean;
  enabled: boolean;
  meta: Record<string, unknown>;
}

export interface CreateDeadHostRequest {
  domain_names: string[];
  certificate_id?: number;
  ssl_forced?: boolean;
  hsts_enabled?: boolean;
  hsts_subdomains?: boolean;
  http2_support?: boolean;
  enabled?: boolean;
  meta?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: number;
  created_on: string;
  modified_on: string;
  user_id: number;
  object_type: string;
  object_id: number;
  action: string;
  meta: Record<string, unknown>;
}

export interface Setting {
  id: string;
  name: string;
  description: string;
  value: string;
  meta: Record<string, unknown>;
}

export class NPMApiClient {
  private config: NPMConfig;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: NPMConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}/api`;
  }

  private async ensureAuthenticated(): Promise<void> {
    // Check if token is still valid (with 5 minute buffer)
    if (this.token && this.tokenExpiry) {
      const now = new Date();
      const buffer = 5 * 60 * 1000; // 5 minutes
      if (this.tokenExpiry.getTime() - buffer > now.getTime()) {
        return;
      }
    }

    // Get new token
    const response = await fetch(`${this.baseUrl}/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identity: this.config.email,
        secret: this.config.password,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authentication failed: ${error}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.token = data.token;
    this.tokenExpiry = new Date(data.expires);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    await this.ensureAuthenticated();

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed (${response.status}): ${error}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  // ==================== Proxy Hosts ====================

  async listProxyHosts(): Promise<ProxyHost[]> {
    return this.request<ProxyHost[]>("GET", "/nginx/proxy-hosts");
  }

  async getProxyHost(id: number): Promise<ProxyHost> {
    return this.request<ProxyHost>("GET", `/nginx/proxy-hosts/${id}`);
  }

  async createProxyHost(data: CreateProxyHostRequest): Promise<ProxyHost> {
    const payload = {
      domain_names: data.domain_names,
      forward_host: data.forward_host,
      forward_port: data.forward_port,
      forward_scheme: data.forward_scheme ?? "http",
      ssl_forced: data.ssl_forced ?? false,
      hsts_enabled: data.hsts_enabled ?? false,
      hsts_subdomains: data.hsts_subdomains ?? false,
      http2_support: data.http2_support ?? false,
      block_exploits: data.block_exploits ?? false,
      caching_enabled: data.caching_enabled ?? false,
      allow_websocket_upgrade: data.allow_websocket_upgrade ?? false,
      access_list_id: data.access_list_id ?? 0,
      certificate_id: data.certificate_id ?? 0,
      advanced_config: data.advanced_config ?? "",
      enabled: data.enabled ?? true,
      meta: data.meta ?? { letsencrypt_agree: false, dns_challenge: false },
      locations: data.locations ?? [],
    };
    return this.request<ProxyHost>("POST", "/nginx/proxy-hosts", payload);
  }

  async updateProxyHost(
    id: number,
    data: Partial<CreateProxyHostRequest>
  ): Promise<ProxyHost> {
    return this.request<ProxyHost>("PUT", `/nginx/proxy-hosts/${id}`, data);
  }

  async deleteProxyHost(id: number): Promise<void> {
    await this.request<void>("DELETE", `/nginx/proxy-hosts/${id}`);
  }

  async enableProxyHost(id: number): Promise<ProxyHost> {
    return this.request<ProxyHost>("POST", `/nginx/proxy-hosts/${id}/enable`);
  }

  async disableProxyHost(id: number): Promise<ProxyHost> {
    return this.request<ProxyHost>("POST", `/nginx/proxy-hosts/${id}/disable`);
  }

  // ==================== Certificates ====================

  async listCertificates(): Promise<Certificate[]> {
    return this.request<Certificate[]>("GET", "/nginx/certificates");
  }

  async getCertificate(id: number): Promise<Certificate> {
    return this.request<Certificate>("GET", `/nginx/certificates/${id}`);
  }

  async createCertificate(
    data: CreateCertificateRequest
  ): Promise<Certificate> {
    const payload = {
      provider: data.provider,
      nice_name: data.nice_name ?? data.domain_names[0],
      domain_names: data.domain_names,
      meta: {
        letsencrypt_agree: data.meta?.letsencrypt_agree ?? true,
        dns_challenge: data.meta?.dns_challenge ?? false,
        ...data.meta,
      },
    };
    return this.request<Certificate>("POST", "/nginx/certificates", payload);
  }

  async deleteCertificate(id: number): Promise<void> {
    await this.request<void>("DELETE", `/nginx/certificates/${id}`);
  }

  async renewCertificate(id: number): Promise<Certificate> {
    return this.request<Certificate>(
      "POST",
      `/nginx/certificates/${id}/renew`
    );
  }

  // ==================== Streams ====================

  async listStreams(): Promise<Stream[]> {
    return this.request<Stream[]>("GET", "/nginx/streams");
  }

  async getStream(id: number): Promise<Stream> {
    return this.request<Stream>("GET", `/nginx/streams/${id}`);
  }

  async createStream(data: CreateStreamRequest): Promise<Stream> {
    const payload = {
      incoming_port: data.incoming_port,
      forwarding_host: data.forwarding_host,
      forwarding_port: data.forwarding_port,
      tcp_forwarding: data.tcp_forwarding ?? true,
      udp_forwarding: data.udp_forwarding ?? false,
      meta: data.meta ?? {},
    };
    return this.request<Stream>("POST", "/nginx/streams", payload);
  }

  async updateStream(
    id: number,
    data: Partial<CreateStreamRequest>
  ): Promise<Stream> {
    return this.request<Stream>("PUT", `/nginx/streams/${id}`, data);
  }

  async deleteStream(id: number): Promise<void> {
    await this.request<void>("DELETE", `/nginx/streams/${id}`);
  }

  async enableStream(id: number): Promise<Stream> {
    return this.request<Stream>("POST", `/nginx/streams/${id}/enable`);
  }

  async disableStream(id: number): Promise<Stream> {
    return this.request<Stream>("POST", `/nginx/streams/${id}/disable`);
  }

  // ==================== Access Lists ====================

  async listAccessLists(): Promise<AccessList[]> {
    return this.request<AccessList[]>("GET", "/nginx/access-lists");
  }

  async getAccessList(id: number): Promise<AccessList> {
    return this.request<AccessList>("GET", `/nginx/access-lists/${id}`);
  }

  async createAccessList(data: CreateAccessListRequest): Promise<AccessList> {
    const payload = {
      name: data.name,
      satisfy_any: data.satisfy_any ?? false,
      pass_auth: data.pass_auth ?? false,
      items: data.items ?? [],
      clients: data.clients ?? [],
      meta: data.meta ?? {},
    };
    return this.request<AccessList>("POST", "/nginx/access-lists", payload);
  }

  async updateAccessList(
    id: number,
    data: Partial<CreateAccessListRequest>
  ): Promise<AccessList> {
    return this.request<AccessList>("PUT", `/nginx/access-lists/${id}`, data);
  }

  async deleteAccessList(id: number): Promise<void> {
    await this.request<void>("DELETE", `/nginx/access-lists/${id}`);
  }

  // ==================== Redirection Hosts ====================

  async listRedirectionHosts(): Promise<RedirectionHost[]> {
    return this.request<RedirectionHost[]>("GET", "/nginx/redirection-hosts");
  }

  async getRedirectionHost(id: number): Promise<RedirectionHost> {
    return this.request<RedirectionHost>(
      "GET",
      `/nginx/redirection-hosts/${id}`
    );
  }

  async createRedirectionHost(
    data: CreateRedirectionHostRequest
  ): Promise<RedirectionHost> {
    const payload = {
      domain_names: data.domain_names,
      forward_scheme: data.forward_scheme,
      forward_domain_name: data.forward_domain_name,
      forward_http_code: data.forward_http_code ?? 301,
      preserve_path: data.preserve_path ?? true,
      block_exploits: data.block_exploits ?? false,
      certificate_id: data.certificate_id ?? 0,
      ssl_forced: data.ssl_forced ?? false,
      hsts_enabled: data.hsts_enabled ?? false,
      hsts_subdomains: data.hsts_subdomains ?? false,
      http2_support: data.http2_support ?? false,
      enabled: data.enabled ?? true,
      meta: data.meta ?? {},
    };
    return this.request<RedirectionHost>(
      "POST",
      "/nginx/redirection-hosts",
      payload
    );
  }

  async updateRedirectionHost(
    id: number,
    data: Partial<CreateRedirectionHostRequest>
  ): Promise<RedirectionHost> {
    return this.request<RedirectionHost>(
      "PUT",
      `/nginx/redirection-hosts/${id}`,
      data
    );
  }

  async deleteRedirectionHost(id: number): Promise<void> {
    await this.request<void>("DELETE", `/nginx/redirection-hosts/${id}`);
  }

  async enableRedirectionHost(id: number): Promise<RedirectionHost> {
    return this.request<RedirectionHost>(
      "POST",
      `/nginx/redirection-hosts/${id}/enable`
    );
  }

  async disableRedirectionHost(id: number): Promise<RedirectionHost> {
    return this.request<RedirectionHost>(
      "POST",
      `/nginx/redirection-hosts/${id}/disable`
    );
  }

  // ==================== Dead Hosts (404 Hosts) ====================

  async listDeadHosts(): Promise<DeadHost[]> {
    return this.request<DeadHost[]>("GET", "/nginx/dead-hosts");
  }

  async getDeadHost(id: number): Promise<DeadHost> {
    return this.request<DeadHost>("GET", `/nginx/dead-hosts/${id}`);
  }

  async createDeadHost(data: CreateDeadHostRequest): Promise<DeadHost> {
    const payload = {
      domain_names: data.domain_names,
      certificate_id: data.certificate_id ?? 0,
      ssl_forced: data.ssl_forced ?? false,
      hsts_enabled: data.hsts_enabled ?? false,
      hsts_subdomains: data.hsts_subdomains ?? false,
      http2_support: data.http2_support ?? false,
      enabled: data.enabled ?? true,
      meta: data.meta ?? {},
    };
    return this.request<DeadHost>("POST", "/nginx/dead-hosts", payload);
  }

  async updateDeadHost(
    id: number,
    data: Partial<CreateDeadHostRequest>
  ): Promise<DeadHost> {
    return this.request<DeadHost>("PUT", `/nginx/dead-hosts/${id}`, data);
  }

  async deleteDeadHost(id: number): Promise<void> {
    await this.request<void>("DELETE", `/nginx/dead-hosts/${id}`);
  }

  async enableDeadHost(id: number): Promise<DeadHost> {
    return this.request<DeadHost>("POST", `/nginx/dead-hosts/${id}/enable`);
  }

  async disableDeadHost(id: number): Promise<DeadHost> {
    return this.request<DeadHost>("POST", `/nginx/dead-hosts/${id}/disable`);
  }

  // ==================== Users ====================

  async listUsers(): Promise<User[]> {
    return this.request<User[]>("GET", "/users");
  }

  async getUser(id: number): Promise<User> {
    return this.request<User>("GET", `/users/${id}`);
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    return this.request<User>("POST", "/users", data);
  }

  async updateUser(id: number, data: Partial<CreateUserRequest>): Promise<User> {
    return this.request<User>("PUT", `/users/${id}`, data);
  }

  async deleteUser(id: number): Promise<void> {
    await this.request<void>("DELETE", `/users/${id}`);
  }

  // ==================== Audit Log ====================

  async listAuditLog(): Promise<AuditLogEntry[]> {
    return this.request<AuditLogEntry[]>("GET", "/audit-log");
  }

  // ==================== Settings ====================

  async listSettings(): Promise<Setting[]> {
    return this.request<Setting[]>("GET", "/settings");
  }

  async getSetting(id: string): Promise<Setting> {
    return this.request<Setting>("GET", `/settings/${id}`);
  }

  async updateSetting(id: string, value: string): Promise<Setting> {
    return this.request<Setting>("PUT", `/settings/${id}`, { value });
  }

  // ==================== Reports ====================

  async getHostsReport(): Promise<{ proxy: number; redirection: number; stream: number; dead: number }> {
    return this.request<{ proxy: number; redirection: number; stream: number; dead: number }>(
      "GET",
      "/reports/hosts"
    );
  }
}
