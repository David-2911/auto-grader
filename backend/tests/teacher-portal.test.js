/**
 * Teacher Portal API Test Suite
 * Comprehensive testing for all teacher portal endpoints
 */

const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');

// Test configuration
const TEST_CONFIG = {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    testTeacherId: 1,
    testCourseId: 1,
    testStudentId: 2,
    testAssignmentId: 1,
    testSubmissionId: 1
};

// Generate test JWT token
const generateTestToken = (userId = TEST_CONFIG.testTeacherId, role = 'teacher') => {
    return jwt.sign(
        { 
            id: userId, 
            role: role,
            email: 'test.teacher@example.com'
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
};

describe('Teacher Portal API Tests', () => {
    let authToken;
    let testCourseId;
    let testAssignmentId;

    beforeAll(() => {
        authToken = generateTestToken();
    });

    // Authentication Middleware Tests
    describe('Authentication', () => {
        test('should reject requests without token', async () => {
            const response = await request(app)
                .get('/api/teacher/dashboard')
                .expect(401);
        });

        test('should reject requests with invalid token', async () => {
            const response = await request(app)
                .get('/api/teacher/dashboard')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        test('should accept requests with valid token', async () => {
            const response = await request(app)
                .get('/api/teacher/dashboard')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
        });
    });

    // Dashboard Tests
    describe('Dashboard', () => {
        test('GET /api/teacher/dashboard - should return dashboard data', async () => {
            const response = await request(app)
                .get('/api/teacher/dashboard')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('totalCourses');
            expect(response.body).toHaveProperty('totalStudents');
            expect(response.body).toHaveProperty('pendingGrading');
            expect(response.body).toHaveProperty('recentActivity');
        });
    });

    // Course Management Tests
    describe('Course Management', () => {
        test('GET /api/teacher/courses - should return teacher courses', async () => {
            const response = await request(app)
                .get('/api/teacher/courses')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.courses)).toBe(true);
        });

        test('POST /api/teacher/courses - should create new course', async () => {
            const courseData = {
                code: 'TEST101',
                title: 'Test Course',
                description: 'A test course for API testing',
                credits: 3,
                semester: 'Fall 2024',
                maxEnrollment: 30,
                department: 'Computer Science'
            };

            const response = await request(app)
                .post('/api/teacher/courses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(courseData)
                .expect(201);

            expect(response.body).toHaveProperty('courseId');
            testCourseId = response.body.courseId;
        });

        test('GET /api/teacher/courses/:id - should return course details', async () => {
            const response = await request(app)
                .get(`/api/teacher/courses/${testCourseId || TEST_CONFIG.testCourseId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('course');
            expect(response.body).toHaveProperty('statistics');
        });

        test('PUT /api/teacher/courses/:id - should update course', async () => {
            const updateData = {
                title: 'Updated Test Course',
                description: 'Updated description'
            };

            const response = await request(app)
                .put(`/api/teacher/courses/${testCourseId || TEST_CONFIG.testCourseId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.message).toContain('updated');
        });

        test('POST /api/teacher/courses/:id/duplicate - should duplicate course', async () => {
            const duplicateData = {
                newCode: 'TEST102',
                newTitle: 'Duplicated Test Course',
                newSemester: 'Spring 2025'
            };

            const response = await request(app)
                .post(`/api/teacher/courses/${testCourseId || TEST_CONFIG.testCourseId}/duplicate`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(duplicateData)
                .expect(201);

            expect(response.body).toHaveProperty('newCourseId');
        });
    });

    // Student Management Tests
    describe('Student Management', () => {
        test('GET /api/teacher/courses/:id/students - should return course students', async () => {
            const response = await request(app)
                .get(`/api/teacher/courses/${testCourseId || TEST_CONFIG.testCourseId}/students`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.students)).toBe(true);
        });

        test('POST /api/teacher/students/enroll - should enroll students', async () => {
            const enrollmentData = {
                courseId: testCourseId || TEST_CONFIG.testCourseId,
                studentIds: [TEST_CONFIG.testStudentId],
                enrollmentType: 'regular'
            };

            const response = await request(app)
                .post('/api/teacher/students/enroll')
                .set('Authorization', `Bearer ${authToken}`)
                .send(enrollmentData)
                .expect(200);

            expect(response.body.message).toContain('enrolled');
        });

        test('GET /api/teacher/students/:id/notes - should return student notes', async () => {
            const response = await request(app)
                .get(`/api/teacher/students/${TEST_CONFIG.testStudentId}/notes`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.notes)).toBe(true);
        });

        test('POST /api/teacher/students/:id/notes - should add student note', async () => {
            const noteData = {
                content: 'Test note for student',
                isPrivate: false,
                category: 'general'
            };

            const response = await request(app)
                .post(`/api/teacher/students/${TEST_CONFIG.testStudentId}/notes`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(noteData)
                .expect(201);

            expect(response.body.message).toContain('added');
        });

        test('POST /api/teacher/attendance/record - should record attendance', async () => {
            const attendanceData = {
                courseId: testCourseId || TEST_CONFIG.testCourseId,
                date: new Date().toISOString().split('T')[0],
                attendanceRecords: [
                    {
                        studentId: TEST_CONFIG.testStudentId,
                        status: 'present'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/teacher/attendance/record')
                .set('Authorization', `Bearer ${authToken}`)
                .send(attendanceData)
                .expect(200);

            expect(response.body.message).toContain('recorded');
        });
    });

    // Assignment Management Tests
    describe('Assignment Management', () => {
        test('GET /api/teacher/assignments - should return teacher assignments', async () => {
            const response = await request(app)
                .get('/api/teacher/assignments')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.assignments)).toBe(true);
        });

        test('POST /api/teacher/assignments - should create assignment', async () => {
            const assignmentData = {
                courseId: testCourseId || TEST_CONFIG.testCourseId,
                title: 'Test Assignment',
                description: 'A test assignment',
                totalPoints: 100,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                category: 'Programming',
                submissionFormat: 'code',
                gradingMethod: 'auto',
                gradingCriteria: [
                    {
                        name: 'Correctness',
                        description: 'Code produces correct output',
                        points: 60,
                        weight: 0.6
                    },
                    {
                        name: 'Style',
                        description: 'Code follows style guidelines',
                        points: 40,
                        weight: 0.4
                    }
                ]
            };

            const response = await request(app)
                .post('/api/teacher/assignments')
                .set('Authorization', `Bearer ${authToken}`)
                .send(assignmentData)
                .expect(201);

            expect(response.body).toHaveProperty('assignmentId');
            testAssignmentId = response.body.assignmentId;
        });

        test('GET /api/teacher/assignment-templates - should return templates', async () => {
            const response = await request(app)
                .get('/api/teacher/assignment-templates')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.templates)).toBe(true);
        });

        test('POST /api/teacher/assignments/:id/duplicate - should duplicate assignment', async () => {
            const duplicateData = {
                newTitle: 'Duplicated Test Assignment',
                newDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            };

            const response = await request(app)
                .post(`/api/teacher/assignments/${testAssignmentId || TEST_CONFIG.testAssignmentId}/duplicate`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(duplicateData)
                .expect(201);

            expect(response.body).toHaveProperty('newAssignmentId');
        });
    });

    // Grading Oversight Tests
    describe('Grading Oversight', () => {
        test('GET /api/teacher/assignments/:id/submissions - should return submissions', async () => {
            const response = await request(app)
                .get(`/api/teacher/assignments/${testAssignmentId || TEST_CONFIG.testAssignmentId}/submissions`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.submissions)).toBe(true);
        });

        test('POST /api/teacher/grade-submission - should grade submission', async () => {
            const gradingData = {
                submissionId: TEST_CONFIG.testSubmissionId,
                grade: 85,
                feedback: 'Good work, but could improve efficiency',
                criteriaGrades: [
                    {
                        criteriaId: 1,
                        points: 50,
                        feedback: 'Correct output achieved'
                    },
                    {
                        criteriaId: 2,
                        points: 35,
                        feedback: 'Code style needs improvement'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/teacher/grade-submission')
                .set('Authorization', `Bearer ${authToken}`)
                .send(gradingData)
                .expect(200);

            expect(response.body.message).toContain('graded');
        });

        test('POST /api/teacher/bulk-grade - should perform bulk grading', async () => {
            const bulkGradingData = {
                assignmentId: testAssignmentId || TEST_CONFIG.testAssignmentId,
                submissionIds: [TEST_CONFIG.testSubmissionId],
                gradingOptions: {
                    useMLGrading: true,
                    requireReview: false
                }
            };

            const response = await request(app)
                .post('/api/teacher/bulk-grade')
                .set('Authorization', `Bearer ${authToken}`)
                .send(bulkGradingData)
                .expect(200);

            expect(response.body.message).toContain('queued');
        });

        test('POST /api/teacher/request-regrade - should request regrading', async () => {
            const regradeData = {
                submissionId: TEST_CONFIG.testSubmissionId,
                reason: 'Student requested grade review',
                priority: 'normal',
                useLatestModel: true
            };

            const response = await request(app)
                .post('/api/teacher/request-regrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send(regradeData)
                .expect(200);

            expect(response.body.message).toContain('queued');
        });

        test('GET /api/teacher/grading-queue - should return grading queue', async () => {
            const response = await request(app)
                .get('/api/teacher/grading-queue')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.queue)).toBe(true);
        });
    });

    // Communication Tests
    describe('Communication', () => {
        test('POST /api/teacher/send-feedback - should send feedback', async () => {
            const feedbackData = {
                submissionId: TEST_CONFIG.testSubmissionId,
                message: 'Great work on this assignment!',
                isPrivate: false
            };

            const response = await request(app)
                .post('/api/teacher/send-feedback')
                .set('Authorization', `Bearer ${authToken}`)
                .send(feedbackData)
                .expect(200);

            expect(response.body.message).toContain('sent');
        });

        test('GET /api/teacher/announcements - should return announcements', async () => {
            const response = await request(app)
                .get('/api/teacher/announcements')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body.announcements)).toBe(true);
        });

        test('POST /api/teacher/announcements - should create announcement', async () => {
            const announcementData = {
                courseId: testCourseId || TEST_CONFIG.testCourseId,
                title: 'Test Announcement',
                content: 'This is a test announcement',
                priority: 'normal',
                isPublished: true,
                isPinned: false
            };

            const response = await request(app)
                .post('/api/teacher/announcements')
                .set('Authorization', `Bearer ${authToken}`)
                .send(announcementData)
                .expect(201);

            expect(response.body).toHaveProperty('announcementId');
        });

        test('POST /api/teacher/broadcast-message - should broadcast message', async () => {
            const messageData = {
                courseId: testCourseId || TEST_CONFIG.testCourseId,
                subject: 'Test Message',
                message: 'This is a test broadcast message',
                recipientType: 'all_students'
            };

            const response = await request(app)
                .post('/api/teacher/broadcast-message')
                .set('Authorization', `Bearer ${authToken}`)
                .send(messageData)
                .expect(200);

            expect(response.body.message).toContain('sent');
        });
    });

    // Gradebook Tests
    describe('Gradebook Management', () => {
        test('GET /api/teacher/gradebook/:courseId - should return gradebook', async () => {
            const response = await request(app)
                .get(`/api/teacher/gradebook/${testCourseId || TEST_CONFIG.testCourseId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('students');
            expect(response.body).toHaveProperty('assignments');
            expect(response.body).toHaveProperty('statistics');
        });

        test('POST /api/teacher/gradebook/:courseId/export - should export gradebook', async () => {
            const exportData = {
                format: 'csv',
                includeComments: true,
                includeStatistics: true
            };

            const response = await request(app)
                .post(`/api/teacher/gradebook/${testCourseId || TEST_CONFIG.testCourseId}/export`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(exportData)
                .expect(200);

            expect(response.body).toHaveProperty('downloadUrl');
        });

        test('POST /api/teacher/gradebook/:courseId/recalculate - should recalculate grades', async () => {
            const response = await request(app)
                .post(`/api/teacher/gradebook/${testCourseId || TEST_CONFIG.testCourseId}/recalculate`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toContain('recalculated');
        });

        test('GET /api/teacher/gradebook/:courseId/statistics - should return statistics', async () => {
            const response = await request(app)
                .get(`/api/teacher/gradebook/${testCourseId || TEST_CONFIG.testCourseId}/statistics`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('classAverage');
            expect(response.body).toHaveProperty('gradeDistribution');
        });
    });

    // Analytics Tests
    describe('Analytics', () => {
        test('GET /api/teacher/analytics/dashboard - should return analytics dashboard', async () => {
            const response = await request(app)
                .get('/api/teacher/analytics/dashboard')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('overview');
            expect(response.body).toHaveProperty('trends');
        });

        test('GET /api/teacher/analytics/course/:id - should return course analytics', async () => {
            const response = await request(app)
                .get(`/api/teacher/analytics/course/${testCourseId || TEST_CONFIG.testCourseId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('performance');
            expect(response.body).toHaveProperty('engagement');
        });

        test('GET /api/teacher/analytics/assignment/:id - should return assignment analytics', async () => {
            const response = await request(app)
                .get(`/api/teacher/analytics/assignment/${testAssignmentId || TEST_CONFIG.testAssignmentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('submissionStats');
            expect(response.body).toHaveProperty('gradeDistribution');
        });

        test('GET /api/teacher/analytics/student/:id - should return student analytics', async () => {
            const response = await request(app)
                .get(`/api/teacher/analytics/student/${TEST_CONFIG.testStudentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('performance');
            expect(response.body).toHaveProperty('progress');
        });
    });

    // Error Handling Tests
    describe('Error Handling', () => {
        test('should handle invalid course ID', async () => {
            const response = await request(app)
                .get('/api/teacher/courses/99999')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        test('should handle invalid assignment ID', async () => {
            const response = await request(app)
                .get('/api/teacher/assignments/99999/submissions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        test('should validate required fields for course creation', async () => {
            const invalidCourseData = {
                // Missing required fields
                title: 'Incomplete Course'
            };

            const response = await request(app)
                .post('/api/teacher/courses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidCourseData)
                .expect(400);

            expect(response.body.message).toContain('validation');
        });

        test('should handle unauthorized access to other teacher data', async () => {
            const otherTeacherToken = generateTestToken(999, 'teacher');
            
            const response = await request(app)
                .get(`/api/teacher/courses/${testCourseId || TEST_CONFIG.testCourseId}`)
                .set('Authorization', `Bearer ${otherTeacherToken}`)
                .expect(403);

            expect(response.body.message).toContain('access denied');
        });
    });

    // Performance Tests
    describe('Performance', () => {
        test('dashboard should respond quickly', async () => {
            const startTime = Date.now();
            
            await request(app)
                .get('/api/teacher/dashboard')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        });

        test('gradebook should handle large datasets', async () => {
            const startTime = Date.now();
            
            await request(app)
                .get(`/api/teacher/gradebook/${testCourseId || TEST_CONFIG.testCourseId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
        });
    });

    // Cleanup
    afterAll(async () => {
        // Clean up test data if needed
        if (testCourseId) {
            await request(app)
                .delete(`/api/teacher/courses/${testCourseId}`)
                .set('Authorization', `Bearer ${authToken}`);
        }
        
        if (testAssignmentId) {
            await request(app)
                .delete(`/api/teacher/assignments/${testAssignmentId}`)
                .set('Authorization', `Bearer ${authToken}`);
        }
    });
});

// Helper functions for specific test scenarios
const TestHelpers = {
    createSampleCourse: async (authToken) => {
        const courseData = {
            code: 'SAMPLE101',
            title: 'Sample Course',
            description: 'A sample course for testing',
            credits: 3,
            semester: 'Test Semester'
        };

        const response = await request(app)
            .post('/api/teacher/courses')
            .set('Authorization', `Bearer ${authToken}`)
            .send(courseData);

        return response.body.courseId;
    },

    createSampleAssignment: async (authToken, courseId) => {
        const assignmentData = {
            courseId: courseId,
            title: 'Sample Assignment',
            description: 'A sample assignment for testing',
            totalPoints: 100,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        const response = await request(app)
            .post('/api/teacher/assignments')
            .set('Authorization', `Bearer ${authToken}`)
            .send(assignmentData);

        return response.body.assignmentId;
    },

    createSampleSubmission: async (authToken, assignmentId, studentId) => {
        // This would typically be done by a student, but for testing purposes
        const submissionData = {
            assignmentId: assignmentId,
            studentId: studentId,
            content: 'Sample submission content'
        };

        const response = await request(app)
            .post('/api/submissions')
            .set('Authorization', `Bearer ${authToken}`)
            .send(submissionData);

        return response.body.submissionId;
    }
};

module.exports = {
    TestHelpers,
    generateTestToken,
    TEST_CONFIG
};
