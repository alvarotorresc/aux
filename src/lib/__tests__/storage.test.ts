import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMemberId, setMemberId, removeMemberId } from '../storage';

// Valid UUID v4 for tests (storage.ts now validates UUID format)
const VALID_UUID_1 = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-ae0f-1a2b3c4d5e6f';

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
      mockStorage.set('aux:members:my-group', VALID_UUID_1);
      expect(getMemberId('my-group')).toBe(VALID_UUID_1);
    });

    it('uses slug-specific keys', () => {
      mockStorage.set('aux:members:group-a', VALID_UUID_1);
      mockStorage.set('aux:members:group-b', VALID_UUID_2);

      expect(getMemberId('group-a')).toBe(VALID_UUID_1);
      expect(getMemberId('group-b')).toBe(VALID_UUID_2);
    });

    it('returns null for non-UUID values in storage', () => {
      mockStorage.set('aux:members:my-group', 'not-a-uuid');
      expect(getMemberId('my-group')).toBeNull();
    });

    it('returns null for invalid slug format', () => {
      mockStorage.set('aux:members:MY_GROUP', VALID_UUID_1);
      expect(getMemberId('MY_GROUP')).toBeNull();
    });
  });

  describe('setMemberId', () => {
    it('stores the member ID under the correct key', () => {
      setMemberId('my-group', VALID_UUID_1);
      expect(mockStorage.get('aux:members:my-group')).toBe(VALID_UUID_1);
    });

    it('overwrites existing value', () => {
      setMemberId('my-group', VALID_UUID_2);
      setMemberId('my-group', VALID_UUID_3);
      expect(mockStorage.get('aux:members:my-group')).toBe(VALID_UUID_3);
    });

    it('rejects non-UUID member IDs', () => {
      setMemberId('my-group', 'not-a-uuid');
      expect(mockStorage.has('aux:members:my-group')).toBe(false);
    });
  });

  describe('removeMemberId', () => {
    it('removes the stored member ID', () => {
      mockStorage.set('aux:members:my-group', VALID_UUID_1);
      removeMemberId('my-group');
      expect(mockStorage.has('aux:members:my-group')).toBe(false);
    });

    it('does nothing if key does not exist', () => {
      removeMemberId('nonexistent');
      expect(mockStorage.size).toBe(0);
    });
  });
});
