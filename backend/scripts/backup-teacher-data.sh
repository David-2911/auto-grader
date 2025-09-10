#!/bin/bash

# Teacher Portal Database Backup Script

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_USER=${DB_USER:-root}
DB_NAME=${DB_NAME:-autograde}
BACKUP_DIR="backups/teacher-portal"
DATE=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

echo "🗄️ Creating teacher portal database backup..."

# Backup teacher-specific tables
TEACHER_TABLES=(
    "courses"
    "enrollments"
    "assignments"
    "submissions"
    "assignment_templates"
    "grading_criteria"
    "assignment_resources"
    "submission_criteria_grades"
    "grading_adjustments"
    "grading_queue"
    "notifications"
    "notification_attachments"
    "announcements"
    "student_notes"
    "attendance"
    "grade_history"
    "grade_appeals"
    "course_statistics"
    "course_metadata"
    "course_prerequisites"
    "gradebook_settings"
)

# Create backup file
BACKUP_FILE="$BACKUP_DIR/teacher_portal_backup_$DATE.sql"

echo "-- Teacher Portal Database Backup - $DATE" > "$BACKUP_FILE"
echo "-- Auto-Grade System" >> "$BACKUP_FILE"
echo "" >> "$BACKUP_FILE"

for table in "${TEACHER_TABLES[@]}"; do
    echo "Backing up table: $table"
    mysqldump -u"$DB_USER" -p"$DB_PASS" --single-transaction --routines --triggers "$DB_NAME" "$table" >> "$BACKUP_FILE" 2>/dev/null || true
done

# Compress backup
gzip "$BACKUP_FILE"

echo "✅ Backup completed: ${BACKUP_FILE}.gz"

# Clean old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "🗑️ Old backups cleaned"
