// Minimal fetch-based HTTP transport with timeout + retry/backoff, shared by the
// generic Career Intelligence client and the Rubric Compiler client.

export interface HttpTransportOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** Number of additional attempts on network / 5xx errors. */
  retries?: number;
  /** Injectable fetch (defaults to global fetch). */
  fetch?: typeof fetch;
}

export class CareerIntelligenceHttpError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`Career Intelligence request failed with status ${status}`);
    this.name = "CareerIntelligenceHttpError";
    this.status = status;
    this.body = body;
  }
}

export class HttpTransport {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.retries = options.retries ?? 2;
    const f = options.fetch ?? globalThis.fetch;
    if (!f) {
      throw new Error("No fetch implementation available; pass options.fetch.");
    }
    this.fetchImpl = f;
  }

  async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    requestId?: string,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.apiKey) headers["authorization"] = `Bearer ${this.apiKey}`;
    if (requestId) headers["x-request-id"] = requestId;

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
        if (response.status >= 500) {
          throw new CareerIntelligenceHttpError(response.status, await safeText(response));
        }
        if (!response.ok) {
          // 4xx are not retried — they won't get better.
          throw new CareerIntelligenceHttpError(response.status, await safeText(response));
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        const retryable =
          !(error instanceof CareerIntelligenceHttpError) || error.status >= 500;
        if (!retryable || attempt === this.retries) break;
        await delay(2 ** attempt * 100);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
