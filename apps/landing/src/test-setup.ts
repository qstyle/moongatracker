// jsdom does not implement ResizeObserver, which Lenis (and other
// browser-only libs used by the sticky card stack) construct on mount.
// Provide a no-op polyfill so components can mount under jsdom.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserver {
    observe() {
      /* no-op */
    }
    unobserve() {
      /* no-op */
    }
    disconnect() {
      /* no-op */
    }
  }
  globalThis.ResizeObserver = ResizeObserver as unknown as typeof globalThis.ResizeObserver;
}

// jsdom does not implement matchMedia, which GSAP ScrollTrigger calls on register.
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {
      /* deprecated no-op */
    },
    removeListener: () => {
      /* deprecated no-op */
    },
    addEventListener: () => {
      /* no-op */
    },
    removeEventListener: () => {
      /* no-op */
    },
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia;
}
