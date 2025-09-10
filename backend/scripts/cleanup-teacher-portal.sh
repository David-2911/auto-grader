#!/bin/bash

# Teacher Portal Cleanup Script
# Removes old temporary files, exports, and logs

set -e

echo "🧹 Cleaning up Teacher Portal files..."

# Load environment variables (.env.<NODE_ENV> first, then fallback to .env)
ENV_FILE=".env"
PREFERRED_ENV="${NODE_ENV:-development}"
if [ -f ".env.$PREFERRED_ENV" ]; then
    ENV_FILE=".env.$PREFERRED_ENV"
fi

if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC2046
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

RETENTION_DAYS=${GRADEBOOK_EXPORT_RETENTION_DAYS:-30}
NOTIFICATION_RETENTION_DAYS=${NOTIFICATION_RETENTION_DAYS:-90}

# Clean old gradebook exports
if [ -d "storage/gradebook_exports" ]; then
    find storage/gradebook_exports -name "*.csv" -mtime +$RETENTION_DAYS -delete
    echo "Cleaned gradebook exports older than $RETENTION_DAYS days"
fi

# Clean old temporary uploads
if [ -d "storage/temp_uploads" ]; then
    find storage/temp_uploads -type f -mtime +1 -delete
    echo "Cleaned temporary uploads older than 1 day"
fi

# Clean old log files (keep only last 10)
if [ -d "logs" ]; then
    find logs -name "*.log.*" -type f | sort -r | tail -n +11 | xargs rm -f
    echo "Cleaned old log files"
fi

# Clean old processed files (keep only last 30 days)
if [ -d "storage/processed_files" ]; then
    find storage/processed_files -type f -mtime +30 -delete
    echo "Cleaned old processed files"
fi

echo "✅ Teacher Portal cleanup completed"
