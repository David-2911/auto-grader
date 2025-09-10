#!/bin/bash

# Teacher Portal Dependencies Installation Script
# Ensures all required packages are installed for the enhanced teacher portal

set -e

echo "📦 Installing Teacher Portal Dependencies..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

print_section "Installing Core Dependencies..."

# Core Express and middleware
npm install --save express@^4.18.2
npm install --save cors@^2.8.5
npm install --save helmet@^7.0.0
npm install --save compression@^1.7.4
npm install --save morgan@^1.10.0

print_status "Core Express dependencies installed"

# Database
npm install --save mysql2@^3.6.0
npm install --save sequelize@^6.32.1

print_status "Database dependencies installed"

# Authentication and Security
npm install --save jsonwebtoken@^9.0.2
npm install --save bcryptjs@^2.4.3
npm install --save express-validator@^7.0.1
npm install --save express-rate-limit@^6.10.0

print_status "Authentication and security dependencies installed"

# File Upload and Processing
npm install --save multer@^1.4.5-lts.1
npm install --save csv-parser@^3.0.0
npm install --save csv-writer@^1.6.0
npm install --save archiver@^5.3.1

print_status "File processing dependencies installed"

# Email and Notifications
npm install --save nodemailer@^6.9.4
npm install --save handlebars@^4.7.8

print_status "Email and notification dependencies installed"

# Logging and Monitoring
npm install --save winston@^3.10.0
npm install --save winston-daily-rotate-file@^4.7.1

print_status "Logging dependencies installed"

# Utilities
npm install --save dotenv@^16.3.1
npm install --save lodash@^4.17.21
npm install --save moment@^2.29.4
npm install --save uuid@^9.0.0

print_status "Utility dependencies installed"

print_section "Installing Development Dependencies..."

# Development and Testing
npm install --save-dev nodemon@^3.0.1
npm install --save-dev jest@^29.6.2
npm install --save-dev supertest@^6.3.3
npm install --save-dev eslint@^8.47.0
npm install --save-dev prettier@^3.0.2

print_status "Development dependencies installed"

print_section "Installing Optional ML Dependencies..."

# ML and AI integration (optional)
npm install --save axios@^1.5.0
npm install --save form-data@^4.0.0

print_status "ML integration dependencies installed"

print_section "Updating package.json scripts..."

# Update package.json with useful scripts
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
  ...pkg.scripts,
  'start': 'node server.js',
  'dev': 'nodemon server.js',
  'test': 'jest',
  'test:watch': 'jest --watch',
  'test:teacher-portal': 'jest tests/teacher-portal.test.js',
  'lint': 'eslint src/',
  'lint:fix': 'eslint src/ --fix',
  'format': 'prettier --write src/',
  'setup': './setup-enhanced-teacher-portal.sh',
  'cleanup': './scripts/cleanup-teacher-portal.sh',
  'backup': './scripts/backup-teacher-data.sh',
  'monitor': './scripts/monitor-teacher-portal.sh',
  'migrate': 'node scripts/migrate.js',
  'seed': 'node scripts/seed.js'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('📝 Package.json scripts updated');
"

print_section "Creating Jest Configuration..."

# Create jest.config.js
cat > jest.config.js << 'EOL'
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/database.js',
    '!src/config/swagger.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true
};
EOL

print_status "Jest configuration created"

print_section "Creating ESLint Configuration..."

# Create .eslintrc.js
cat > .eslintrc.js << 'EOL'
module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  globals: {
    'process': 'readonly',
    '__dirname': 'readonly',
    '__filename': 'readonly'
  }
};
EOL

print_status "ESLint configuration created"

print_section "Creating Prettier Configuration..."

# Create .prettierrc
cat > .prettierrc << 'EOL'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
EOL

print_status "Prettier configuration created"

print_section "Creating Test Setup..."

# Create test setup file
mkdir -p tests
cat > tests/setup.js << 'EOL'
// Test setup file for Teacher Portal
const { config } = require('dotenv');

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_NAME = 'autograde_test';

// Global test timeout
jest.setTimeout(30000);

// Mock console for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test helpers
global.testHelpers = {
  generateTestUser: (role = 'teacher') => ({
    id: Math.floor(Math.random() * 1000),
    email: `test-${role}@example.com`,
    role: role,
    firstName: 'Test',
    lastName: 'User'
  }),
  
  generateTestCourse: () => ({
    code: `TEST${Math.floor(Math.random() * 1000)}`,
    title: 'Test Course',
    description: 'A test course',
    credits: 3,
    semester: 'Test Semester'
  }),
  
  generateTestAssignment: (courseId) => ({
    courseId: courseId,
    title: 'Test Assignment',
    description: 'A test assignment',
    totalPoints: 100,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })
};

