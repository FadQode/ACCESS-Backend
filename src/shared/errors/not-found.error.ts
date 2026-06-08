import { AppError } from "./app.error";

export class NotFoundError extends AppError {
  constructor(message: string, code = "NOT_FOUND") {
    super(message, { code, statusCode: 404 });
  }
}
