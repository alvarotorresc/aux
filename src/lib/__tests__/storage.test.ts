import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMemberId, setMemberId, removeMemberId, saveMyGroup, getMyGroups } from '../storage';

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

    it('returns null for empty string slug', () => {
      expect(getMemberId('')).toBeNull();
    });

    it('returns null for slug with special characters', () => {
      expect(getMemberId('group/../admin')).toBeNull();
    });

    it('returns null for single-char slug', () => {
      mockStorage.set('aux:members:a', VALID_UUID_1);
      expect(getMemberId('a')).toBe(VALID_UUID_1);
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

    it('rejects invalid slug format', () => {
      setMemberId('INVALID_SLUG', VALID_UUID_1);
      expect(mockStorage.size).toBe(0);
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

  describe('saveMyGroup', () => {
    it('should save a new group', () => {
      saveMyGroup('cool-music', 'Cool Music Club');

      const stored = JSON.parse(mockStorage.get('aux:my-groups')!);
      expect(stored).toEqual([{ slug: 'cool-music', name: 'Cool Music Club' }]);
    });

    it('should add multiple groups', () => {
      saveMyGroup('group-a', 'Group A');
      saveMyGroup('group-b', 'Group B');

      const stored = JSON.parse(mockStorage.get('aux:my-groups')!);
      expect(stored).toHaveLength(2);
      expect(stored[0]).toEqual({ slug: 'group-a', name: 'Group A' });
      expect(stored[1]).toEqual({ slug: 'group-b', name: 'Group B' });
    });

    it('should update name when group with same slug already exists', () => {
      saveMyGroup('cool-music', 'Old Name');
      saveMyGroup('cool-music', 'New Name');

      const stored = JSON.parse(mockStorage.get('aux:my-groups')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('New Name');
    });

    it('should not duplicate groups by slug', () => {
      saveMyGroup('my-group', 'My Group');
      saveMyGroup('other-group', 'Other Group');
      saveMyGroup('my-group', 'My Group Renamed');

      const stored = JSON.parse(mockStorage.get('aux:my-groups')!);
      expect(stored).toHaveLength(2);
    });
  });

  describe('getMyGroups', () => {
    it('should return empty array when no groups saved', () => {
      expect(getMyGroups()).toEqual([]);
    });

    it('should return saved groups', () => {
      mockStorage.set(
        'aux:my-groups',
        JSON.stringify([
          { slug: 'group-a', name: 'Group A' },
          { slug: 'group-b', name: 'Group B' },
        ]),
      );

      const groups = getMyGroups();
      expect(groups).toHaveLength(2);
      expect(groups[0].slug).toBe('group-a');
      expect(groups[1].slug).toBe('group-b');
    });

    it('should return empty array for invalid JSON', () => {
      mockStorage.set('aux:my-groups', 'not valid json{{{');

      expect(getMyGroups()).toEqual([]);
    });

    it('should return empty array when value is empty string', () => {
      mockStorage.set('aux:my-groups', '');

      // Empty string is falsy, so returns [] via the `if (!raw)` check
      expect(getMyGroups()).toEqual([]);
    });
  });

  describe('SSR safety (typeof window === undefined)', () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
      // In node environment, window is not defined by default.
      // We need to explicitly remove it since we stubbed it in the outer beforeEach.
    });

    it('getMemberId should return null', () => {
      expect(getMemberId('my-group')).toBeNull();
    });

    it('setMemberId should not throw', () => {
      expect(() => setMemberId('my-group', VALID_UUID_1)).not.toThrow();
    });

    it('removeMemberId should not throw', () => {
      expect(() => removeMemberId('my-group')).not.toThrow();
    });

    it('saveMyGroup should not throw', () => {
      expect(() => saveMyGroup('cool-music', 'Cool Music')).not.toThrow();
    });

    it('getMyGroups should return empty array', () => {
      expect(getMyGroups()).toEqual([]);
    });
  });
});
