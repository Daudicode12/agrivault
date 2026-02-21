# Backend Jest configuration
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  moduleFileExtensions: ["js", "json"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.js", "!src/migrations/**", "!src/seeds/**"],
};
