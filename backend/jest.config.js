# Backend Jest configuration
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/migrations/**", "!src/seeds/**"],
};
