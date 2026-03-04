// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo, LogoWithText } from '../Logo';

describe('Logo', () => {
  it('should render an SVG with role img', () => {
    render(<Logo />);

    const svg = screen.getByRole('img');
    expect(svg).toBeDefined();
  });

  it('should have aria-label "Aux logo"', () => {
    render(<Logo />);

    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toBe('Aux logo');
  });

  it('should render with default size of 32', () => {
    render(<Logo />);

    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });

  it('should render with custom size', () => {
    render(<Logo size={48} />);

    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('48');
    expect(svg.getAttribute('height')).toBe('48');
  });

  it('should use default accent color', () => {
    const { container } = render(<Logo />);

    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('var(--accent)');
  });

  it('should use custom color', () => {
    const { container } = render(<Logo color="#ff0000" />);

    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('#ff0000');
  });

  it('should pass className to SVG', () => {
    render(<Logo className="my-logo" />);

    const svg = screen.getByRole('img');
    expect(svg.getAttribute('class')).toContain('my-logo');
  });
});

describe('LogoWithText', () => {
  it('should render the Logo SVG', () => {
    render(<LogoWithText />);

    const svg = screen.getByRole('img');
    expect(svg).toBeDefined();
  });

  it('should render "Aux" text', () => {
    render(<LogoWithText />);

    expect(screen.getByText('Aux')).toBeDefined();
  });

  it('should use default size of 28 for the logo', () => {
    render(<LogoWithText />);

    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('28');
    expect(svg.getAttribute('height')).toBe('28');
  });

  it('should pass custom size to the logo', () => {
    render(<LogoWithText size={40} />);

    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('40');
  });

  it('should pass color to the logo', () => {
    const { container } = render(<LogoWithText color="#00ff00" />);

    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('#00ff00');
  });

  it('should apply textClassName to the text span', () => {
    render(<LogoWithText textClassName="custom-text" />);

    const textEl = screen.getByText('Aux');
    expect(textEl.getAttribute('class')).toContain('custom-text');
  });

  it('should apply className to the wrapper div', () => {
    const { container } = render(<LogoWithText className="wrapper-class" />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute('class')).toContain('wrapper-class');
  });
});
