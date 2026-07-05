import { render, screen } from '@testing-library/react';
import { IntegrationsCard } from './integrations-card';

describe('IntegrationsCard', () => {
  it('показывает заголовок и ключевые узлы интеграций', () => {
    render(<IntegrationsCard />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/откуда угодно/i);
    for (const node of ['Claude', 'MCP', 'REST API', 'n8n']) {
      expect(screen.getByText(node)).toBeTruthy();
    }
  });
});
