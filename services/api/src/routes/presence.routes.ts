import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PresenceService } from '../services/presence.service';

export function presenceRoutes(app: FastifyInstance, presenceService: PresenceService) {
  // POST /api/v1/presence/heartbeat
  app.post('/api/v1/presence/heartbeat', async (req: FastifyRequest<{
    Body: { deviceId: string }
  }>, reply: FastifyReply) => {
    if (!req.body?.deviceId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'deviceId is required' }
      });
    }

    const presence = await presenceService.recordHeartbeat(req.body.deviceId, req.ip);
    return reply.send({
      success: true,
      data: presence
    });
  });

  // GET /api/v1/presence/:deviceId
  app.get('/api/v1/presence/:deviceId', async (req: FastifyRequest<{
    Params: { deviceId: string }
  }>, reply: FastifyReply) => {
    const presence = presenceService.getPresence(req.params.deviceId);
    return reply.send({
      success: true,
      data: presence
    });
  });
}
