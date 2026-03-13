import crypto from 'crypto';
import { env } from '../config/env';

/**
 * AES-256-GCM authenticated encryption for Razorpay key secrets.
 *
 * Key material: RAZORPAY_ENCRYPTION_KEY (64 hex chars = 32 bytes) from env.
 * Each encryption uses a fresh random 12-byte IV.
 * The GCM auth tag (16 bytes) prevents ciphertext tampering.
 *
 * The decrypted plaintext is NEVER logged or returned in API responses.
 */

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
    const hex = env.RAZORPAY_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('RAZORPAY_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
    }
    return Buffer.from(hex, 'hex');
}

export interface EncryptedPayload {
    encrypted: string;  // hex-encoded ciphertext
    iv: string;         // hex-encoded 96-bit IV
    authTag: string;    // hex-encoded 128-bit GCM auth tag
}

/**
 * Encrypt a plaintext string.
 * @returns EncryptedPayload — safe to store in database
 */
export function encryptSecret(plaintext: string): EncryptedPayload {
    const key = getKey();
    const iv = crypto.randomBytes(12);                             // 96-bit IV (recommended for GCM)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);

    return {
        encrypted: encrypted.toString('hex'),
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex'),
    };
}

/**
 * Decrypt a previously encrypted payload.
 * Throws if the auth tag does not match (tampered payload).
 */
export function decryptSecret(payload: EncryptedPayload): string {
    const key = getKey();
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(payload.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

    return Buffer.concat([
        decipher.update(Buffer.from(payload.encrypted, 'hex')),
        decipher.final(),
    ]).toString('utf8');
}

/**
 * Constant-time HMAC-SHA256 comparison — used for webhook signature verification.
 * Never use === for comparing HMACs: timing attacks.
 */
export function verifyHmacSha256(
    rawBody: Buffer,
    receivedSignature: string,
    secret: string
): boolean {
    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    if (expected.length !== receivedSignature.length) return false;

    return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(receivedSignature)
    );
}
