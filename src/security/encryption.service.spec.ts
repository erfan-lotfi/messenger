import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  const service = new EncryptionService(
    new ConfigService({
      APP_ENCRYPTION_KEY: 'test-key',
    }),
  );

  it('encrypts and decrypts text', () => {
    const encrypted = service.encryptText('hello world');

    expect(encrypted).not.toBe('hello world');
    expect(service.decryptText(encrypted)).toBe('hello world');
  });

  it('encrypts and decrypts buffers', () => {
    const input = Buffer.from('video-bytes');
    const encrypted = service.encryptBuffer(input);

    expect(encrypted.equals(input)).toBe(false);
    expect(service.decryptBuffer(encrypted).equals(input)).toBe(true);
  });

  it('keeps legacy plaintext readable', () => {
    expect(service.decryptText('plain message')).toBe('plain message');
  });
});
