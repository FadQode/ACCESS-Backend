import { AppError } from "./app.error";

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code = "BAD_REQUEST", details?: unknown) {
    super(message, { code, details, statusCode: 400 });
  }
}
