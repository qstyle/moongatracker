import { render, screen } from '@testing-library/react';
import { DotGridCanvas } from './dot-grid-canvas';

describe('DotGridCanvas', () => {
  it('рендерит декоративный canvas (aria-hidden) и не падает без 2d-контекста', () => {
    render(<DotGridCanvas className="absolute inset-0" />);
    const canvas = screen.getByTestId('dot-grid');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
  });
});
