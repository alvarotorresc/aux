// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CreateGroup } from '../CreateGroup';

// --- Mocks at boundaries ---

const mockInsertSingle = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => mockInsertSingle(),
        }),
      }),
    }),
  },
}));

vi.mock('../../../components/ui/Button', () => ({
  Button: (
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode },
  ) => <button {...props}>{props.children}</button>,
}));

vi.mock('../../../components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock crypto.getRandomValues
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i * 7; // deterministic for testing
      }
      return arr;
    },
  },
});

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('CreateGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertSingle.mockResolvedValue({
      data: { id: 'g1', name: 'Test', slug: 'abc123' },
      error: null,
    });
    mockLocation.href = '';
  });

  // --- Rendering ---

  it('should render form with input and button', () => {
    render(<CreateGroup locale="en" />);

    expect(screen.getByLabelText('Create a group')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Group name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create group' })).toBeInTheDocument();
  });

  it('should render heading', () => {
    render(<CreateGroup locale="en" />);

    expect(screen.getByRole('heading', { name: 'Create a group' })).toBeInTheDocument();
  });

  // --- Validation ---

  it('should show error when name is empty on submit', async () => {
    render(<CreateGroup locale="en" />);

    const form = screen.getByPlaceholderText('Group name').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Group name is required');
    });
  });

  it('should show error when name is too short', async () => {
    render(<CreateGroup locale="en" />);

    const input = screen.getByPlaceholderText('Group name');
    fireEvent.change(input, { target: { value: 'A' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Group name is required');
    });
  });

  it('should show error when name exceeds 60 characters', async () => {
    render(<CreateGroup locale="en" />);

    const input = screen.getByPlaceholderText('Group name');
    const longName = 'A'.repeat(61);
    fireEvent.change(input, { target: { value: longName } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Group name is required');
    });
  });

  // --- Successful submit ---

  it('should navigate to group page on successful submit', async () => {
    render(<CreateGroup locale="en" />);

    const input = screen.getByPlaceholderText('Group name');
    fireEvent.change(input, { target: { value: 'My Music Club' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLocation.href).toMatch(/^\/g\//);
    });
  });

  it('should use /es prefix for Spanish locale', async () => {
    render(<CreateGroup locale="es" />);

    const input = screen.getByPlaceholderText('Nombre del grupo');
    fireEvent.change(input, { target: { value: 'Mi Club Musical' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLocation.href).toMatch(/^\/es\/g\//);
    });
  });

  // --- Supabase errors ---

  it('should show generic error when supabase returns non-23505 error', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'Table not found' },
    });

    render(<CreateGroup locale="en" />);

    const input = screen.getByPlaceholderText('Group name');
    fireEvent.change(input, { target: { value: 'My Music Club' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.',
      );
    });
  });

  // --- Button state ---

  it('should show loading indicator while submitting', async () => {
    // Make the insert hang to keep isSubmitting true
    mockInsertSingle.mockReturnValue(new Promise(() => {}));

    render(<CreateGroup locale="en" />);

    const input = screen.getByPlaceholderText('Group name');
    fireEvent.change(input, { target: { value: 'My Music Club' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  it('should disable button while submitting', async () => {
    mockInsertSingle.mockReturnValue(new Promise(() => {}));

    render(<CreateGroup locale="en" />);

    const input = screen.getByPlaceholderText('Group name');
    fireEvent.change(input, { target: { value: 'My Music Club' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  it('should have maxLength 60 on input', () => {
    render(<CreateGroup locale="en" />);

    const input = screen.getByPlaceholderText('Group name');
    expect(input).toHaveAttribute('maxLength', '60');
  });
});
