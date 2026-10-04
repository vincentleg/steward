import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3100',
    viewport: { width: 1440, height: 1000 },
    headless: true,
  },
  reporter: 'list',
  webServer: [
    {
      command: 'node server.js',
      url: 'http://localhost:3100/api/health',
      env: {
        PORT: '3100',
        DATA_DIR: '.data/e2e',
        AGENTMAIL_API_KEY: '',
        APPROVAL_EMAIL: '',
        PUBLIC_BASE_URL: '',
        WORKFLOW_PACE: '0.75',
      },
      reuseExistingServer: false,
    },
    {
      command: 'node sandbox-server.js',
      url: 'http://localhost:3103/sandbox',
      env: {
        SANDBOX_PORT: '3103',
        SANDBOX_PACE: '0.75',
        PUBLIC_BASE_URL: '',
        AGENTMAIL_API_KEY: '',
        APPROVAL_EMAIL: '',
      },
      reuseExistingServer: false,
    },
  ],
});
