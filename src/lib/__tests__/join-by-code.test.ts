import { describe, it, expect } from 'vitest';
import { buildJoinUrl } from '../join-by-code';

describe('buildJoinUrl', () => {
  describe('slug normalization', () => {
    it('should return path with slug when input is already a valid slug', () => {
      expect(buildJoinUrl('my-group', 'en')).toBe('/g/my-group');
    });

    it('should lowercase and hyphenate when input has mixed case and spaces', () => {
      expect(buildJoinUrl('My Group', 'en')).toBe('/g/my-group');
    });

    it('should trim leading and trailing whitespace when input has surrounding spaces', () => {
      expect(buildJoinUrl('  hello  ', 'en')).toBe('/g/hello');
    });

    it('should collapse multiple spaces into a single hyphen when input has consecutive spaces', () => {
      expect(buildJoinUrl('foo  bar  baz', 'en')).toBe('/g/foo-bar-baz');
    });

    it('should preserve already slugified input when no transformation is needed', () => {
      expect(buildJoinUrl('cool-tunes', 'en')).toBe('/g/cool-tunes');
    });
  });

  describe('locale prefix', () => {
    it('should add /es prefix when locale is es', () => {
      expect(buildJoinUrl('my-group', 'es')).toBe('/es/g/my-group');
    });

    it('should not add prefix when locale is en', () => {
      expect(buildJoinUrl('my-group', 'en')).toBe('/g/my-group');
    });
  });

  describe('invalid input', () => {
    it('should return null when input is an empty string', () => {
      expect(buildJoinUrl('', 'en')).toBeNull();
    });

    it('should return null when input is whitespace only', () => {
      expect(buildJoinUrl('   ', 'en')).toBeNull();
    });
  });
});
