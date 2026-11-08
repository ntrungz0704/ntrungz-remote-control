import { z } from 'zod';
import { DeviceType } from './types';

export const RegisterDeviceSchema = z.object({
  name: z.string().min(2).max(100),
  deviceType: z.nativeEnum(DeviceType).default(DeviceType.WINDOWS_PC),
  hardwareIdentifier: z.string().min(6).max(128),
  publicKey: z.string().min(32).max(2048), // PEM or base64 public key
  osInfo: z.string().max(255).optional(),
  ownerId: z.string().uuid()
});

export const StartPairingSchema = z.object({
  deviceId: z.string().uuid(),
  userId: z.string().uuid(),
  validityMinutes: z.number().int().min(1).max(30).default(10)
});

export const VerifyPairingSchema = z.object({
  sessionId: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
  userId: z.string().uuid()
});

export const RevokeDeviceSchema = z.object({
  deviceId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().max(255).optional()
});

export type RegisterDeviceInput = z.infer<typeof RegisterDeviceSchema>;
export type StartPairingInput = z.infer<typeof StartPairingSchema>;
export type VerifyPairingInput = z.infer<typeof VerifyPairingSchema>;
export type RevokeDeviceInput = z.infer<typeof RevokeDeviceSchema>;
