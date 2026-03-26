export class AppError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(code: string, status: number, message?: string, details?: any) {
    super(message || code);
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function badRequest(code: string, details?: any): AppError {
  return new AppError(code, 400, code, details);
}

export function unauthorized(code: string): AppError {
  return new AppError(code, 401, code);
}

export function forbidden(code: string): AppError {
  return new AppError(code, 403, code);
}

export function notFound(code: string): AppError {
  return new AppError(code, 404, code);
}
