import { durationToSeconds, randomToken, sha256, slugify, toUserDto } from './auth.util';

describe('auth.util', () => {
  describe('sha256', () => {
    it('is deterministic', () => {
      expect(sha256('abc')).toBe(sha256('abc'));
    });
    it('differs for different input', () => {
      expect(sha256('abc')).not.toBe(sha256('abd'));
    });
  });

  describe('durationToSeconds', () => {
    it.each([
      ['15m', 900],
      ['7d', 604_800],
      ['2h', 7_200],
      ['30s', 30],
    ])('parses %s -> %i seconds', (input, expected) => {
      expect(durationToSeconds(input)).toBe(expected);
    });
    it('falls back for malformed input', () => {
      expect(durationToSeconds('bogus')).toBe(604_800);
    });
  });

  describe('slugify', () => {
    it('lowercases and joins on non-alphanumerics', () => {
      expect(slugify('Acme Inc!')).toBe('acme-inc');
    });
    it('falls back when empty', () => {
      expect(slugify('   ')).toBe('workspace');
    });
  });

  describe('toUserDto', () => {
    it('strips sensitive fields', () => {
      const dto = toUserDto({
        id: 'u1',
        email: 'a@b.test',
        name: 'A',
        avatarUrl: null,
        passwordHash: 'SUPERSECRET',
      } as never);
      expect(dto).toEqual({ id: 'u1', email: 'a@b.test', name: 'A', avatarUrl: null });
      expect(JSON.stringify(dto)).not.toContain('SUPERSECRET');
    });
  });

  describe('randomToken', () => {
    it('produces unique tokens', () => {
      expect(randomToken()).not.toBe(randomToken());
    });
  });
});
