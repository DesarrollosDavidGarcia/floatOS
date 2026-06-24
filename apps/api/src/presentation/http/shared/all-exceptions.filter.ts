import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Filtro global de excepciones. Normaliza la respuesta de error y, sobre todo,
 * evita filtrar detalles internos de Prisma (meta, stack, mensajes con SQL/IDs)
 * al cliente. El error real se loguea server-side para diagnóstico.
 *
 * Cuerpo de respuesta consistente: { statusCode, message, timestamp, path }.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message } = this.resolve(exception);

    // Log interno con el error real (incluye stack) — NO se envía al cliente.
    const logContext = `${request?.method ?? ''} ${request?.url ?? ''}`.trim();
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        logContext || 'unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${logContext} -> ${statusCode}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request?.url ?? '',
    });
  }

  private resolve(exception: unknown): { statusCode: number; message: string } {
    // 1) HttpException de Nest: respetar status y respuesta tal cual.
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] })?.message ??
            exception.message);
      return { statusCode, message: this.flatten(message) };
    }

    // 2) Errores conocidos de Prisma: mapear a HTTP genérico sin exponer meta/stack.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaKnown(exception);
    }

    // 3) Error de validación de Prisma: 400 genérico.
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Solicitud inválida',
      };
    }

    // 4) Cualquier otra excepción: 500 genérico, sin mensaje original ni stack.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
    };
  }

  private fromPrismaKnown(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { statusCode: number; message: string } {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Ya existe un registro con esos datos',
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Recurso no encontrado',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Operación no permitida por dependencias relacionadas',
        };
      default:
        // Resto de errores P200x (u otros conocidos): solicitud inválida.
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Solicitud inválida',
        };
    }
  }

  private flatten(message: string | string[]): string {
    return Array.isArray(message) ? message.join(', ') : message;
  }
}
