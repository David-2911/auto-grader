import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:5000/api',
    VITE_WS_URL: 'ws://localhost:5000',
    MODE: 'test',
    DEV: true,
    PROD: false,
  },
  writable: true,
});

// Mock localStorage with enhanced functionality
const createStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock fetch
global.fetch = vi.fn();

// Mock URL methods
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-object-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  result: null,
  error: null,
  onload: null,
  onerror: null,
  onabort: null,
  abort: vi.fn(),
})) as any;

// Mock File and Blob constructors
global.File = vi.fn().mockImplementation((chunks: any[], filename: string, options: any = {}) => ({
  name: filename,
  size: chunks.reduce((acc: number, chunk: any) => acc + (chunk.length || 0), 0),
  type: options.type || '',
  lastModified: Date.now(),
  stream: vi.fn(),
  arrayBuffer: vi.fn(),
  text: vi.fn(),
  slice: vi.fn(),
})) as any;

global.Blob = vi.fn().mockImplementation((chunks: any[] = [], options: any = {}) => ({
  size: chunks.reduce((acc: number, chunk: any) => acc + (chunk.length || 0), 0),
  type: options.type || '',
  stream: vi.fn(),
  arrayBuffer: vi.fn(),
  text: vi.fn(),
  slice: vi.fn(),
})) as any;

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation((url: string) => ({
  url,
  readyState: 0, // CONNECTING
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
})) as any;

// Test utilities
export const testUtils = {
  // User generators
  createMockUser: (overrides: any = {}) => ({
    id: 1,
    email: 'test@example.com',
    role: 'student',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  // Auth tokens
  createMockTokens: () => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  }),

  // Course data
  createMockCourse: (overrides: any = {}) => ({
    id: 1,
    code: 'CS101',
    title: 'Introduction to Computer Science',
    description: 'Basic computer science concepts',
    credits: 3,
    semester: 'Fall 2024',
    teacherId: 1,
    ...overrides,
  }),

  // Assignment data
  createMockAssignment: (overrides: any = {}) => ({
    id: 1,
    courseId: 1,
    title: 'Assignment 1',
    description: 'First assignment',
    type: 'homework',
    totalPoints: 100,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    ...overrides,
  }),

  // Submission data
  createMockSubmission: (overrides: any = {}) => ({
    id: 1,
    assignmentId: 1,
    studentId: 1,
    content: 'Test submission content',
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    grade: null,
    ...overrides,
  }),

  // File upload helpers
  createMockFile: (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
    const file = new File(['test content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },

  // Async test helpers
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Form helpers
  fillForm: (container: HTMLElement, values: Record<string, any>) => {
    Object.entries(values).forEach(([name, value]) => {
      const input = container.querySelector(`[name="${name}"]`) as HTMLInputElement;
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = Boolean(value);
        } else {
          input.value = String(value);
        }
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  },

  // Date helpers
  addDays: (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  // Error helpers
  createApiError: (status = 400, message = 'Test error') => ({
    status,
    message,
    timestamp: new Date().toISOString(),
  }),
};

// Global test constants
export const TEST_CONSTANTS = {
  API_BASE_URL: 'http://localhost:5000/api',
  VALID_EMAIL: 'test@example.com',
  INVALID_EMAIL: 'invalid-email',
  VALID_PASSWORD: 'TestPassword123!',
  WEAK_PASSWORD: '123',
  DEFAULT_TIMEOUT: 5000,
};

// Cleanup function to reset state between tests
afterEach(() => {
  // Clear localStorage and sessionStorage
  localStorageMock.clear();
  sessionStorageMock.clear();
  
  // Clear all mocks
  vi.clearAllMocks();
});
