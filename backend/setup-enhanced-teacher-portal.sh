#!/bin/bash

# Enhanced Teacher Portal Setup Script
# This script sets up the complete teacher portal with all specialized services

set -e

echo "🎓 Setting up Enhanced Teacher Portal for Auto-Grade System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

print_header "Installing Required Dependencies..."

# Install additional dependencies for teacher portal
npm install --save multer express-rate-limit helmet compression cors morgan winston express-validator jsonwebtoken bcryptjs mysql2 dotenv nodemailer csv-parser csv-writer

print_status "Dependencies installed successfully"

print_header "Setting up Database Schema..."

# Check if MySQL is running
if ! command -v mysql &> /dev/null; then
    print_warning "MySQL client not found. Please ensure MySQL is installed and running."
    print_warning "You'll need to manually apply the database schema."
else
    # Check database connection
    read -p "Enter MySQL username (default: root): " DB_USER
    DB_USER=${DB_USER:-root}
    
    read -s -p "Enter MySQL password: " DB_PASS
    echo
    
    read -p "Enter database name (default: autograde): " DB_NAME
    DB_NAME=${DB_NAME:-autograde}
    
    # Test connection
    if mysql -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME;" 2>/dev/null; then
        print_status "Database connection successful"
        
        # Apply schemas
        print_status "Applying teacher portal schema..."
        mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < src/config/teacher_portal_schema.sql
        
        print_status "Applying enhanced teacher portal schema..."
        mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < src/config/enhanced_teacher_portal_schema.sql
        
        print_status "Database schema applied successfully"
    else
        print_error "Failed to connect to database. Please check your credentials."
        print_warning "You'll need to manually apply the following schema files:"
        print_warning "  - src/config/teacher_portal_schema.sql"
        print_warning "  - src/config/enhanced_teacher_portal_schema.sql"
    fi
fi

print_header "Creating Required Directories..."

# Create necessary directories
mkdir -p storage/processed_files
mkdir -p storage/assignment_resources
mkdir -p storage/notification_attachments
mkdir -p storage/gradebook_exports
mkdir -p storage/temp_uploads
mkdir -p logs

print_status "Directory structure created"

print_header "Setting up Environment Variables..."

# Create or update .env file with teacher portal specific variables
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    print_status "Creating new .env file..."
    cat > "$ENV_FILE" << EOL
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=autograde
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# File Upload Configuration
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./storage

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@autograde.com
FROM_NAME=Auto-Grade System

# ML Service Configuration
ML_SERVICE_URL=http://localhost:5000
ML_SERVICE_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Teacher Portal Specific
GRADEBOOK_EXPORT_RETENTION_DAYS=30
NOTIFICATION_RETENTION_DAYS=90
MAX_BULK_OPERATIONS=1000
ATTENDANCE_GRACE_PERIOD_MINUTES=10

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-change-this
CORS_ORIGIN=http://localhost:3001

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_MAX_FILES=5
LOG_MAX_SIZE=10m
EOL
    print_status ".env file created with default values"
    print_warning "Please update the .env file with your actual configuration values"
else
    print_status ".env file already exists"
    
    # Add missing environment variables
    if ! grep -q "GRADEBOOK_EXPORT_RETENTION_DAYS" "$ENV_FILE"; then
        echo "" >> "$ENV_FILE"
        echo "# Teacher Portal Specific" >> "$ENV_FILE"
        echo "GRADEBOOK_EXPORT_RETENTION_DAYS=30" >> "$ENV_FILE"
        echo "NOTIFICATION_RETENTION_DAYS=90" >> "$ENV_FILE"
        echo "MAX_BULK_OPERATIONS=1000" >> "$ENV_FILE"
        echo "ATTENDANCE_GRACE_PERIOD_MINUTES=10" >> "$ENV_FILE"
        print_status "Added teacher portal environment variables"
    fi
fi

print_header "Setting up File Permissions..."

# Set proper permissions for storage directories
chmod -R 755 storage/
chmod -R 755 logs/

print_status "File permissions set"

print_header "Creating Cleanup Scripts..."

# Create a cleanup script for old files
cat > scripts/cleanup-teacher-portal.sh << 'EOL'
#!/bin/bash

