import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.validation.js';

describe('validateEnvironment', () => {
  const baseConfig = {
    MONGODB_URI: 'mongodb://localhost:27017/saeta',
    JWT_SECRET: 'super-secret-jwt-key-min-16-chars',
  };

  it('provides default 1d for JWT_REFRESH_EXPIRES_IN when omitted', () => {
    const env = validateEnvironment(baseConfig);
    expect(env.JWT_REFRESH_EXPIRES_IN).toBe('1d');
    expect(env.JWT_REFRESH_SECRET).toBeUndefined();
  });

  it('accepts valid durations <= 1 day', () => {
    const validDurations = ['1d', '24h', '12h', '1440m', '60m', '86400s', '3600s'];
    for (const duration of validDurations) {
      const env = validateEnvironment({
        ...baseConfig,
        JWT_REFRESH_EXPIRES_IN: duration,
      });
      expect(env.JWT_REFRESH_EXPIRES_IN).toBe(duration);
    }
  });

  it('accepts optional JWT_REFRESH_SECRET with at least 16 characters', () => {
    const env = validateEnvironment({
      ...baseConfig,
      JWT_REFRESH_SECRET: 'refresh-secret-min-16-characters',
    });
    expect(env.JWT_REFRESH_SECRET).toBe('refresh-secret-min-16-characters');
  });

  it('rejects JWT_REFRESH_SECRET shorter than 16 characters', () => {
    expect(() =>
      validateEnvironment({
        ...baseConfig,
        JWT_REFRESH_SECRET: 'short',
      }),
    ).toThrow();
  });

  it('rejects durations exceeding 1 day', () => {
    const invalidDurations = ['2d', '25h', '1441m', '86401s'];
    for (const duration of invalidDurations) {
      expect(() =>
        validateEnvironment({
          ...baseConfig,
          JWT_REFRESH_EXPIRES_IN: duration,
        }),
      ).toThrow();
    }
  });

  it('rejects invalid duration format', () => {
    const malformedDurations = ['invalid', '10', '1w', '1y', ''];
    for (const duration of malformedDurations) {
      expect(() =>
        validateEnvironment({
          ...baseConfig,
          JWT_REFRESH_EXPIRES_IN: duration,
        }),
      ).toThrow();
    }
  });
});
