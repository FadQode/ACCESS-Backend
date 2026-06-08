import { AppError } from "../shared/errors/app.error";
import { errorResponse } from "../shared/http/response";

const statusByCode: Record<string, number> = {
  NOT_FOUND: 404,
  PARSE: 400,
  VALIDATION: 422,
};

export const mapError = (code: string, error: unknown) => {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: errorResponse(error.message, error.code, error.details),
    };
  }

  if (code === "VALIDATION") {
    return {
      status: statusByCode[code],
      body: errorResponse("Request validation failed", "VALIDATION_ERROR"),
    };
  }

  if (code === "NOT_FOUND") {
    return {
      status: statusByCode[code],
      body: errorResponse("Route not found", "ROUTE_NOT_FOUND"),
    };
  }

  console.error("[error] Unhandled request error", error);
  return {
    status: statusByCode[code] ?? 500,
    body: errorResponse("Internal server error", "INTERNAL_SERVER_ERROR"),
  };
};
