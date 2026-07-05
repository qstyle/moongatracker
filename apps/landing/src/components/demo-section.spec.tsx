import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DemoCard } from './demo-section';

describe('DemoCard', () => {
  it('по «Отдать агенту» показывает комментарий агента и перенос карточки, откат возвращает в idea', async () => {
    render(<DemoCard />);
    fireEvent.click(screen.getByRole('button', { name: /отдать агенту/i }));
    await waitFor(() => expect(screen.getByTestId('agent-comment').textContent).toMatch(/разобрал идею/i));
    expect(screen.getByTestId('card-column').textContent).toMatch(/разбор/i);

    fireEvent.click(screen.getByRole('button', { name: /откатить/i }));
    expect(screen.getByTestId('card-column').textContent).toMatch(/idea/i);
  });
});
