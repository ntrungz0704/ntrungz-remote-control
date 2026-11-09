import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AuditService } from './services/audit.service';
import { DeviceService } from './services/device.service';
import { PairingService } from './services/pairing.service';
import { SessionService } from './services/session.service';
import { PresenceService } from './services/presence.service';
import { SignalingHub } from './signaling/signaling.hub';
import { deviceRoutes } from './routes/device.routes';
import { pairingRoutes } from './routes/pairing.routes';
import { sessionRoutes } from './routes/session.routes';
import { presenceRoutes } from './routes/presence.routes';
import { AppError } from '../../../packages/shared/src/errors';

export type AppContext = FastifyInstance & {
  app: FastifyInstance;
  deviceService: DeviceService;
  pairingService: PairingService;
  sessionService: SessionService;
  presenceService: PresenceService;
  signalingHub: SignalingHub;
  auditService: AuditService;
};

export function buildApp(): AppContext {
  const app = Fastify({
    logger: false
  });

  app.register(cors, {
    origin: true
  });

  const auditService = new AuditService();
  const deviceService = new DeviceService(auditService);
  const pairingService = new PairingService(deviceService, auditService);
  const sessionService = new SessionService(deviceService, auditService);
  const presenceService = new PresenceService(deviceService, sessionService, auditService);
  const signalingHub = new SignalingHub(deviceService, sessionService);

  // Error Handler
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

    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    const message = (error as { message?: string }).message || 'An unexpected error occurred';
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message
      }
    });
  });

  // Healthcheck endpoint
  app.get('/api/v1/health', async () => {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'ntrungz-remote-control-api',
      version: '2.0.0-phase2'
    };
  });

  // Register routes
  deviceRoutes(app, deviceService);
  pairingRoutes(app, pairingService);
  sessionRoutes(app, sessionService);
  presenceRoutes(app, presenceService);

  return Object.assign(app, {
    app,
    deviceService,
    pairingService,
    sessionService,
    presenceService,
    signalingHub,
    auditService
  });
}
