/**
 * Security Tests for Auto-Grader System
 * Tests authentication, authorization, input validation, and security headers
 */

const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');

describe('Security Tests', () => {
  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const protectedEndpoints = [
        '/api/student/dashboard',
        '/api/teacher/dashboard',
        '/api/admin/dashboard',
        '/api/courses',
        '/api/assignments'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body.message).toContain('unauthorized');
      }
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        '', // Empty token
        'null',
        'undefined'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/student/dashboard')
          .set('Authorization', token)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { id: 1, role: 'student' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should implement rate limiting on login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrong-password'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.message).toContain('rate limit');
    });

    it('should implement account lockout after failed attempts', async () => {
      const loginData = {
        email: 'lockout-test@example.com',
        password: 'wrong-password'
      };

      // Make multiple failed login attempts for the same account
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);
      }

      // Account should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(423);

      expect(response.body.message).toContain('locked');
    });
  });

  describe('Authorization Security', () => {
    let studentToken, teacherToken, adminToken;

    beforeAll(async () => {
      // Create tokens for different roles
      studentToken = jwt.sign({ id: 1, role: 'student' }, process.env.JWT_SECRET);
      teacherToken = jwt.sign({ id: 2, role: 'teacher' }, process.env.JWT_SECRET);
      adminToken = jwt.sign({ id: 3, role: 'admin' }, process.env.JWT_SECRET);
    });

    it('should prevent role escalation', async () => {
      // Student trying to access teacher endpoints
      await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      // Teacher trying to access admin endpoints
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);

      // Student trying to access admin endpoints
      await request(app)
        .get('/api/admin/system-config')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should prevent horizontal privilege escalation', async () => {
      // Student trying to access another student's data
      await request(app)
        .get('/api/student/profile/999') // Different student ID
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      // Teacher trying to access another teacher's courses
      await request(app)
        .get('/api/teacher/courses/999') // Different teacher's course
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });

    it('should enforce resource ownership', async () => {
      // Student trying to modify another student's submission
      await request(app)
        .put('/api/submissions/999') // Not their submission
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'modified content' })
        .expect(403);
    });
  });

  describe('Input Validation Security', () => {
    let validToken;

    beforeAll(() => {
      validToken = jwt.sign({ id: 1, role: 'student' }, process.env.JWT_SECRET);
    });

    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1'; UPDATE users SET role='admin' WHERE id=1; --",
        "1 UNION SELECT * FROM users",
        "'; EXEC xp_cmdshell('dir'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        await request(app)
          .get(`/api/courses/${payload}`)
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400); // Should return validation error, not 500
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//",
        '"><script>alert(/XSS/)</script>',
        '<svg/onload=alert(/XSS/)>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/assignments')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            title: payload,
            description: payload,
            content: payload
          });

        // Should either reject the input or sanitize it
        if (response.status === 201) {
          // If created, ensure XSS payload is sanitized
          expect(response.body.assignment.title).not.toContain('<script>');
          expect(response.body.assignment.description).not.toContain('<script>');
        } else {
          // Should be rejected with validation error
          expect(response.status).toBe(400);
        }
      }
    });

    it('should prevent NoSQL injection attacks', async () => {
      const noSqlPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$where": "function() { return true; }"}',
        '{"$regex": ".*"}',
        '{"$or": [{"a": 1}, {"b": 2}]}'
      ];

      for (const payload of noSqlPayloads) {
        await request(app)
          .get('/api/courses')
          .query({ filter: payload })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(res => {
            // Should not return all data or cause server error
            expect(res.status).not.toBe(500);
          });
      }
    });

    it('should validate file upload security', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00', type: 'application/x-executable' },
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
        { name: '../../../etc/passwd', content: 'root:x:0:0', type: 'text/plain' },
        { name: 'large-file.txt', content: 'A'.repeat(100 * 1024 * 1024), type: 'text/plain' } // 100MB
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${validToken}`)
          .attach('file', Buffer.from(file.content), {
            filename: file.name,
            contentType: file.type
          });

        // Should reject dangerous files
        if (['application/x-executable', 'application/x-php'].includes(file.type)) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('file type');
        }

        // Should reject files with path traversal
        if (file.name.includes('../')) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('filename');
        }

        // Should reject oversized files
        if (file.content.length > 50 * 1024 * 1024) { // Assuming 50MB limit
          expect(response.status).toBe(413);
        }
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['referrer-policy']).toBeDefined();
    });

    it('should not expose sensitive information in headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Should not expose server information
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive data in API responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      if (response.status === 200) {
        // Should not include password in response
        expect(response.body.user.password).toBeUndefined();
        expect(response.body.user.hashedPassword).toBeUndefined();
        
        // Should not include internal IDs or sensitive fields
        expect(response.body.user.internalId).toBeUndefined();
        expect(response.body.user.ssn).toBeUndefined();
      }
    });

    it('should hash passwords properly', async () => {
      const response = await request(app)
        .post('/api/auth/register/student')
        .send({
          email: 'security-test@example.com',
          password: 'TestPassword123!',
          firstName: 'Security',
          lastName: 'Test',
          identifier: 'SEC001'
        });

      if (response.status === 201) {
        // Password should not be returned in plain text
        expect(response.body.user.password).toBeUndefined();
        
        // Check in database that password is hashed
        const { pool } = require('../../src/config/database');
        const [users] = await pool.execute(
          'SELECT password FROM users WHERE email = ?',
          ['security-test@example.com']
        );
        
        if (users.length > 0) {
          const storedPassword = users[0].password;
          // Should be bcrypt hash
          expect(storedPassword).toMatch(/^\$2[aby]\$/);
          expect(storedPassword).not.toBe('TestPassword123!');
        }
      }
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens on logout', async () => {
      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session-test@example.com',
          password: 'TestPassword123!'
        });

      if (loginResponse.status === 200) {
        const { accessToken, refreshToken } = loginResponse.body.tokens;
        
        // Use the token
        await request(app)
          .get('/api/student/dashboard')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
        
        // Logout
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ refreshToken })
          .expect(200);
        
        // Token should be invalid after logout
        await request(app)
          .get('/api/student/dashboard')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(401);
        
        // Refresh token should also be invalid
        await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken })
          .expect(401);
      }
    });

    it('should implement proper session timeout', async () => {
      // Create a short-lived token
      const shortLivedToken = jwt.sign(
        { id: 1, role: 'student' },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' } // Very short expiry
      );

      // Wait a bit to ensure expiry
      await new Promise(resolve => setTimeout(resolve, 10));

      // Token should be expired
      await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(401);
    });
  });

  describe('CORS Security', () => {
    it('should implement proper CORS policy', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(200);

      // Should not allow requests from unauthorized origins
      const allowedOrigin = response.headers['access-control-allow-origin'];
      expect(allowedOrigin).not.toBe('http://malicious-site.com');
      expect(allowedOrigin).not.toBe('*');
    });

    it('should restrict allowed methods', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toBeDefined();
      expect(allowedMethods).not.toContain('TRACE');
      expect(allowedMethods).not.toContain('CONNECT');
    });
  });
});
