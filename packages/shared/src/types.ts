export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  PAIRED = 'PAIRED',
  UNPAIRED = 'UNPAIRED',
  REVOKED = 'REVOKED'
}

export enum PairingStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  LOCKED = 'LOCKED',
  REVOKED = 'REVOKED'
}

export enum DeviceType {
  WINDOWS_PC = 'WINDOWS_PC',
  ANDROID_PHONE = 'ANDROID_PHONE',
  WEB_BROWSER = 'WEB_BROWSER'
}

export enum AuditEventType {
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
  PAIRING_REQUESTED = 'PAIRING_REQUESTED',
  PAIRING_SUCCESSFUL = 'PAIRING_SUCCESSFUL',
  PAIRING_FAILED = 'PAIRING_FAILED',
  BRUTE_FORCE_LOCKED = 'BRUTE_FORCE_LOCKED',
  DEVICE_REVOKED = 'DEVICE_REVOKED',
  DEVICE_ACCESSED = 'DEVICE_ACCESSED'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  name: string;
  deviceType: DeviceType;
  hardwareIdentifier: string; // MachineGuid or TPM fingerprint
  publicKey: string;          // Ed25519/RSA Public Key
  ownerId: string;
  status: DeviceStatus;
  osInfo?: string;
  ipAddress?: string;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PairingSession {
  id: string;
  deviceId: string;
  userId: string;
  pinHash: string;
  salt: string;
  expiresAt: Date;
  status: PairingStatus;
  attemptCount: number;
  maxAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  deviceId?: string;
  eventType: AuditEventType;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}
