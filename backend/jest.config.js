/**
 * Jest configuration for the HR Attendance & Payroll backend.
 *
 * Uses ts-jest so specs can be written in TypeScript without a separate
 * build step. Specs live next to the code they cover as `*.spec.ts`.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
};
