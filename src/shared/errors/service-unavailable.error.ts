import { AppError } from "./app.error";

export class ServiceUnavailableError extends AppError {
  constructor(
    message = "Service unavailable",
    code = "SERVICE_UNAVAILABLE",
    details?: unknown,
  ) {
    super(message, { code, details, statusCode: 503 });
  }
}