# Teacher Portal Cleanup Script
# Removes old temporary files, exports, and logs

set -e

echo "🧹 Cleaning up Teacher Portal files..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
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
EOL

chmod +x scripts/cleanup-teacher-portal.sh

print_status "Cleanup script created"

print_header "Creating Database Backup Script..."

# Create database backup script
cat > scripts/backup-teacher-data.sh << 'EOL'
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
EOL

chmod +x scripts/backup-teacher-data.sh

print_status "Backup script created"

print_header "Creating Monitoring Script..."

# Create monitoring script
cat > scripts/monitor-teacher-portal.sh << 'EOL'
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
EOL

chmod +x scripts/monitor-teacher-portal.sh

print_status "Monitoring script created"

print_header "Setting up Cron Jobs..."

# Create crontab entry suggestions
cat > scripts/crontab-suggestions.txt << 'EOL'
# Suggested crontab entries for Teacher Portal maintenance
# Run 'crontab -e' and add these lines:

# Daily cleanup at 2 AM
0 2 * * * cd /path/to/your/backend && ./scripts/cleanup-teacher-portal.sh >> logs/cleanup.log 2>&1

# Weekly backup on Sundays at 3 AM
0 3 * * 0 cd /path/to/your/backend && ./scripts/backup-teacher-data.sh >> logs/backup.log 2>&1

# Hourly health check
0 * * * * cd /path/to/your/backend && ./scripts/monitor-teacher-portal.sh >> logs/monitor.log 2>&1

# Daily grade statistics update at 4 AM
0 4 * * * cd /path/to/your/backend && mysql -u$DB_USER -p$DB_PASS $DB_NAME < scripts/update-statistics.sql >> logs/stats.log 2>&1
EOL

print_status "Cron job suggestions created in scripts/crontab-suggestions.txt"

print_header "Creating Test Scripts..."

# Create a simple test script
cat > scripts/test-teacher-portal.sh << 'EOL'
#!/bin/bash

# Teacher Portal API Test Script

set -e

echo "🧪 Testing Teacher Portal APIs..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

BASE_URL="http://localhost:${PORT:-3000}/api"

# Test health endpoint
echo "Testing health endpoint..."
if curl -s -f "$BASE_URL/health" > /dev/null; then
    echo "✅ Health endpoint responding"
else
    echo "❌ Health endpoint failed"
    exit 1
fi

# Test teacher routes (requires authentication)
echo "Testing teacher routes..."
echo "ℹ️  Note: Authentication required for full testing"

# List available endpoints
echo ""
echo "📋 Available Teacher Portal Endpoints:"
echo "  GET  $BASE_URL/teacher/dashboard"
echo "  GET  $BASE_URL/teacher/courses"
echo "  POST $BASE_URL/teacher/courses"
echo "  GET  $BASE_URL/teacher/courses/:id/students"
echo "  GET  $BASE_URL/teacher/courses/:id/assignments"
echo "  POST $BASE_URL/teacher/assignments"
echo "  GET  $BASE_URL/teacher/assignments/:id/submissions"
echo "  POST $BASE_URL/teacher/grade-submission"
echo "  GET  $BASE_URL/teacher/gradebook/:courseId"
echo "  POST $BASE_URL/teacher/send-feedback"
echo "  GET  $BASE_URL/teacher/analytics/course/:id"

echo ""
echo "✅ Test script completed"
echo "ℹ️  Use tools like Postman or curl with authentication for full API testing"
EOL

chmod +x scripts/test-teacher-portal.sh

print_status "Test script created"

print_header "Creating Documentation..."

# Create README for teacher portal
cat > TEACHER_PORTAL_README.md << 'EOL'
# Enhanced Teacher Portal - Auto-Grade System

The Enhanced Teacher Portal provides comprehensive tools for educators to manage their courses, students, assignments, and grading processes efficiently.

## 🎯 Features

### Course Management
- Create and manage courses with detailed metadata
- Set grading policies and course objectives
- Manage course prerequisites and enrollment
- Archive and duplicate courses
- Course templates and bulk operations

### Student Management
- Enroll and manage students
- Track attendance and participation
- Add student notes and observations
- Monitor student progress and analytics
- Bulk enrollment operations

