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

export enum RemoteSessionStatus {
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  DISCONNECTED = 'DISCONNECTED',
  FAILED = 'FAILED'
}

export enum AuditEventType {
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
  PAIRING_REQUESTED = 'PAIRING_REQUESTED',
  PAIRING_SUCCESSFUL = 'PAIRING_SUCCESSFUL',
  PAIRING_FAILED = 'PAIRING_FAILED',
  BRUTE_FORCE_LOCKED = 'BRUTE_FORCE_LOCKED',
  DEVICE_REVOKED = 'DEVICE_REVOKED',
  DEVICE_ACCESSED = 'DEVICE_ACCESSED',
  REMOTE_SESSION_CREATED = 'REMOTE_SESSION_CREATED',
  REMOTE_SESSION_ACTIVE = 'REMOTE_SESSION_ACTIVE',
  REMOTE_SESSION_ENDED = 'REMOTE_SESSION_ENDED',
  DEVICE_HEARTBEAT = 'DEVICE_HEARTBEAT'
}

export enum SignalingMessageType {
  REGISTER = 'REGISTER',
  REGISTERED = 'REGISTERED',
  OFFER = 'OFFER',
  ANSWER = 'ANSWER',
  CANDIDATE = 'CANDIDATE',
  HEARTBEAT = 'HEARTBEAT',
  HEARTBEAT_ACK = 'HEARTBEAT_ACK',
  SESSION_START = 'SESSION_START',
  SESSION_END = 'SESSION_END',
  ERROR = 'ERROR'
}

export interface SignalingMessage {
  type: SignalingMessageType;
  sessionId?: string;
  senderId?: string;
  targetId?: string;
  sdp?: string;
  candidate?: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  };
  payload?: any;
  error?: string;
  timestamp?: number;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
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
  hardwareIdentifier: string;
  publicKey: string;
  ownerId: string;
  status: DeviceStatus;
  osInfo?: string;
  ipAddress?: string;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RemoteSession {
  id: string;
  deviceId: string;
  clientId: string;
  clientUserId: string;
  status: RemoteSessionStatus;
  sessionToken: string;
  startedAt?: Date;
  endedAt?: Date;
  bytesTransferred: number;
  latencyMs?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface DevicePresence {
  deviceId: string;
  status: DeviceStatus;
  lastSeenAt: Date;
  ipAddress?: string;
  activeSessionCount: number;
  isReachable: boolean;
  isAvailableForNewSession: boolean;
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
