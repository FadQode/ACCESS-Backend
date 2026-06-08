import { AppError } from "./app.error";

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT", details?: unknown) {
    super(message, { code, details, statusCode: 409 });
  }
}
