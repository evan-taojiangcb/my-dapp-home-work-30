import "@testing-library/jest-dom";

// jsdom does not implement document.execCommand — stub it for clipboard fallback tests
Object.defineProperty(document, "execCommand", {
  value: vi.fn(() => true),
  writable: true,
  configurable: true,
});
