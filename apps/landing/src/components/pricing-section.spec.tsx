import { render, screen } from '@testing-library/react';
import { PricingCard } from './pricing-section';

describe('PricingCard', () => {
  it('показывает три тарифа и финальный CTA на регистрацию', () => {
    render(<PricingCard />);
    for (const plan of ['Free', 'Pro', 'Team']) {
      expect(screen.getByText(plan)).toBeTruthy();
    }
    const cta = screen.getByRole('link', { name: /создать аккаунт/i });
    expect(cta.getAttribute('href')).toContain('/register');
  });
});
