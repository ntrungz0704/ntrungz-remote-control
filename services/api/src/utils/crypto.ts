import crypto from 'node:crypto';

export class CryptoUtil {
  /**
   * Sinh mã PIN OTP 6 chữ số an toàn mật mã học
   */
  public static generatePin(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  public static generateDeviceToken(): string {
    return `dev_tok_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Sinh chuỗi salt ngẫu nhiên
   */
  public static generateSalt(length = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Băm mã PIN an toàn bằng scrypt (chống brute-force GPU)
   */
  public static hashPin(pin: string, salt: string): string {
    const key = crypto.scryptSync(pin, salt, 64);
    return key.toString('hex');
  }

  /**
   * Kiểm tra mã PIN với hash lưu trữ, chống Timing Attack
   */
  public static verifyPin(pin: string, salt: string, expectedHashHex: string): boolean {
    const computedKey = crypto.scryptSync(pin, salt, 64);
    const expectedKey = Buffer.from(expectedHashHex, 'hex');
    if (computedKey.length !== expectedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedKey, expectedKey);
  }

  /**
   * Sinh cặp khóa Ed25519 cho thiết bị
   */
  public static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
  }

  /**
   * Xác thực chữ ký số từ Public Key của thiết bị (chống mạo danh MachineGuid)
   */
  public static verifySignature(publicKeyPem: string, data: string, signatureBase64: string): boolean {
    try {
      const signature = Buffer.from(signatureBase64, 'base64');
      const dataBuffer = Buffer.from(data, 'utf-8');
      return crypto.verify(null, dataBuffer, publicKeyPem, signature);
    } catch {
      return false;
    }
  }

  /**
   * Ký dữ liệu bằng Private Key của thiết bị (Ed25519 EdDSA)
   */
  public static signData(privateKeyPem: string, data: string): string {
    const dataBuffer = Buffer.from(data, 'utf-8');
    const signature = crypto.sign(null, dataBuffer, privateKeyPem);
    return signature.toString('base64');
  }
}
