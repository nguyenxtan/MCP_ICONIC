// Test setup file
const fs = require('fs');
const path = require('path');

// Create test directories
const testDirs = [
  path.join(__dirname, '../test-uploads'),
  path.join(__dirname, '../test-outputs')
];

beforeAll(() => {
  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
});

afterAll(() => {
  // Cleanup test directories
  testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
