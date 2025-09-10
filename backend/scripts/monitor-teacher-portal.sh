#!/bin/bash

# Teacher Portal Monitoring Script
# Checks system health and reports issues

set -e

echo "📊 Teacher Portal System Health Check..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

PORT=${PORT:-3000}
DB_NAME=${DB_NAME:-autograde}
DB_USER=${DB_USER:-root}

# Check if server is running
if curl -s -f "http://localhost:$PORT/api/health" > /dev/null; then
    echo "✅ Server is running on port $PORT"
else
    echo "❌ Server is not responding on port $PORT"
fi

# Check database connection
if mysql -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME; SELECT 1;" &>/dev/null; then
    echo "✅ Database connection successful"
    
    # Check key tables
    TABLES=("courses" "assignments" "submissions" "users")
    for table in "${TABLES[@]}"; do
        COUNT=$(mysql -u"$DB_USER" -p"$DB_PASS" -se "SELECT COUNT(*) FROM $DB_NAME.$table;" 2>/dev/null || echo "0")
        echo "📊 $table: $COUNT records"
    done
else
    echo "❌ Database connection failed"
fi

# Check storage directories
STORAGE_DIRS=("storage/processed_files" "storage/assignment_resources" "storage/gradebook_exports" "logs")
for dir in "${STORAGE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        SIZE=$(du -sh "$dir" | cut -f1)
        echo "📁 $dir: $SIZE"
    else
        echo "❌ Missing directory: $dir"
    fi
done

# Check recent errors in logs
if [ -f "logs/error.log" ]; then
    ERROR_COUNT=$(tail -n 100 logs/error.log | grep -c "ERROR" || echo "0")
    echo "🚨 Recent errors in logs: $ERROR_COUNT"
fi

# Check pending grading queue
if mysql -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME;" &>/dev/null; then
    PENDING_GRADING=$(mysql -u"$DB_USER" -p"$DB_PASS" -se "SELECT COUNT(*) FROM $DB_NAME.submissions WHERE status = 'submitted' AND grade IS NULL;" 2>/dev/null || echo "0")
    echo "⏳ Pending grading: $PENDING_GRADING submissions"
    
    FAILED_QUEUE=$(mysql -u"$DB_USER" -p"$DB_PASS" -se "SELECT COUNT(*) FROM $DB_NAME.grading_queue WHERE status = 'failed';" 2>/dev/null || echo "0")
    echo "❌ Failed grading queue items: $FAILED_QUEUE"
fi

echo "✅ Health check completed"
