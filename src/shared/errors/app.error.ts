export interface AppErrorOptions {
  code: string;
  details?: unknown;
  statusCode: number;
}

export class AppError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly statusCode: number;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.code = options.code;
    this.details = options.details;
    this.statusCode = options.statusCode;
  }
}
