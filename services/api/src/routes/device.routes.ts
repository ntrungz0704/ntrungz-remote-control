import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DeviceService } from '../services/device.service';
import { RegisterDeviceSchema, RevokeDeviceSchema } from '../../../../packages/shared/src/schemas';

export function deviceRoutes(app: FastifyInstance, deviceService: DeviceService) {
  // POST /api/v1/devices/register
  app.post('/api/v1/devices/register', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = RegisterDeviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid device registration data',
          details: parseResult.error.format()
        }
      });
    }

    const device = await deviceService.registerDevice({
      ...parseResult.data,
      ipAddress: req.ip
    });

    return reply.status(201).send({
      success: true,
      data: device
    });
  });

  // GET /api/v1/devices (ownerId from header or query)
  app.get('/api/v1/devices', async (req: FastifyRequest<{ Querystring: { ownerId: string } }>, reply: FastifyReply) => {
    const ownerId = req.query.ownerId || (req.headers['x-user-id'] as string);
    if (!ownerId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'User ID is required' }
      });
    }

    const devices = await deviceService.listDevices(ownerId);
    return reply.send({
      success: true,
      data: devices
    });
  });

  // GET /api/v1/devices/:id
  app.get('/api/v1/devices/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const ownerId = req.headers['x-user-id'] as string;
    if (!ownerId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing x-user-id header' }
      });
    }

    const device = await deviceService.getDevice(req.params.id, ownerId);
    return reply.send({
      success: true,
      data: device
    });
  });

  // DELETE /api/v1/devices/:id/revoke
  app.delete('/api/v1/devices/:id/revoke', async (req: FastifyRequest<{ Params: { id: string }, Body: { reason?: string } }>, reply: FastifyReply) => {
    const ownerId = req.headers['x-user-id'] as string;
    if (!ownerId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing x-user-id header' }
      });
    }

    const device = await deviceService.revokeDevice(req.params.id, ownerId, req.body?.reason);
    return reply.send({
      success: true,
      data: device
    });
  });
}
