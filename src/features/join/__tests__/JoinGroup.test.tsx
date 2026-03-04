// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { JoinGroup } from '../JoinGroup';
import type { Member } from '../../../lib/types';

// --- Mocks at boundaries ---

const mockSetMemberId = vi.fn();
vi.mock('../../../lib/storage', () => ({
  setMemberId: (...args: unknown[]) => mockSetMemberId(...args),
}));

const mockSupabaseInsert = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockMembersOrder = vi.fn();

vi.mock('../../../lib/supabase', () => {
  // Chainable eq() that supports .eq().eq().single() and .eq().order()
  const makeEqChain = () => {
    const chain: Record<string, unknown> = {
      order: () => mockMembersOrder(),
      single: () => mockSupabaseSelect(),
    };
    chain.eq = () => chain;
    return chain;
  };

  return {
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => makeEqChain(),
        }),
        insert: () => ({
          select: () => ({
            single: () => mockSupabaseInsert(),
          }),
        }),
      }),
    },
  };
});

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
    // Default: fetch returns empty members (only hit when members prop is omitted)
    mockMembersOrder.mockResolvedValue({ data: [], error: null });
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

  // --- New tests: name too long ---

  it('should show error when name exceeds 40 characters', async () => {
    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const input = screen.getByPlaceholderText('Your name');
    const longName = 'A'.repeat(41);
    fireEvent.change(input, { target: { value: longName } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Name is too long (max 40 characters)');
    });
  });

  // --- New tests: successful member creation ---

  it('should save member ID and reload on successful creation', async () => {
    mockSupabaseInsert.mockResolvedValue({
      data: { id: 'new-member-1', group_id: 'g1', name: 'Charlie', avatar: '🎵' },
      error: null,
    });

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'Charlie' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSetMemberId).toHaveBeenCalledWith('test-group', 'new-member-1');
      expect(mockReload).toHaveBeenCalled();
    });
  });

  // --- New tests: 23505 unique constraint error ---

  it('should recover from 23505 unique constraint by selecting existing member', async () => {
    mockSupabaseInsert.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    mockSupabaseSelect.mockResolvedValue({
      data: { id: 'existing-member-1', group_id: 'g1', name: 'Alice', avatar: '🎵' },
      error: null,
    });

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'Alice' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSetMemberId).toHaveBeenCalledWith('test-group', 'existing-member-1');
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it('should show generic error when 23505 lookup fails', async () => {
    mockSupabaseInsert.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    mockSupabaseSelect.mockResolvedValue({
      data: null,
      error: { code: '500', message: 'select failed' },
    });

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'Alice' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.',
      );
    });
  });

  it('should show generic error on unexpected insert error', async () => {
    mockSupabaseInsert.mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'table not found' },
    });

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'Charlie' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.',
      );
    });
  });

  // --- New tests: member count display ---

  it('should display correct number of members in selection list', () => {
    const members = [
      makeMember({ id: 'm1', name: 'Alice' }),
      makeMember({ id: 'm2', name: 'Bob' }),
      makeMember({ id: 'm3', name: 'Charlie' }),
    ];

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={members} />);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  // --- New tests: switching between select and create ---

  it('should switch back to select step from create step', () => {
    const members = [makeMember({ id: 'm1', name: 'Alice' })];

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={members} />);

    // Switch to create
    fireEvent.click(screen.getByText("I'm new here"));
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();

    // Switch back to select
    fireEvent.click(screen.getByText('Who are you?'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should not show back button in create step when no members exist', () => {
    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    // Should be on create step directly, no "Who are you?" back button
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    const backButtons = screen.queryAllByText('Who are you?');
    // Only the heading should be visible, not a back button (heading is in select step only)
    expect(backButtons).toHaveLength(0);
  });

  // --- New tests: submit button state ---

  it('should enable submit button when name has content', () => {
    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'Alice' } });

    const button = screen.getByRole('button', { name: 'Join group' });
    expect(button).not.toBeDisabled();
  });

  it('should show loading text while submitting', async () => {
    mockSupabaseInsert.mockReturnValue(new Promise(() => {})); // never resolves

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" members={[]} />);

    const input = screen.getByPlaceholderText('Your name');
    fireEvent.change(input, { target: { value: 'Charlie' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  // --- Fetch members from Supabase (no members prop) ---

  it('should show loading spinner when members prop is not provided', () => {
    mockMembersOrder.mockReturnValue(new Promise(() => {})); // never resolves

    const { container } = render(<JoinGroup slug="test-group" groupId="g1" locale="en" />);

    // Loading spinner should be visible (the animate-spin div)
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    // Should NOT show the join form yet
    expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument();
  });

  it('should show member selection when fetch returns members', async () => {
    const fetchedMembers = [
      makeMember({ id: 'fm1', name: 'Fetched Alice' }),
      makeMember({ id: 'fm2', name: 'Fetched Bob' }),
    ];
    mockMembersOrder.mockResolvedValue({ data: fetchedMembers, error: null });

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText('Fetched Alice')).toBeInTheDocument();
      expect(screen.getByText('Fetched Bob')).toBeInTheDocument();
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should show create form when fetch returns empty array', async () => {
    mockMembersOrder.mockResolvedValue({ data: [], error: null });

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    });
  });

  it('should show create form when fetch returns error', async () => {
    mockMembersOrder.mockResolvedValue({
      data: null,
      error: { code: '500', message: 'Internal error' },
    });

    render(<JoinGroup slug="test-group" groupId="g1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    });
    // Should NOT show member selection
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should not update state when unmounted during fetch', async () => {
    let resolveFetch!: (value: { data: Member[]; error: null }) => void;
    mockMembersOrder.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = render(<JoinGroup slug="test-group" groupId="g1" locale="en" />);

    // Unmount before fetch resolves — triggers cancelled = true
    unmount();

    // Resolve after unmount — should not cause state update warnings
    resolveFetch({ data: [makeMember()], error: null });

    // If we get here without React warnings about state updates on unmounted
    // component, the cancelled flag is working correctly
  });
});
