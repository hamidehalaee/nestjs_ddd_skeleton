import { LoggerService } from "@nestjs/common/services/logger.service";

function maskSensitive(key: string, value: any): any {
  if (typeof key === 'string' && /(password|token|secret|key)/i.test(key)) return '***';
  return value;
}

export function Log(message?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger: LoggerService = (this as any).logger;
      if (!logger) return originalMethod.apply(this, args);

      const start = Date.now();
      const ctx = target.constructor.name;
      const entryMsg = message ?? `${propertyKey} called`;

      // Extract request context if available (from Express/Fastify)
      const req = (this as any).req || args.find(a => a?.headers);
      const requestId = req?.requestId || req?.id || 'N/A';
      const ip = req?.ip || req?.socket?.remoteAddress || 'unknown';
      const userAgent = req?.headers?.['user-agent'] || 'unknown';

      // Mask sensitive data in args
      const safeArgs = args.map(arg =>
        JSON.parse(JSON.stringify(arg, maskSensitive))
      );

      logger.log(entryMsg, {
        context: ctx,
        args: safeArgs,
        requestId,
        ip,
        userAgent,
      });

      try {
        const result = await originalMethod.apply(this, args);
        const durationMs = Date.now() - start;

        logger.log(`${propertyKey} succeeded`, {
          context: ctx,
          result,
          durationMs,
          requestId,
        });

        return result;
      } catch (err) {
        const durationMs = Date.now() - start;
        const errorMsg = err instanceof Error ? err.message : String(err);

        logger.error(`${propertyKey} failed`, {
          context: ctx,
          args: safeArgs,
          error: errorMsg,
          stack: err instanceof Error ? err.stack : undefined,
          durationMs,
          requestId,
        });

        throw err;
      }
    };

    return descriptor;
  };
}