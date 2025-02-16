import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*auth.test.ts', '**/*subs.test.ts', '**/*news.test.ts', '**/*email.test.ts', '**/*analytics.test.ts'],
  setupFiles: ['dotenv/config'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 10000
};

export default config;