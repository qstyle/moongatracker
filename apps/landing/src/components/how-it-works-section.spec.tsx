import { render, screen } from '@testing-library/react';
import { HowItWorksCard } from './how-it-works-section';

describe('HowItWorksCard', () => {
  it('показывает 4 шага пути идеи', () => {
    render(<HowItWorksCard />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/стартап живёт как роадмап/i);
    expect(screen.getAllByTestId('how-step')).toHaveLength(4);
  });
});
