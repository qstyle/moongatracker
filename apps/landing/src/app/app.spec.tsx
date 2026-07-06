import { render, screen } from '@testing-library/react';
import App from './app';

describe('App', () => {
  it('рендерит хедер и hero-заголовок', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/доходит до запуска/i);
    expect(screen.getAllByText(/moonga studio/i).length).toBeGreaterThan(0);
  });
});
