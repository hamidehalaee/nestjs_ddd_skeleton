import { LoggerService } from '../../infra/log/log.service';

function maskSensitive(_key: string, value: any): any {
  const key = String(_key).toLowerCase();
  if (/password|token|secret|key|creditcard|ssn/.test(key)) {
    return '***';
  }
  return value;
}

export function Log(message?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger: LoggerService = (this as any).logger;
      if (!logger) {
        return originalMethod.apply(this, args);
      }

      const start = Date.now();
      const context = target.constructor.name;
      const entryMessage = message ?? `${propertyKey} called`;

      const req = (this as any).req || args.find((a: any) => a?.headers);
      const requestId = req?.requestId || req?.id || 'N/A';
      const ip = req?.ip || req?.socket?.remoteAddress || 'unknown';
      const userAgent = req?.headers?.['user-agent'] || 'unknown';

      const safeArgs = args.map((arg) =>
        JSON.parse(JSON.stringify(arg, maskSensitive)),
      );

      logger.infoLog(entryMessage, {
        context,
        args: safeArgs,
        requestId,
        ip,
        userAgent,
      });

      try {
        const result = await originalMethod.apply(this, args);
        const durationMs = Date.now() - start;

        logger.infoLog(`${propertyKey} succeeded`, {
          context,
          result,
          durationMs,
          requestId,
        });

        return result;
      } catch (err: any) {
        const durationMs = Date.now() - start;

        logger.errorLog(`${propertyKey} failed`, {
          context,
          args: safeArgs,
          error: err,
          durationMs,
          requestId,
        });

        throw err;
      }
    };

    return descriptor;
  };
}