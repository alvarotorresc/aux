// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { GenreFilter } from '../GenreFilter';
import { GENRES } from '../../../lib/genres';

describe('GenreFilter', () => {
  it('should render a select with "All genres" as default option', () => {
    render(<GenreFilter value={null} onChange={vi.fn()} locale="en" />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe('');
  });

  it('should list all genres as options plus the "All" option', () => {
    render(<GenreFilter value={null} onChange={vi.fn()} locale="en" />);
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(GENRES.length + 1); // genres + "All genres"
  });

  it('should call onChange with genre when selected', async () => {
    const onChange = vi.fn();
    render(<GenreFilter value={null} onChange={onChange} locale="en" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'rock');
    expect(onChange).toHaveBeenCalledWith('rock');
  });

  it('should call onChange with null when "All" is selected', async () => {
    const onChange = vi.fn();
    render(<GenreFilter value="rock" onChange={onChange} locale="en" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), '');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('should have accessible label', () => {
    render(<GenreFilter value={null} onChange={vi.fn()} locale="en" />);
    expect(screen.getByLabelText('Filter by genre')).toBeInTheDocument();
  });

  it('should show Spanish labels when locale is es', () => {
    render(<GenreFilter value={null} onChange={vi.fn()} locale="es" />);
    expect(screen.getByLabelText('Filtrar por genero')).toBeInTheDocument();
    expect(screen.getByText('Todos los generos')).toBeDefined();
  });

  it('should reflect the current value', () => {
    render(<GenreFilter value="jazz" onChange={vi.fn()} locale="en" />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('jazz');
  });
});
