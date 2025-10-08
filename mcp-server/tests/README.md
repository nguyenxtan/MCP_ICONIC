# MCP Server Test Suite

Comprehensive unit and integration tests for MCP Server.

## Test Coverage

### Unit Tests

1. **Conversion Service Tests** (`conversion.test.js`)
   - Markdown to HTML conversion
   - Markdown to PDF conversion with Puppeteer
   - Markdown to DOCX conversion
   - Theme support (default, dark, minimal)
   - Error handling

2. **Template Service Tests** (`template.test.js`)
   - Template listing and retrieval
   - Template rendering with Handlebars
   - Custom template creation and deletion
   - Handlebars helper functions
   - Data validation

3. **Batch Service Tests** (`batch.test.js`)
   - Job creation and management
   - Batch processing with progress tracking
   - Error handling during processing
   - ZIP archive generation
   - Job cleanup and retention

4. **API Endpoint Tests** (`api.test.js`)
   - Conversion endpoints (HTML, PDF, DOCX)
   - Template endpoints (list, get, render, create, delete)
   - QR code generation endpoints
   - Error responses and validation

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# API tests only
npm run test:api

# Specific test file
npm test -- conversion.test.js
```

### Verbose Output
```bash
npm run test:verbose
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Test environment: Node.js
- Coverage threshold: 70% for branches, functions, lines, and statements
- Test timeout: 30 seconds (for PDF generation tests)
- Setup file: `tests/setup.js`

### Setup File (`setup.js`)
- Creates test directories (`test-uploads`, `test-outputs`)
- Cleans up test directories after all tests
- Mocks environment variables for testing

## Writing New Tests

### Test Structure
```javascript
describe('Feature Name', () => {
  beforeAll(() => {
    // Setup before all tests in this suite
  });

  afterAll(() => {
    // Cleanup after all tests in this suite
  });

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  test('should do something', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up resources (files, database records, etc.) after tests
3. **Mocking**: Mock external dependencies (APIs, databases, file system when appropriate)
4. **Assertions**: Use clear, specific assertions with descriptive messages
5. **Coverage**: Aim for at least 70% code coverage
6. **Performance**: Keep tests fast; mock slow operations when possible

### Example Test
```javascript
test('should convert markdown to HTML', async () => {
  const markdown = '# Hello World';
  const html = await converterService.markdownToHTML(markdown);

  expect(html).toContain('<h1>Hello World</h1>');
  expect(html).toBeDefined();
});
```

## Coverage Reports

After running `npm run test:coverage`, view the HTML coverage report:
```bash
open coverage/lcov-report/index.html
```

Coverage reports include:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## Continuous Integration

Tests should be run automatically on:
- Pull requests
- Before merging to main branch
- Before deploying to production

Example GitHub Actions workflow:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Troubleshooting

### Tests Timeout
- Increase timeout in jest.config.js or individual test files
- Check for async operations that aren't awaited

### Tests Fail Locally but Pass in CI
- Check for environment-specific dependencies
- Ensure test data is not hardcoded with local paths

### Coverage Below Threshold
- Add tests for uncovered branches
- Remove dead code
- Mock complex dependencies

## Test Data

Test files are stored in:
- Input: `test-uploads/`
- Output: `test-outputs/`

These directories are automatically created and cleaned up by the test setup.

## Known Issues

1. **PDF Generation Tests**: May be slow due to Puppeteer browser launch
2. **Cloud Storage Tests**: Skipped by default (require credentials)
3. **AI Service Tests**: Skipped by default (require API keys)

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests pass locally
3. Run coverage report and maintain >70% coverage
4. Update this README if adding new test suites
