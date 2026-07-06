import { render, screen } from '@testing-library/react';
import { HeroCard } from './hero-section';

describe('HeroCard', () => {
  it('показывает H1 про запуск стартапа и CTA на регистрацию', () => {
    render(<HeroCard />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/доходит до запуска/i);
    const cta = screen.getByRole('link', { name: /начать бесплатно/i });
    expect(cta.getAttribute('href')).toContain('/register');
  });
});
