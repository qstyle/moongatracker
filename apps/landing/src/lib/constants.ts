// Куда ведут CTA регистрации. В проде переопределяется через VITE_APP_URL.
export const APP_URL: string =
  (import.meta.env.VITE_APP_URL as string | undefined) ?? '/register';
