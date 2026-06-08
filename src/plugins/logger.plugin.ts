import { Elysia } from "elysia";

interface RequestMetadata {
  requestId: string;
  startedAt: number;
}

const requestMetadata = new WeakMap<Request, RequestMetadata>();

export const loggerPlugin = new Elysia({ name: "request-logger" })
  .onRequest(({ request, set }) => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    set.headers["x-request-id"] = requestId;
    requestMetadata.set(request, {
      requestId,
      startedAt: performance.now(),
    });
  })
  .onAfterResponse(({ request, set }) => {
      const metadata = requestMetadata.get(request);
      const url = new URL(request.url);
      const requestId = metadata?.requestId ?? "unknown";
      const durationMs = metadata
        ? Math.round(performance.now() - metadata.startedAt)
        : 0;

      console.info(
        `[request] ${requestId} ${request.method} ${url.pathname} ${set.status ?? 200} ${durationMs}ms`,
      );
      requestMetadata.delete(request);
    })
  .as("global");
