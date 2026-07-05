import { render, screen } from '@testing-library/react';
import { CardDriftCanvas } from './card-drift-canvas';

describe('CardDriftCanvas', () => {
  it('рендерит декоративный canvas (aria-hidden) и не падает без 2d-контекста', () => {
    render(<CardDriftCanvas className="absolute inset-0" />);
    const canvas = screen.getByTestId('card-drift');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
  });
});
