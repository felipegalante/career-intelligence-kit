// Node HTTP wrapper around the mock handler.

import { createServer } from "node:http";

import { createMockHandler, type MockHandlerOptions } from "./handler";

export interface MockServerInstance {
  url: string;
  port: number;
  close(): Promise<void>;
}

export interface StartMockServerOptions extends MockHandlerOptions {
  /** Port to bind; 0 (default) picks a free port. */
  port?: number;
}

export async function startMockServer(
  options: StartMockServerOptions = {},
): Promise<MockServerInstance> {
  const { handle } = createMockHandler(options);

  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      void (async () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body: unknown;
        try {
          body = raw ? JSON.parse(raw) : undefined;
        } catch {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_json" }));
          return;
        }
        const result = await handle(req.method ?? "GET", req.url ?? "/", body);
        res.writeHead(result.status, { "content-type": "application/json" });
        res.end(JSON.stringify(result.json));
      })();
    });
  });

  await new Promise<void>((resolve) => server.listen(options.port ?? 0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : (options.port ?? 0);

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
