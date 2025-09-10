// MSW handlers for API mocking
import { http, HttpResponse } from 'msw';
import { testUtils, TEST_CONSTANTS } from '../setup';

const API_BASE = TEST_CONSTANTS.API_BASE_URL;

export const handlers = [
  // Auth handlers
  http.post(`${API_BASE}/auth/register/student`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (!body.email || !body.password) {
      return HttpResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }

    const user = testUtils.createMockUser({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: 'student'
    });

    const tokens = testUtils.createMockTokens();

    return HttpResponse.json({
      success: true,
      message: 'Student registered successfully',
      user,
      tokens
    });
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.email === 'valid@example.com' && body.password === 'ValidPassword123!') {
      const user = testUtils.createMockUser({ email: body.email });
      const tokens = testUtils.createMockTokens();
      
      return HttpResponse.json({
        success: true,
        message: 'Login successful',
        user,
        tokens
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  }),

  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.refreshToken === 'valid-refresh-token') {
      const tokens = testUtils.createMockTokens();
      return HttpResponse.json({
        success: true,
        tokens
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Invalid refresh token' },
      { status: 401 }
    );
  }),

  // User handlers
  http.get(`${API_BASE}/user/profile`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = testUtils.createMockUser();
    return HttpResponse.json({
      success: true,
      user
    });
  }),

  // Course handlers
  http.get(`${API_BASE}/courses`, () => {
    const courses = [
      testUtils.createMockCourse({ id: 1, code: 'CS101' }),
      testUtils.createMockCourse({ id: 2, code: 'CS102' })
    ];

    return HttpResponse.json({
      success: true,
      courses
    });
  }),

  http.get(`${API_BASE}/courses/:id`, ({ params }) => {
    const course = testUtils.createMockCourse({ id: Number(params.id) });
    
    return HttpResponse.json({
      success: true,
      course
    });
  }),

  http.post(`${API_BASE}/courses`, async ({ request }) => {
    const body = await request.json() as any;
    const course = testUtils.createMockCourse({
      id: Math.floor(Math.random() * 1000),
      ...body
    });

    return HttpResponse.json({
      success: true,
      message: 'Course created successfully',
      course
    }, { status: 201 });
  }),

  // Assignment handlers
  http.get(`${API_BASE}/assignments`, () => {
    const assignments = [
      testUtils.createMockAssignment({ id: 1, title: 'Assignment 1' }),
      testUtils.createMockAssignment({ id: 2, title: 'Assignment 2' })
    ];

    return HttpResponse.json({
      success: true,
      assignments
    });
  }),

  http.get(`${API_BASE}/assignments/:id`, ({ params }) => {
    const assignment = testUtils.createMockAssignment({ id: Number(params.id) });
    
    return HttpResponse.json({
      success: true,
      assignment
    });
  }),

  http.post(`${API_BASE}/assignments`, async ({ request }) => {
    const body = await request.json() as any;
    const assignment = testUtils.createMockAssignment({
      id: Math.floor(Math.random() * 1000),
      ...body
    });

    return HttpResponse.json({
      success: true,
      message: 'Assignment created successfully',
      assignment
    }, { status: 201 });
  }),

  // Submission handlers
  http.get(`${API_BASE}/submissions`, () => {
    const submissions = [
      testUtils.createMockSubmission({ id: 1 }),
      testUtils.createMockSubmission({ id: 2 })
    ];

    return HttpResponse.json({
      success: true,
      submissions
    });
  }),

  http.post(`${API_BASE}/submissions`, async ({ request }) => {
    const formData = await request.formData();
    const assignmentId = formData.get('assignmentId');
    const file = formData.get('file') as File;
    
    if (!assignmentId || !file) {
      return HttpResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const submission = testUtils.createMockSubmission({
      id: Math.floor(Math.random() * 1000),
      assignmentId: Number(assignmentId),
      fileName: file.name,
      fileSize: file.size
    });

    return HttpResponse.json({
      success: true,
      message: 'Submission uploaded successfully',
      submission
    }, { status: 201 });
  }),

  // Grading handlers
  http.get(`${API_BASE}/grades`, () => {
    const grades = [
      { id: 1, submissionId: 1, score: 85, feedback: 'Good work!' },
      { id: 2, submissionId: 2, score: 92, feedback: 'Excellent!' }
    ];

    return HttpResponse.json({
      success: true,
      grades
    });
  }),

  // Dashboard handlers
  http.get(`${API_BASE}/student/dashboard`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        enrolledCourses: 3,
        pendingAssignments: 2,
        recentGrades: [
          { assignment: 'Assignment 1', score: 85 },
          { assignment: 'Assignment 2', score: 92 }
        ],
        upcomingDeadlines: [
          { title: 'Assignment 3', deadline: '2024-12-15' }
        ]
      }
    });
  }),

  http.get(`${API_BASE}/teacher/dashboard`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalCourses: 2,
        totalStudents: 45,
        pendingGrading: 8,
        recentActivity: [
          { type: 'submission', message: 'New submission from John Doe' },
          { type: 'grade', message: 'Graded assignment for CS101' }
        ]
      }
    });
  }),

  http.get(`${API_BASE}/admin/dashboard`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalUsers: 150,
        totalCourses: 25,
        systemHealth: 'good',
        recentActivity: [
          { type: 'user', message: 'New teacher registered' },
          { type: 'system', message: 'Database backup completed' }
        ]
      }
    });
  }),

  // File upload handlers
  http.post(`${API_BASE}/upload`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return HttpResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: Math.floor(Math.random() * 1000),
        name: file.name,
        size: file.size,
        type: file.type,
        url: `http://localhost:5000/uploads/${file.name}`
      }
    });
  }),

  // Error simulation handlers
  http.get(`${API_BASE}/error/500`, () => {
    return HttpResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }),

  http.get(`${API_BASE}/error/timeout`, () => {
    // Simulate network timeout
    return new Promise(() => {
      // This promise never resolves, simulating a timeout
    });
  }),

  // Catch-all handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { success: false, message: 'Endpoint not found' },
      { status: 404 }
    );
  })
];
