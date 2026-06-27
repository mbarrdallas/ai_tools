/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/tests/**',
    '!**/node_modules/**',
    '!**/*.d.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!uuid)',
  ],
};
