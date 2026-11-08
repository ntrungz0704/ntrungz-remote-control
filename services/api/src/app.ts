import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AuditService } from './services/audit.service';
import { DeviceService } from './services/device.service';
import { PairingService } from './services/pairing.service';
import { deviceRoutes } from './routes/device.routes';
import { pairingRoutes } from './routes/pairing.routes';
import { AppError } from '../../../packages/shared/src/errors';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false
  });

  app.register(cors, {
    origin: true
  });

  const auditService = new AuditService();
  const deviceService = new DeviceService(auditService);
  const pairingService = new PairingService(deviceService, auditService);

  // Consistent Error Handler
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message
        }
      });
    }

    return reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred'
      }
    });
  });

  // Healthcheck endpoint
  app.get('/api/v1/health', async () => {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'ntrungz-remote-control-api',
      version: '1.0.0'
    };
  });

  // Register routes
  deviceRoutes(app, deviceService);
  pairingRoutes(app, pairingService);

  return app;
}
