export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(message: string, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', errorCode = 'UNAUTHORIZED') {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', errorCode = 'FORBIDDEN') {
    super(message, 403, errorCode);
  }
}

export class ValidationError extends AppError {
  public details?: any;

  constructor(message = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class PairingExpiredError extends AppError {
  constructor(message = 'Pairing session has expired') {
    super(message, 410, 'PAIRING_EXPIRED');
  }
}

export class PairingLockedError extends AppError {
  constructor(message = 'Pairing session is locked due to too many failed attempts') {
    super(message, 429, 'PAIRING_LOCKED');
  }
}

export class DeviceRevokedError extends AppError {
  constructor(message = 'Device has been revoked') {
    super(message, 403, 'DEVICE_REVOKED');
  }
}
