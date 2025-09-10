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
