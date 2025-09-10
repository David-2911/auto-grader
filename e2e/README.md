# End-to-End Testing Configuration

## Playwright Configuration for Auto-Grader System

This directory contains end-to-end tests for the Auto-Grader system using Playwright.

### Test Structure

- `tests/` - Test files organized by user role and feature
- `fixtures/` - Test data and file fixtures
- `pages/` - Page object models for UI interactions
- `utils/` - Helper utilities for E2E tests

### Running Tests

```bash
# Install dependencies
npm install

# Run all E2E tests
npm run test:e2e

# Run tests in headed mode
npm run test:e2e:headed

# Run specific test suite
npm run test:e2e -- --grep "Authentication"

# Generate test report
npm run test:e2e:report
```

### Test Categories

1. **Authentication Tests** - Login, logout, registration, password reset
2. **Student Workflow Tests** - Assignment submission, grade viewing
3. **Teacher Workflow Tests** - Course management, grading, feedback
4. **Admin Workflow Tests** - User management, system administration
5. **Cross-browser Tests** - Compatibility across browsers
6. **Performance Tests** - Load times, responsiveness
7. **Accessibility Tests** - WCAG compliance, screen reader support

### Environment Configuration

Tests can be run against different environments:
- `development` - Local development server
- `staging` - Staging environment
- `production` - Production environment (read-only tests)

### Data Management

- Tests use isolated test data that is created and cleaned up automatically
- Fixtures provide realistic sample data for comprehensive testing
- Database state is managed to ensure test independence
