import { render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should render the skeleton cards', () => {
    const { getByText } = render(<App />);
    expect(getByText('1')).toBeTruthy();
  });
});
