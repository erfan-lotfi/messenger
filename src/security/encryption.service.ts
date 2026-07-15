import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const TEXT_PREFIX = 'enc:v1:';
const BUFFER_MAGIC = Buffer.from('MSG1');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const configuredSecret =
      this.configService.get<string>('APP_ENCRYPTION_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'dev-secret';

    this.key = createHash('sha256').update(configuredSecret).digest();
  }

  encryptText(value: string): string {
    if (!value) {
      return value;
    }

    if (this.isEncryptedText(value)) {
      return value;
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${TEXT_PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
  }

  decryptText(value: string | null): string | null {
    if (!value) {
      return value;
    }

    if (!this.isEncryptedText(value)) {
      return value;
    }

    const payload = Buffer.from(value.slice(TEXT_PREFIX.length), 'base64');
    const iv = payload.subarray(0, IV_LENGTH);
    const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  encryptBuffer(buffer: Buffer): Buffer {
    if (this.isEncryptedBuffer(buffer)) {
      return buffer;
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([BUFFER_MAGIC, iv, tag, encrypted]);
  }

  decryptBuffer(buffer: Buffer): Buffer {
    if (!this.isEncryptedBuffer(buffer)) {
      return buffer;
    }

    const ivStart = BUFFER_MAGIC.length;
    const tagStart = ivStart + IV_LENGTH;
    const dataStart = tagStart + TAG_LENGTH;
    const iv = buffer.subarray(ivStart, tagStart);
    const tag = buffer.subarray(tagStart, dataStart);
    const encrypted = buffer.subarray(dataStart);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private isEncryptedText(value: string) {
    return value.startsWith(TEXT_PREFIX);
  }

  private isEncryptedBuffer(buffer: Buffer) {
    return (
      buffer.length > BUFFER_MAGIC.length &&
      buffer.subarray(0, BUFFER_MAGIC.length).equals(BUFFER_MAGIC)
    );
  }
}
