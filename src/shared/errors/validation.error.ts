import { AppError } from "./app.error";

export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: unknown,
    code = "VALIDATION_ERROR",
  ) {
    super(message, { code, details, statusCode: 422 });
  }
}
