import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PairingService } from '../services/pairing.service';
import { StartPairingSchema, VerifyPairingSchema } from '../../../../packages/shared/src/schemas';

export function pairingRoutes(app: FastifyInstance, pairingService: PairingService) {
  // POST /api/v1/pairing/start
  app.post('/api/v1/pairing/start', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = StartPairingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pairing request',
          details: parseResult.error.format()
        }
      });
    }

    const result = await pairingService.startPairing({
      ...parseResult.data,
      ipAddress: req.ip
    });

    return reply.status(201).send({
      success: true,
      data: result
    });
  });

  // POST /api/v1/pairing/verify
  app.post('/api/v1/pairing/verify', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = VerifyPairingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pairing verification data',
          details: parseResult.error.format()
        }
      });
    }

    const result = await pairingService.verifyPairing({
      ...parseResult.data,
      ipAddress: req.ip
    });

    return reply.send({
      success: true,
      data: result
    });
  });
}
