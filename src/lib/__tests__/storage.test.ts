import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMemberId, setMemberId, removeMemberId } from '../storage';

describe('storage', () => {
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
    };

    vi.stubGlobal('window', { localStorage: mockLocalStorage });
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getMemberId', () => {
    it('returns null when no member is stored', () => {
      expect(getMemberId('my-group')).toBeNull();
    });

    it('returns the stored member ID', () => {
      mockStorage.set('aux:members:my-group', 'member-123');
      expect(getMemberId('my-group')).toBe('member-123');
    });

    it('uses slug-specific keys', () => {
      mockStorage.set('aux:members:group-a', 'member-a');
      mockStorage.set('aux:members:group-b', 'member-b');

      expect(getMemberId('group-a')).toBe('member-a');
      expect(getMemberId('group-b')).toBe('member-b');
    });
  });

  describe('setMemberId', () => {
    it('stores the member ID under the correct key', () => {
      setMemberId('my-group', 'member-456');
      expect(mockStorage.get('aux:members:my-group')).toBe('member-456');
    });

    it('overwrites existing value', () => {
      setMemberId('my-group', 'member-old');
      setMemberId('my-group', 'member-new');
      expect(mockStorage.get('aux:members:my-group')).toBe('member-new');
    });
  });

  describe('removeMemberId', () => {
    it('removes the stored member ID', () => {
      mockStorage.set('aux:members:my-group', 'member-789');
      removeMemberId('my-group');
      expect(mockStorage.has('aux:members:my-group')).toBe(false);
    });

    it('does nothing if key does not exist', () => {
      removeMemberId('nonexistent');
      expect(mockStorage.size).toBe(0);
    });
  });
});
