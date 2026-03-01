// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JoinGroup } from '../JoinGroup';
import type { Member } from '../../../lib/types';

// --- Mocks at boundaries ---

const mockSetMemberId = vi.fn();
vi.mock('../../../lib/storage', () => ({
  setMemberId: (...args: unknown[]) => mockSetMemberId(...args),
}));

const mockSupabaseInsert = vi.fn();
const mockSupabaseSelect = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          single: () => mockSupabaseSelect(),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => mockSupabaseInsert(),
        }),
      }),
    }),
  },
}));

// --- Factories ---

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    group_id: 'group-1',
    name: 'Alice',
    avatar: '🎵',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('JoinGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Member selection step ---

  it('should show member selection when members are provided', () => {
    const members = [
      makeMember({ id: 'm1', name: 'Alice' }),
      makeMember({ id: 'm2', name: 'Bob' }),
    ];

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={members} />);

    expect(screen.getByText('Who are you?')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
  });

  it('should show create form when no members exist', () => {
    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    expect(screen.getByPlaceholderText('Your name')).toBeDefined();
    expect(screen.getByText('Join group')).toBeDefined();
  });

  it('should save member ID and reload when selecting existing member', () => {
    const members = [makeMember({ id: 'm1', name: 'Alice' })];

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={members} />);

    const aliceButton = screen.getByRole('option', { name: /Alice/ });
    fireEvent.click(aliceButton);

    expect(mockSetMemberId).toHaveBeenCalledWith('test-group', 'm1');
    expect(mockReload).toHaveBeenCalled();
  });

  it('should switch to create form when "I\'m new here" is clicked', () => {
    const members = [makeMember({ id: 'm1', name: 'Alice' })];

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={members} />);

    fireEvent.click(screen.getByText("I'm new here"));

    expect(screen.getByPlaceholderText('Your name')).toBeDefined();
  });

  // --- Create member step ---

  it('should show error when name is too short', async () => {
    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'A' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toBe('Name is required');
    });
  });

  it('should disable submit button when name is empty', () => {
    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const button = screen.getByRole('button', { name: 'Join group' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('should render emoji picker for avatar selection', () => {
    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    expect(screen.getByText('Pick your avatar')).toBeDefined();
    expect(screen.getByRole('radiogroup')).toBeDefined();
  });

  it('should show back button to member selection when members exist', () => {
    const members = [makeMember({ id: 'm1', name: 'Alice' })];

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={members} />);

    // Switch to create step
    fireEvent.click(screen.getByText("I'm new here"));

    // Should show a back button
    const backButton = screen.getByText('Who are you?');
    expect(backButton).toBeDefined();
  });

  it('should render join title', () => {
    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    expect(screen.getByText('Join this group')).toBeDefined();
  });

  it('should render listbox for member selection', () => {
    const members = [makeMember({ id: 'm1', name: 'Alice' })];

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={members} />);

    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('should display member avatars in the selection list', () => {
    const members = [
      makeMember({ id: 'm1', name: 'Alice', avatar: '🎵' }),
      makeMember({ id: 'm2', name: 'Bob', avatar: '🎸' }),
    ];

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={members} />);

    expect(screen.getByText('🎵')).toBeDefined();
    expect(screen.getByText('🎸')).toBeDefined();
  });
});
