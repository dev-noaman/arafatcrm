import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const normalized =
        typeof body === "string"
          ? { statusCode: status, message: body, error: exception.name }
          : {
              statusCode: status,
              message: (body as any).message ?? exception.message,
              error: (body as any).error ?? exception.name,
              details: (body as any).details,
            };
      return res.status(status).json(normalized);
    }

    this.logger.error(
      `Unhandled error on ${req.method} ${req.url}`,
      (exception as Error)?.stack,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: "Internal server error",
      error: "InternalServerError",
    });
  }
}
