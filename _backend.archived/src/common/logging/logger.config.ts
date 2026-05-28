import { randomUUID } from 'crypto';
import type { Params } from 'nestjs-pino';

const isProd = process.env.NODE_ENV === 'production';

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
    autoLogging: true,
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && incoming.length > 0 && incoming.length < 200
          ? incoming
          : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.passwordHash',
      ],
      remove: true,
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    transport: isProd
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname,req,res,responseTime,context',
            messageFormat: '{context} - {msg}',
          },
        },
  },
};
