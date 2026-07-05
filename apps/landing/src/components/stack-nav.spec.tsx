import { render, screen } from '@testing-library/react';
import { StackNav } from './stack-nav';

describe('StackNav', () => {
  it('на первом экране прячет «Назад» и показывает «Листайте вниз»', () => {
    render(<StackNav total={5} />);
    expect(screen.queryByText(/назад/i)).toBeNull();
    expect(screen.getByText(/листайте вниз/i)).toBeTruthy();
  });
});
