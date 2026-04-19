import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-codes";

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  errorCode?: ErrorCode;
  details?: Record<string, unknown>;
}

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly errorCode?: ErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ message, error: errorCode, details }, status);
  }

  static badRequest(message: string, errorCode?: ErrorCode, details?: Record<string, unknown>) {
    return new AppException(message, HttpStatus.BAD_REQUEST, errorCode, details);
  }

  static unauthorized(message: string, errorCode?: ErrorCode) {
    return new AppException(message, HttpStatus.UNAUTHORIZED, errorCode);
  }

  static forbidden(message: string, errorCode?: ErrorCode) {
    return new AppException(message, HttpStatus.FORBIDDEN, errorCode);
  }

  static notFound(message: string, errorCode?: ErrorCode) {
    return new AppException(message, HttpStatus.NOT_FOUND, errorCode);
  }

  static conflict(message: string, errorCode?: ErrorCode, details?: Record<string, unknown>) {
    return new AppException(message, HttpStatus.CONFLICT, errorCode, details);
  }
}
