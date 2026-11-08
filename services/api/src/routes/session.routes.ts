import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SessionService } from '../services/session.service';
import { TurnUtil } from '../utils/turn';

export function sessionRoutes(app: FastifyInstance, sessionService: SessionService) {
  // POST /api/v1/sessions
  app.post('/api/v1/sessions', async (req: FastifyRequest<{
    Body: { deviceId: string; clientId: string }
  }>, reply: FastifyReply) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing x-user-id header' }
      });
    }

    const session = await sessionService.createRemoteSession({
      deviceId: req.body.deviceId,
      clientId: req.body.clientId,
      clientUserId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return reply.status(201).send({
      success: true,
      data: session
    });
  });

  // GET /api/v1/sessions/:id
  app.get('/api/v1/sessions/:id', async (req: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' }
      });
    }

    return reply.send({
      success: true,
      data: session
    });
  });

  // POST /api/v1/sessions/:id/end
  app.post('/api/v1/sessions/:id/end', async (req: FastifyRequest<{
    Params: { id: string },
    Body: { bytesTransferred?: number; latencyMs?: number; reason?: string }
  }>, reply: FastifyReply) => {
    const session = await sessionService.endSession(req.params.id, req.body);
    return reply.send({
      success: true,
      data: session
    });
  });

  // GET /api/v1/ice-servers
  app.get('/api/v1/ice-servers', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req.headers['x-user-id'] as string) || 'anonymous';
    const iceServers = TurnUtil.generateIceServers(userId);

    return reply.send({
      success: true,
      data: {
        iceServers,
        ttl: 86400
      }
    });
  });
}