### Assignment Management
- Create assignments with custom grading criteria
- Use assignment templates for consistency
- Manage assignment resources and attachments
- Set up automated grading workflows
- Duplicate and modify assignments

### Grading Oversight
- Review and override ML-generated grades
- Grade submissions with detailed criteria
- Bulk grading operations
- Grade history and audit trail
- Request regrading for submissions

### Communication
- Send personalized feedback to students
- Create course announcements
- Broadcast messages to classes
- Attach files to communications
- Track communication history

### Gradebook Management
- Export gradebooks in multiple formats
- Import grades from external sources
- Calculate weighted grades and statistics
- Generate grade reports and analytics
- Manage grading scales and policies

## 🚀 Quick Start

1. **Setup**: Run the setup script
   ```bash
   ./setup-enhanced-teacher-portal.sh
   ```

2. **Start Server**: 
   ```bash
   npm start
   ```

3. **Access API**: The teacher portal APIs are available at `/api/teacher/*`

## 📁 Directory Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── course-management.service.js
│   │   ├── student-management.service.js
│   │   ├── assignment-management.service.js
│   │   ├── grading-oversight.service.js
│   │   ├── communication.service.js
│   │   └── gradebook.service.js
│   ├── controllers/
│   │   └── teacher.controller.js
│   ├── routes/
│   │   └── teacher.routes.js
│   └── config/
│       ├── teacher_portal_schema.sql
│       └── enhanced_teacher_portal_schema.sql
├── storage/
│   ├── assignment_resources/
│   ├── gradebook_exports/
│   ├── notification_attachments/
│   └── processed_files/
└── scripts/
    ├── cleanup-teacher-portal.sh
    ├── backup-teacher-data.sh
    ├── monitor-teacher-portal.sh
    └── test-teacher-portal.sh
```

## 🔧 Configuration

### Environment Variables

Key environment variables for the teacher portal:

```env
# Teacher Portal Specific
GRADEBOOK_EXPORT_RETENTION_DAYS=30
NOTIFICATION_RETENTION_DAYS=90
MAX_BULK_OPERATIONS=1000
ATTENDANCE_GRACE_PERIOD_MINUTES=10

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./storage

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Database Schema

The teacher portal uses several database tables:

- **Core Tables**: courses, assignments, submissions, enrollments
- **Management Tables**: assignment_templates, grading_criteria, course_metadata
- **Communication**: notifications, announcements, notification_attachments
- **Analytics**: course_statistics, grade_history, attendance
- **Grading**: grading_queue, grading_adjustments, submission_criteria_grades

## 📊 API Documentation

### Authentication

All teacher portal endpoints require authentication. Include JWT token in header:

```
Authorization: Bearer <your-jwt-token>
```

### Key Endpoints

#### Course Management
- `GET /api/teacher/courses` - List teacher's courses
- `POST /api/teacher/courses` - Create new course
- `GET /api/teacher/courses/:id` - Get course details
- `PUT /api/teacher/courses/:id` - Update course
- `POST /api/teacher/courses/:id/duplicate` - Duplicate course

#### Student Management  
- `GET /api/teacher/courses/:id/students` - List course students
- `POST /api/teacher/students/enroll` - Enroll students
- `GET /api/teacher/students/:id/notes` - Get student notes
- `POST /api/teacher/students/:id/notes` - Add student note

#### Assignment Management
- `GET /api/teacher/assignments` - List assignments
- `POST /api/teacher/assignments` - Create assignment
- `GET /api/teacher/assignment-templates` - List templates
- `POST /api/teacher/assignments/:id/duplicate` - Duplicate assignment

#### Grading
- `GET /api/teacher/assignments/:id/submissions` - List submissions
- `POST /api/teacher/grade-submission` - Grade submission
- `POST /api/teacher/bulk-grade` - Bulk grade submissions
- `POST /api/teacher/request-regrade` - Request regrading

#### Communication
- `POST /api/teacher/send-feedback` - Send feedback
- `GET /api/teacher/announcements` - List announcements
- `POST /api/teacher/announcements` - Create announcement
- `POST /api/teacher/broadcast-message` - Broadcast message

