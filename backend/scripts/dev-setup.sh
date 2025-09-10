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
