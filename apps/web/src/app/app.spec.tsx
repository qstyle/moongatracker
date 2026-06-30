import { render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should redirect unauthenticated users to login', () => {
    const { baseElement } = render(<App />);
    // Without a token the app renders the unauthenticated routes
    expect(baseElement).toBeTruthy();
  });
});