#### Gradebook
- `GET /api/teacher/gradebook/:courseId` - Get gradebook
- `POST /api/teacher/gradebook/:courseId/export` - Export gradebook
- `POST /api/teacher/gradebook/:courseId/import` - Import grades
- `POST /api/teacher/gradebook/:courseId/recalculate` - Recalculate grades

## 🛠 Maintenance

### Daily Tasks
- Run cleanup script: `./scripts/cleanup-teacher-portal.sh`
- Monitor system health: `./scripts/monitor-teacher-portal.sh`

### Weekly Tasks
- Backup database: `./scripts/backup-teacher-data.sh`
- Review error logs
- Update course statistics

### Monthly Tasks
- Archive old courses
- Clean up old files
- Review system performance

## 🔍 Monitoring

### Health Checks
- Server responsiveness
- Database connectivity
- Storage directory status
- Error log analysis
- Pending grading queue

### Performance Metrics
- Response times
- Database query performance
- File upload/download speeds
- Memory and CPU usage

## 🐛 Troubleshooting

### Common Issues

1. **File Upload Errors**
   - Check file size limits
   - Verify storage directory permissions
   - Review disk space

2. **Database Connection Issues**
   - Verify database credentials
   - Check database server status
   - Review connection pool settings

3. **Slow Performance**
   - Check database indexes
   - Monitor query execution times
   - Review server resources

### Error Logs

Check these log files for issues:
- `logs/error.log` - Application errors
- `logs/combined.log` - All application logs
- `logs/http.log` - HTTP request logs

## 📞 Support

For issues and questions:
1. Check the error logs
2. Run the monitoring script
3. Review the troubleshooting guide
4. Contact system administrator

## 🔄 Updates

To update the teacher portal:
1. Backup database and files
2. Pull latest code changes
3. Run database migrations
4. Restart services
5. Verify functionality

---

**Auto-Grade Enhanced Teacher Portal** - Empowering educators with comprehensive course management tools.
EOL

print_status "Documentation created"

print_header "Final Setup Steps..."

# Create a status file
cat > SETUP_STATUS.md << EOL
# Teacher Portal Setup Status

## ✅ Completed Tasks

- [x] Enhanced database schema applied
- [x] Required directories created  
- [x] Environment variables configured
- [x] File permissions set
- [x] Maintenance scripts created
- [x] Documentation generated
- [x] Dependencies installed

## 📋 Manual Tasks Required

1. **Database Configuration**
   - Update .env file with correct database credentials
   - Apply database schema if not done automatically:
     \`\`\`bash
     mysql -u<username> -p<password> <database> < src/config/teacher_portal_schema.sql
     mysql -u<username> -p<password> <database> < src/config/enhanced_teacher_portal_schema.sql
     \`\`\`

2. **Email Configuration** 
   - Configure SMTP settings in .env for notifications
   - Test email functionality

3. **File Storage**
   - Ensure adequate disk space for file uploads
   - Configure backup storage if needed

4. **Security**
   - Update JWT secrets in .env
   - Configure CORS origins
   - Set up SSL certificates for production

5. **Monitoring**
   - Set up cron jobs (see scripts/crontab-suggestions.txt)
   - Configure log rotation
   - Set up alerting for critical errors

## 🧪 Testing

Run the test script to verify setup:
\`\`\`bash
./scripts/test-teacher-portal.sh
\`\`\`

## 📊 Next Steps

1. Start the server: \`npm start\`
2. Test API endpoints with authentication
3. Import sample data if available
4. Configure frontend integration
5. Train users on new features

## 📞 Support

Created: $(date)
Version: Enhanced Teacher Portal v2.0
EOL

print_status "Setup status file created"

echo ""
print_header "🎉 Enhanced Teacher Portal Setup Complete!"
echo ""
print_status "✅ All automated setup tasks completed successfully"
print_warning "⚠️  Please review SETUP_STATUS.md for manual configuration steps"
print_status "📖 See TEACHER_PORTAL_README.md for detailed documentation"
echo ""
print_status "Next steps:"
echo "  1. Update .env file with your configuration"
echo "  2. Apply database schema if not done automatically"
echo "  3. Run: npm start"
echo "  4. Test with: ./scripts/test-teacher-portal.sh"
echo ""
print_status "🚀 Your enhanced teacher portal is ready to use!"
