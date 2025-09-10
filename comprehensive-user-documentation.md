# Auto-Grader System: Comprehensive User Documentation

## Table of Contents
1. [Getting Started](#getting-started)
2. [Administrator Guide](#administrator-guide)
3. [Teacher User Guide](#teacher-user-guide)
4. [Student Guide](#student-guide)
5. [API Documentation](#api-documentation)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Training Programs](#training-programs)

## Getting Started

### System Overview
The Auto-Grader system is an educational platform that automates the grading process using OCR (Optical Character Recognition) and Machine Learning technologies. The system supports three user roles:

- **Administrators**: System management and configuration
- **Teachers**: Course and assignment management
- **Students**: Assignment submission and feedback review

### System Requirements
- **Supported Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **File Formats**: PDF, DOCX, TXT for submissions
- **Maximum File Size**: 50MB per submission
- **Internet Connection**: Stable broadband connection recommended

### Account Types and Permissions

| Feature | Administrator | Teacher | Student |
|---------|---------------|---------|---------|
| User Management | ✅ | ❌ | ❌ |
| System Configuration | ✅ | ❌ | ❌ |
| Course Creation | ✅ | ✅ | ❌ |
| Assignment Management | ✅ | ✅ | ❌ |
| Grade Management | ✅ | ✅ | View Only |
| Submission Management | ✅ | ✅ | Own Only |
| Reports and Analytics | ✅ | Course Only | Own Only |

## Administrator Guide

### Initial System Setup

#### 1. First Login
- Navigate to the admin panel: `https://your-domain.com/admin`
- Use the default administrator credentials (change immediately after first login)
- Complete the initial system configuration wizard

#### 2. System Configuration
```javascript
// System Configuration Options
{
  "general": {
    "institutionName": "Your Institution Name",
    "timeZone": "America/New_York",
    "language": "en-US",
    "maxFileSize": "50MB",
    "sessionTimeout": "8 hours"
  },
  "authentication": {
    "passwordPolicy": {
      "minLength": 8,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSpecialChars": true
    },
    "mfaEnabled": false,
    "sessionManagement": {
      "maxConcurrentSessions": 3,
      "rememberMeDuration": "30 days"
    }
  },
  "grading": {
    "autoGradingEnabled": true,
    "mlModelVersion": "v2.1",
    "confidenceThreshold": 0.85,
    "manualReviewThreshold": 0.70
  }
}
```

#### 3. User Management
- **Create Users**: Bulk import via CSV or individual creation
- **Assign Roles**: Administrator, Teacher, Student
- **Manage Permissions**: Course-specific access controls
- **Monitor Activity**: User login logs and activity tracking

#### 4. Course Management
- **Create Courses**: Set up course structure and enrollment
- **Assign Teachers**: Designate course instructors
- **Configure Settings**: Grading policies, submission deadlines
- **Monitor Performance**: Course-level analytics and reporting

### Administrative Tasks

#### User Account Management
```bash
# Bulk User Import CSV Format
email,firstName,lastName,role,courseCode
john.doe@university.edu,John,Doe,student,CS101
jane.smith@university.edu,Jane,Smith,teacher,CS101
admin@university.edu,Admin,User,administrator,
```

#### System Monitoring
- **Performance Metrics**: Response times, error rates, system load
- **User Activity**: Login patterns, feature usage, support requests
- **Storage Usage**: File storage consumption and cleanup policies
- **Security Events**: Failed login attempts, suspicious activity

#### Backup and Maintenance
- **Automated Backups**: Daily database and file backups
- **System Updates**: Security patches and feature updates
- **Data Retention**: Configurable retention policies
- **Disaster Recovery**: Backup restoration procedures

### Troubleshooting Common Issues

#### Performance Issues
1. **Slow Response Times**
   - Check system resources (CPU, memory, disk)
   - Review database query performance
   - Analyze network connectivity
   - Consider scaling resources

2. **High Error Rates**
   - Review application logs for error patterns
   - Check external service dependencies
   - Verify database connectivity
   - Monitor file storage availability

#### User Access Issues
1. **Login Problems**
   - Verify user account status
   - Check password reset functionality
   - Review authentication logs
   - Test SSO configuration if applicable

2. **Permission Errors**
   - Verify role assignments
   - Check course enrollments
   - Review access control lists
   - Validate session management

## Teacher User Guide

### Getting Started as a Teacher

#### 1. First Login and Profile Setup
- Log in with your provided credentials
- Complete your profile information
- Set up notification preferences
- Review available courses

#### 2. Dashboard Overview
The teacher dashboard provides:
- **Course Summary**: Enrolled courses and student counts
- **Recent Activity**: Latest submissions and grading tasks
- **Pending Tasks**: Assignments requiring attention
- **Performance Metrics**: Course performance overview

### Course Management

#### 1. Creating a New Course
```javascript
// Course Creation Form
{
  "courseCode": "CS101",
  "courseName": "Introduction to Computer Science",
  "description": "Fundamental concepts of computer science",
  "semester": "Fall 2025",
  "maxStudents": 150,
  "grading": {
    "scale": "letter", // letter, percentage, points
    "passingGrade": 70,
    "latePenalty": 5 // percentage per day
  }
}
```

#### 2. Student Enrollment
- **Manual Enrollment**: Add students individually
- **Bulk Enrollment**: Import student lists via CSV
- **Self-Enrollment**: Provide course code for student registration
- **Enrollment Management**: Monitor and modify enrollment status

#### 3. Course Settings
- **Grading Policies**: Configure grading scales and policies
- **Submission Rules**: Set file format and size restrictions
- **Notification Settings**: Configure automated notifications
- **Assignment Templates**: Create reusable assignment templates

### Assignment Management

#### 1. Creating Assignments
```javascript
// Assignment Configuration
{
  "title": "Programming Assignment 1",
  "description": "Implement basic sorting algorithms",
  "type": "programming", // essay, multiple-choice, programming
  "dueDate": "2025-10-15T23:59:59Z",
  "points": 100,
  "submissions": {
    "allowedFormats": ["pdf", "docx", "txt"],
    "maxFileSize": "10MB",
    "allowLateSubmissions": true,
    "lateDeadline": "2025-10-17T23:59:59Z"
  },
  "grading": {
    "autoGradeEnabled": true,
    "rubric": [
      {
        "criterion": "Code Quality",
        "points": 30,
        "description": "Code organization and style"
      },
      {
        "criterion": "Correctness",
        "points": 50,
        "description": "Algorithm implementation correctness"
      },
      {
        "criterion": "Documentation",
        "points": 20,
        "description": "Code comments and documentation"
      }
    ]
  }
}
```

#### 2. Grading Workflows
- **Automated Grading**: ML-powered initial grading
- **Manual Review**: Review and adjust automated grades
- **Rubric-Based Grading**: Detailed criterion-based evaluation
- **Batch Grading**: Process multiple submissions efficiently

#### 3. Feedback Management
- **Individual Feedback**: Personalized comments for students
- **Rubric Feedback**: Criterion-specific feedback
- **Audio/Video Feedback**: Rich media feedback options
- **Feedback Templates**: Reusable feedback snippets

### Grading and Assessment

#### 1. Grading Interface
The grading interface provides:
- **Submission Preview**: Document viewer with annotation tools
- **Grading Panel**: Rubric-based scoring interface
- **AI Suggestions**: ML-powered grading recommendations
- **Comparison View**: Side-by-side submission comparison

#### 2. Grade Management
- **Grade Book**: Comprehensive grade tracking
- **Grade Export**: Export grades to CSV or LMS
- **Grade Statistics**: Class performance analytics
- **Grade Distribution**: Visual grade distribution charts

#### 3. Student Communication
- **Announcement System**: Course-wide announcements
- **Individual Messaging**: Direct student communication
- **Email Notifications**: Automated email updates
- **Discussion Forums**: Course discussion boards

### Reports and Analytics

#### 1. Course Performance Reports
- **Submission Statistics**: Submission rates and timeliness
- **Grade Distribution**: Grade patterns and trends
- **Student Progress**: Individual student tracking
- **Assignment Analysis**: Assignment difficulty and performance

#### 2. Engagement Analytics
- **Login Activity**: Student engagement patterns
- **Feature Usage**: Platform feature utilization
- **Time Tracking**: Time spent on assignments
- **Help Requests**: Support request patterns

## Student Guide

### Getting Started as a Student

#### 1. Account Setup
- Receive login credentials from your instructor
- Complete your student profile
- Set notification preferences
- Join your courses using provided course codes

#### 2. Dashboard Navigation
The student dashboard shows:
- **Enrolled Courses**: Your current courses
- **Upcoming Assignments**: Due dates and requirements
- **Recent Grades**: Latest graded submissions
- **Announcements**: Important course updates

### Assignment Submission

#### 1. Viewing Assignments
- **Assignment List**: All assignments by course
- **Assignment Details**: Requirements and due dates
- **Submission History**: Previous submissions and grades
- **Rubric Preview**: Grading criteria and expectations

#### 2. Submitting Assignments
```javascript
// Submission Process
{
  "steps": [
    "Navigate to assignment page",
    "Review submission requirements",
    "Prepare your file (PDF, DOCX, or TXT)",
    "Upload file through submission interface",
    "Add submission comments if needed",
    "Review and confirm submission",
    "Receive submission confirmation"
  ],
  "tips": [
    "Submit early to avoid technical issues",
    "Keep file sizes under the limit",
    "Use clear, descriptive file names",
    "Double-check file content before submission"
  ]
}
```

#### 3. File Preparation Guidelines
- **PDF Files**: Ensure text is selectable (not scanned images)
- **Document Files**: Use standard fonts and formatting
- **Code Submissions**: Include proper indentation and comments
- **File Naming**: Use format: LastName_FirstName_Assignment#.ext

### Viewing Grades and Feedback

#### 1. Grade Access
- **Grade Book**: View all course grades
- **Assignment Grades**: Detailed score breakdown
- **Grade History**: Track grade improvements over time
- **GPA Calculation**: Automated GPA computation

#### 2. Feedback Review
- **Rubric Scores**: Detailed criterion-based feedback
- **Written Comments**: Instructor's written feedback
- **Annotated Documents**: Document markup and comments
- **Improvement Suggestions**: Specific improvement recommendations

#### 3. Grade Appeals
If you need to appeal a grade:
1. Review the grading rubric and feedback
2. Prepare a written explanation of your concern
3. Submit appeal through the grade appeal system
4. Wait for instructor review and response

### Communication and Support

#### 1. Instructor Communication
- **Office Hours**: Virtual or in-person availability
- **Messaging System**: Direct instructor communication
- **Discussion Forums**: Class-wide discussions
- **Email Notifications**: Automatic updates and reminders

#### 2. Technical Support
- **Help Documentation**: Comprehensive user guides
- **Video Tutorials**: Step-by-step instructional videos
- **Support Tickets**: Technical issue reporting
- **FAQ Section**: Common questions and answers

## API Documentation

### Authentication

#### 1. User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}

Response:
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Course Management

#### 1. Create Course
```http
POST /api/courses
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "CS101",
  "name": "Introduction to Computer Science",
  "description": "Fundamental concepts",
  "semester": "Fall 2025",
  "maxStudents": 150
}
```

#### 2. Get Course Details
```http
GET /api/courses/{courseId}
Authorization: Bearer {token}

Response:
{
  "id": 1,
  "code": "CS101",
  "name": "Introduction to Computer Science",
  "description": "Fundamental concepts",
  "instructor": {
    "id": 456,
    "name": "Dr. Jane Smith"
  },
  "students": 47,
  "assignments": 12
}
```

### Assignment Management

#### 1. Create Assignment
```http
POST /api/assignments
Authorization: Bearer {token}
Content-Type: application/json

{
  "courseId": 1,
  "title": "Programming Assignment 1",
  "description": "Implement sorting algorithms",
  "dueDate": "2025-10-15T23:59:59Z",
  "points": 100,
  "rubric": [
    {
      "criterion": "Code Quality",
      "points": 30
    },
    {
      "criterion": "Correctness", 
      "points": 50
    }
  ]
}
```

#### 2. Submit Assignment
```http
POST /api/assignments/{assignmentId}/submit
Authorization: Bearer {token}
Content-Type: multipart/form-data

submissionFile: (binary file data)
comments: "This is my submission for assignment 1"
```

### Grading

#### 1. Auto-Grade Submission
```http
POST /api/grading/auto-grade
Authorization: Bearer {token}
Content-Type: application/json

{
  "submissionId": 789,
  "assignmentId": 123
}

Response:
{
  "submissionId": 789,
  "grade": 85,
  "confidence": 0.92,
  "rubricScores": [
    {
      "criterion": "Code Quality",
      "score": 25,
      "maxScore": 30
    },
    {
      "criterion": "Correctness",
      "score": 45,
      "maxScore": 50
    }
  ],
  "feedback": "Good implementation with minor style issues"
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Login Problems

**Issue**: Cannot log in to the system
**Possible Causes**:
- Incorrect username/password
- Account not activated
- Session timeout
- Browser cache issues

**Solutions**:
1. Verify credentials with administrator
2. Clear browser cache and cookies
3. Try password reset if available
4. Use incognito/private browsing mode
5. Contact technical support

#### 2. File Upload Issues

**Issue**: Cannot upload assignment files
**Possible Causes**:
- File size exceeds limit
- Unsupported file format
- Network connectivity issues
- Browser compatibility

**Solutions**:
1. Check file size (max 50MB)
2. Convert to supported format (PDF, DOCX, TXT)
3. Test network connection
4. Try different browser
5. Compress large files

#### 3. Grading Issues

**Issue**: Grades not appearing or incorrect
**Possible Causes**:
- Grading still in progress
- Technical error in grading system
- Assignment not properly submitted
- Display/cache issues

**Solutions**:
1. Wait for grading to complete
2. Refresh the page
3. Verify submission was successful
4. Contact instructor if grade appears incorrect
5. Clear browser cache

#### 4. Performance Issues

**Issue**: System running slowly
**Possible Causes**:
- High system load
- Network congestion
- Large file processing
- Browser issues

**Solutions**:
1. Try during off-peak hours
2. Close unnecessary browser tabs
3. Check internet connection speed
4. Use wired connection if available
5. Contact support if persistent

### Error Codes and Messages

| Error Code | Message | Solution |
|------------|---------|----------|
| 400 | Bad Request | Check input format and try again |
| 401 | Unauthorized | Log in again or contact administrator |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource may have been deleted |
| 413 | File Too Large | Reduce file size or compress |
| 429 | Too Many Requests | Wait and try again later |
| 500 | Server Error | Contact technical support |

## Training Programs

### Administrator Training

#### Module 1: System Overview (2 hours)
- Auto-Grader architecture and components
- User roles and permissions
- Security features and best practices
- Integration capabilities

#### Module 2: User Management (1.5 hours)
- Creating and managing user accounts
- Role assignment and permissions
- Bulk user operations
- Account troubleshooting

#### Module 3: System Configuration (2 hours)
- Global system settings
- Course and grading policies
- File storage and backup
- Monitoring and analytics

#### Module 4: Troubleshooting and Support (1.5 hours)
- Common issues and solutions
- Log analysis and debugging
- User support procedures
- Escalation processes

### Teacher Training

#### Module 1: Getting Started (1 hour)
- Platform navigation
- Profile setup and preferences
- Dashboard overview
- Basic course management

#### Module 2: Course and Assignment Management (2 hours)
- Creating and configuring courses
- Student enrollment procedures
- Assignment creation and configuration
- Rubric development

#### Module 3: Grading and Feedback (2 hours)
- Automated grading system
- Manual grading procedures
- Providing effective feedback
- Grade management and export

#### Module 4: Analytics and Reporting (1 hour)
- Understanding course analytics
- Student performance tracking
- Generating reports
- Data-driven instruction

### Student Orientation

#### Module 1: Platform Introduction (30 minutes)
- Account setup and login
- Dashboard navigation
- Basic features overview
- Getting help and support

#### Module 2: Assignment Submission (45 minutes)
- Finding and viewing assignments
- File preparation guidelines
- Submission process
- Tracking submission status

#### Module 3: Grades and Feedback (30 minutes)
- Accessing grades and feedback
- Understanding rubric scores
- Improving based on feedback
- Grade appeal process

### Support Training

#### Module 1: Platform Knowledge (2 hours)
- Complete system functionality
- User roles and workflows
- Common use cases
- Feature capabilities

#### Module 2: Troubleshooting Skills (2 hours)
- Diagnostic procedures
- Common issues and solutions
- Log analysis basics
- Escalation criteria

#### Module 3: Customer Service (1 hour)
- Communication best practices
- Documentation requirements
- Follow-up procedures
- User satisfaction metrics

### Training Materials

#### Documentation
- User manuals (PDF and online)
- Video tutorials
- Quick reference guides
- FAQ collections

#### Interactive Training
- Hands-on workshops
- Webinar sessions
- Practice environments
- Certification programs

#### Ongoing Support
- Regular training updates
- Best practice sharing
- User feedback integration
- Continuous improvement
