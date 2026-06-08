export const corsMethods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
] as const;

export const corsHeaders = [
  "Accept",
  "Authorization",
  "Content-Type",
  "X-Request-ID",
] as const;
