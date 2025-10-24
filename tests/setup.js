// Global test setup
const path = require("path");

// Mock axios globally to avoid making real HTTP requests during tests
jest.mock("axios");

// Set test environment variables
process.env.NODE_ENV = "test";

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests for cleaner output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
