import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Auto-Grader E2E tests
 */
export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Global test timeout
  timeout: 30000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000
  },
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    ['allure-playwright', { outputFolder: 'test-results/allure' }]
  ],
  
  // Global test setup
  globalSetup: require.resolve('./utils/global-setup'),
  globalTeardown: require.resolve('./utils/global-teardown'),
  
  // Output directory for artifacts
  outputDir: 'test-results/artifacts',
  
  // Shared settings for all tests
  use: {
    // Base URL for all tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Artifacts collection
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Test timeout
    actionTimeout: 10000,
    navigationTimeout: 15000,
    
    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Additional context options
    storageState: undefined, // Will be set per test suite
    permissions: ['clipboard-read', 'clipboard-write']
  },

  // Test environments and browser configurations
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    
    // Desktop Chrome tests
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup']
    },

    // Desktop Firefox tests
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup']
    },

    // Desktop Safari tests
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup']
    },

    // Mobile Chrome tests
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup']
    },

    // Mobile Safari tests
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup']
    },

    // Tablet tests
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
      dependencies: ['setup']
    },

    // Accessibility tests with specific settings
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Force reduced motion for consistent accessibility testing
        reducedMotion: 'reduce'
      },
      testMatch: /.*\.accessibility\.spec\.ts/,
      dependencies: ['setup']
    },

    // Performance tests
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // CPU throttling for performance testing
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--disable-background-timer-throttling']
        }
      },
      testMatch: /.*\.performance\.spec\.ts/,
      dependencies: ['setup']
    },

    // Visual regression tests
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent settings for visual testing
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1
      },
      testMatch: /.*\.visual\.spec\.ts/,
      dependencies: ['setup']
    }
  ],

  // Web server configuration for local development
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev',
      cwd: '../frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'npm run dev',
      cwd: '../backend',
      port: 5000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }
  ],

  // Test metadata
  metadata: {
    'test-suite': 'Auto-Grader E2E Tests',
    'environment': process.env.NODE_ENV || 'development',
    'version': process.env.APP_VERSION || '1.0.0'
  }
});
