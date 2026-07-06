import { render, screen } from '@testing-library/react';
import { Header } from './header';

describe('Header', () => {
  it('показывает бренд и CTA регистрации', () => {
    render(<Header />);
    expect(screen.getByText(/moonga studio/i)).toBeTruthy();
    const cta = screen.getByRole('link', { name: /начать бесплатно/i });
    expect(cta.getAttribute('href')).toContain('/register');
  });
});