// Database cleanup helpers
beforeEach(async () => {
  // Add any global setup needed before each test
});

afterEach(async () => {
  // Add any global cleanup needed after each test
});
EOL

print_status "Test setup created"

print_section "Creating Environment Files..."

# Create .env.test for testing
cat > .env.test << 'EOL'
# Test Environment Configuration
NODE_ENV=test

# Database Configuration (Test)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=autograde_test
DB_PORT=3306

# JWT Configuration (Test)
JWT_SECRET=test-super-secret-jwt-key
JWT_REFRESH_SECRET=test-super-secret-refresh-key
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# Server Configuration (Test)
PORT=3001

# File Upload Configuration (Test)
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./storage/test

# Email Configuration (Test - Use MailHog or similar)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=test@autograde.com
FROM_NAME=Auto-Grade Test

# ML Service Configuration (Test)
ML_SERVICE_URL=http://localhost:5001
ML_SERVICE_TIMEOUT=10000

# Rate Limiting (Test)
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000

# Teacher Portal Specific (Test)
GRADEBOOK_EXPORT_RETENTION_DAYS=1
NOTIFICATION_RETENTION_DAYS=7
MAX_BULK_OPERATIONS=100
ATTENDANCE_GRACE_PERIOD_MINUTES=5

# Security (Test)
BCRYPT_ROUNDS=4
SESSION_SECRET=test-session-secret
CORS_ORIGIN=http://localhost:3000

# Logging (Test)
LOG_LEVEL=error
LOG_TO_FILE=false
EOL

print_status "Test environment configuration created"

print_section "Creating .gitignore entries..."

# Add to .gitignore if it exists, create if it doesn't
GITIGNORE_ENTRIES="
# Teacher Portal specific
storage/temp_uploads/
storage/gradebook_exports/
storage/processed_files/
logs/*.log
coverage/
*.log

# Dependencies
node_modules/

# Environment files
.env
.env.local
.env.test
.env.production

# Test files
tests/temp/
tests/fixtures/uploads/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Backup files
backups/
*.sql.gz
"

if [ -f .gitignore ]; then
    echo "$GITIGNORE_ENTRIES" >> .gitignore
else
    echo "$GITIGNORE_ENTRIES" > .gitignore
fi

print_status ".gitignore updated"

print_section "Creating Development Scripts..."

# Create development helper script
cat > scripts/dev-setup.sh << 'EOL'
#!/bin/bash

# Development Environment Setup for Teacher Portal

echo "🔧 Setting up development environment..."

# Create necessary directories
mkdir -p storage/{temp_uploads,gradebook_exports,processed_files,test}
mkdir -p logs
mkdir -p tests/{fixtures,temp}
mkdir -p backups

# Set permissions
chmod -R 755 storage/
chmod -R 755 logs/
chmod +x scripts/*.sh

# Install git hooks (if git repo exists)
if [ -d .git ]; then
    # Pre-commit hook to run linting
    cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
npm run lint
if [ $? -ne 0 ]; then
    echo "ESLint failed. Please fix the errors before committing."
    exit 1
fi
HOOK
    chmod +x .git/hooks/pre-commit
    echo "✅ Git pre-commit hook installed"
fi

echo "✅ Development environment setup complete"
EOL

chmod +x scripts/dev-setup.sh

print_status "Development scripts created"

print_section "Running Security Audit..."

# Run npm audit
npm audit || echo "⚠️  Some vulnerabilities found - review npm audit output"

print_section "Final Setup..."

# Run development setup
./scripts/dev-setup.sh

# Install husky for git hooks (optional)
if [ -d .git ]; then
    npm install --save-dev husky@^8.0.3
    npx husky install
    npx husky add .husky/pre-commit "npm run lint"
    print_status "Git hooks configured with husky"
fi

echo ""
echo "🎉 Teacher Portal dependencies installation complete!"
echo ""
print_status "✅ All dependencies installed successfully"
print_status "📝 Configuration files created"
print_status "🧪 Test environment configured"
print_status "🔧 Development tools set up"
echo ""
print_status "Next steps:"
echo "  1. Update .env file with your configuration"
echo "  2. Run: npm run dev (for development)"
echo "  3. Run: npm test (to run tests)"
echo "  4. Run: npm run setup (for full system setup)"
echo ""
print_status "🚀 Happy coding!"
