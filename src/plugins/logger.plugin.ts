import { Elysia } from "elysia";

interface RequestMetadata {
  requestId: string;
  startedAt: number;
}

const requestMetadata = new WeakMap<Request, RequestMetadata>();

const readRequestHeader = (request: Request, name: string) => {
  const headers = request.headers as Headers & Record<string, unknown>;

  if (typeof headers.get === "function") {
    return headers.get(name);
  }

  const value = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(value) ? String(value[0]) : value ? String(value) : null;
};

const readRequestPath = (request: Request) => {
  try {
    return new URL(request.url, "http://localhost").pathname;
  } catch {
    return request.url;
  }
};

export const loggerPlugin = new Elysia({ name: "request-logger" })
  .onRequest(({ request, set }) => {
    const requestId =
      readRequestHeader(request, "x-request-id") ?? crypto.randomUUID();
    set.headers["x-request-id"] = requestId;
    requestMetadata.set(request, {
      requestId,
      startedAt: performance.now(),
    });
  })
  .onAfterResponse(({ request, set }) => {
    const metadata = requestMetadata.get(request);
    const pathname = readRequestPath(request);
    const requestId = metadata?.requestId ?? "unknown";
    const durationMs = metadata
      ? Math.round(performance.now() - metadata.startedAt)
      : 0;

    console.info(
      `[request] ${requestId} ${request.method} ${pathname} ${set.status ?? 200} ${durationMs}ms`,
    );
    requestMetadata.delete(request);
  })
  .as("global");
