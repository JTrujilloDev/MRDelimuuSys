import type { FactusInvoicePayload } from "./factus.mapper";

export type FactusCredentials = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
};

export type FactusClientConfiguration = {
  environment: "SANDBOX" | "PRODUCTION";
  credentials: FactusCredentials;
  requestTimeoutMs?: number;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type JsonRecord = Record<string, unknown>;

export class FactusApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly response: unknown,
  ) {
    super(message);
    this.name = "FactusApiError";
  }
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const responseMessage = (payload: unknown) => {
  if (!isRecord(payload)) return "Factus request failed";
  return typeof payload.message === "string" ? payload.message : "Factus request failed";
};

export class FactusClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private tokens: { accessToken: string; refreshToken?: string; expiresAt: number } | null = null;

  constructor(
    private readonly configuration: FactusClientConfiguration,
    private readonly fetchFn: FetchLike = fetch,
    private readonly now: () => number = Date.now,
  ) {
    this.baseUrl = configuration.environment === "PRODUCTION"
      ? "https://api.factus.com.co"
      : "https://api-sandbox.factus.com.co";
    this.timeoutMs = configuration.requestTimeoutMs ?? 20_000;
  }

  async verifyAuthentication() {
    await this.getAccessToken();
  }

  async validateBill(payload: FactusInvoicePayload) {
    return this.request("/v2/bills/validate", { method: "POST", body: JSON.stringify(payload) });
  }

  async findBillByReference(referenceCode: string) {
    const query = new URLSearchParams({ "filter[reference_code]": referenceCode, "filter[per_page]": "1" });
    const response = await this.request(`/v2/bills?${query.toString()}`);
    if (!isRecord(response)) return null;
    const paginated = response.data;
    if (Array.isArray(paginated)) return paginated[0] ?? null;
    if (isRecord(paginated) && Array.isArray(paginated.data)) return paginated.data[0] ?? null;
    return null;
  }

  async listNumberingRanges(documentType = "21", apiVersion: "v1" | "v2" = "v2") {
    const query = new URLSearchParams({
      "filter[document]": documentType,
      "filter[is_active]": "1",
    });
    return this.request(`/${apiVersion}/numbering-ranges?${query.toString()}`);
  }

  async downloadBillArtifact(documentNumber: string, artifact: "PDF" | "XML" | "ATTACHED_DOCUMENT_XML") {
    const suffix = artifact === "PDF"
      ? "download-pdf"
      : artifact === "XML" ? "download-xml" : "download-attached-document-xml";
    return this.request(`/v2/bills/${encodeURIComponent(documentNumber)}/${suffix}`);
  }

  private async request(path: string, init: RequestInit = {}, hasRetriedAuthentication = false): Promise<unknown> {
    const accessToken = await this.getAccessToken();
    const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });

    if (response.status === 401 && !hasRetriedAuthentication) {
      this.tokens = null;
      return this.request(path, init, true);
    }

    const payload = await this.readJson(response);
    if (!response.ok) throw new FactusApiError(responseMessage(payload), response.status, payload);
    return payload;
  }

  private async getAccessToken() {
    if (this.tokens && this.tokens.expiresAt - 60_000 > this.now()) return this.tokens.accessToken;
    if (this.tokens?.refreshToken) {
      try {
        return await this.requestToken({
          grant_type: "refresh_token",
          client_id: this.configuration.credentials.clientId,
          client_secret: this.configuration.credentials.clientSecret,
          refresh_token: this.tokens.refreshToken,
        });
      } catch {
        this.tokens = null;
      }
    }
    return this.requestToken({
      grant_type: "password",
      client_id: this.configuration.credentials.clientId,
      client_secret: this.configuration.credentials.clientSecret,
      username: this.configuration.credentials.username,
      password: this.configuration.credentials.password,
    });
  }

  private async requestToken(values: Record<string, string>) {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(values).toString(),
    });
    const payload = await this.readJson(response);
    if (!response.ok || !isRecord(payload) || typeof payload.access_token !== "string") {
      throw new FactusApiError(responseMessage(payload), response.status, payload);
    }

    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 600;
    this.tokens = {
      accessToken: payload.access_token,
      ...(typeof payload.refresh_token === "string" ? { refreshToken: payload.refresh_token } : {}),
      expiresAt: this.now() + Math.max(1, expiresIn) * 1000,
    };
    return this.tokens.accessToken;
  }

  private async fetchWithTimeout(input: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchFn(input, { ...init, signal: controller.signal });
    } catch (error) {
      throw new FactusApiError(error instanceof Error ? error.message : "Factus network request failed", null, null);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}
