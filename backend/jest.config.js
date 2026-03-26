module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        types: ['jest', 'node'],
      },
    },
  },
};
