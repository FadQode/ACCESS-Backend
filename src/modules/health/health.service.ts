export const getHealthStatus = (name: string, version: string) => ({
  service: name,
  status: "ok" as const,
  timestamp: new Date().toISOString(),
  version,
});
