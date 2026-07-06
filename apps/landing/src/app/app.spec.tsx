import { render, screen } from '@testing-library/react';
import App from './app';

describe('App', () => {
  it('рендерит хедер и hero-заголовок', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/полноправный участник/i);
    expect(screen.getAllByText(/moongatracker/i).length).toBeGreaterThan(0);
  });
});
