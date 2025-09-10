/**
 * Integration tests for ML Service
 * Tests OCR processing, grading algorithms, and model predictions
 */

const path = require('path');
const fs = require('fs');
const mlService = require('../../../ml/services/ml.service');
const { setupTestDatabase, seedTestData, cleanupTestData } = require('../setup');

describe('ML Service Integration Tests', () => {
  const testDataPath = path.join(__dirname, '../../fixtures/data');
  const testFilesPath = path.join(__dirname, '../../fixtures/files');

  beforeAll(async () => {
    await setupTestDatabase();
    await seedTestData();
    
    // Ensure test directories exist
    if (!fs.existsSync(testDataPath)) {
      fs.mkdirSync(testDataPath, { recursive: true });
    }
    if (!fs.existsSync(testFilesPath)) {
      fs.mkdirSync(testFilesPath, { recursive: true });
    }
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('OCR Processing', () => {
    let testPdfPath, testImagePath;

    beforeAll(() => {
      // Create test PDF content
      testPdfPath = path.join(testFilesPath, 'test-submission.pdf');
      testImagePath = path.join(testFilesPath, 'test-handwriting.jpg');
      
      // Note: In a real implementation, you would have actual test files
      // For this example, we'll create placeholder files
      fs.writeFileSync(testPdfPath, 'Mock PDF content');
      fs.writeFileSync(testImagePath, 'Mock image content');
    });

    it('should extract text from PDF documents', async () => {
      // Arrange
      const mockSubmission = {
        id: 1,
        filePath: testPdfPath,
        fileType: 'pdf'
      };

      // Act
      const result = await mlService.processOCR(mockSubmission);

      // Assert
      expect(result).toMatchObject({
        text: expect.any(String),
        confidence: expect.any(Number),
        pages: expect.any(Number),
        processedAt: expect.any(String)
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.pages).toBeGreaterThan(0);
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should process handwritten submissions', async () => {
      // Arrange
      const mockSubmission = {
        id: 2,
        filePath: testImagePath,
        fileType: 'image'
      };

      // Act
      const result = await mlService.processOCR(mockSubmission);

      // Assert
      expect(result).toMatchObject({
        text: expect.any(String),
        confidence: expect.any(Number),
        handwritingDetected: true,
        processedAt: expect.any(String)
      });

      // Handwriting OCR typically has lower confidence
      expect(result.confidence).toBeLessThan(0.95);
    });

    it('should handle OCR processing errors gracefully', async () => {
      // Arrange
      const invalidSubmission = {
        id: 3,
        filePath: '/nonexistent/file.pdf',
        fileType: 'pdf'
      };

      // Act & Assert
      await expect(mlService.processOCR(invalidSubmission))
        .rejects.toThrow(/File not found|OCR processing failed/);
    });

    it('should process multiple file formats', async () => {
      // Test different file formats
      const formats = [
        { path: testPdfPath, type: 'pdf' },
        { path: testImagePath, type: 'jpg' }
      ];

      for (const format of formats) {
        const submission = {
          id: Math.random(),
          filePath: format.path,
          fileType: format.type
        };

        const result = await mlService.processOCR(submission);
        
        expect(result.text).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('Automated Grading', () => {
    const mockAssignment = {
      id: 1,
      type: 'coding',
      totalPoints: 100,
      gradingCriteria: {
        syntax: 30,
        logic: 40,
        style: 30
      },
      rubric: {
        excellent: { min: 90, max: 100 },
        good: { min: 80, max: 89 },
        satisfactory: { min: 70, max: 79 },
        needs_improvement: { min: 0, max: 69 }
      }
    };

    it('should grade coding assignments accurately', async () => {
      // Arrange
      const codingSubmission = {
        id: 1,
        content: `
          def fibonacci(n):
              if n <= 1:
                  return n
              return fibonacci(n-1) + fibonacci(n-2)
          
          # Test the function
          for i in range(10):
              print(fibonacci(i))
        `,
        assignmentId: 1,
        studentId: 1
      };

      // Act
      const result = await mlService.gradeSubmission(codingSubmission, mockAssignment);

      // Assert
      expect(result).toMatchObject({
        score: expect.any(Number),
        confidence: expect.any(Number),
        breakdown: {
          syntax: expect.any(Number),
          logic: expect.any(Number),
          style: expect.any(Number)
        },
        feedback: expect.any(String),
        suggestions: expect.any(Array)
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0.5); // Should be confident for clear code
      
      // Verify breakdown adds up correctly
      const totalBreakdown = Object.values(result.breakdown).reduce((sum, score) => sum + score, 0);
      expect(totalBreakdown).toBeCloseTo(result.score, 1);
    });

    it('should grade essay assignments', async () => {
      // Arrange
      const essayAssignment = {
        ...mockAssignment,
        type: 'essay',
        gradingCriteria: {
          content: 40,
          structure: 30,
          grammar: 30
        }
      };

      const essaySubmission = {
        id: 2,
        content: `
          The importance of renewable energy cannot be overstated in today's world.
          As we face climate change and environmental degradation, transitioning to
          sustainable energy sources becomes crucial for our planet's future.
          
          Solar energy represents one of the most promising renewable technologies.
          With decreasing costs and improving efficiency, solar panels are becoming
          more accessible to both residential and commercial users.
          
          In conclusion, investing in renewable energy is not just an environmental
          imperative but also an economic opportunity that can drive innovation
          and create jobs for future generations.
        `,
        assignmentId: 1,
        studentId: 2
      };

      // Act
      const result = await mlService.gradeSubmission(essaySubmission, essayAssignment);

      // Assert
      expect(result).toMatchObject({
        score: expect.any(Number),
        confidence: expect.any(Number),
        breakdown: {
          content: expect.any(Number),
          structure: expect.any(Number),
          grammar: expect.any(Number)
        },
        feedback: expect.any(String),
        wordCount: expect.any(Number),
        readabilityScore: expect.any(Number)
      });

      expect(result.wordCount).toBeGreaterThan(50);
      expect(result.readabilityScore).toBeGreaterThan(0);
    });

    it('should handle mathematical assignments', async () => {
      // Arrange
      const mathAssignment = {
        ...mockAssignment,
        type: 'math',
        gradingCriteria: {
          correctness: 60,
          method: 25,
          presentation: 15
        }
      };

      const mathSubmission = {
        id: 3,
        content: `
          Problem: Solve 2x + 5 = 15
          
          Solution:
          2x + 5 = 15
          2x = 15 - 5
          2x = 10
          x = 10/2
          x = 5
          
          Check: 2(5) + 5 = 10 + 5 = 15 ✓
        `,
        assignmentId: 1,
        studentId: 3
      };

      // Act
      const result = await mlService.gradeSubmission(mathSubmission, mathAssignment);

      // Assert
      expect(result).toMatchObject({
        score: expect.any(Number),
        confidence: expect.any(Number),
        breakdown: {
          correctness: expect.any(Number),
          method: expect.any(Number),
          presentation: expect.any(Number)
        },
        stepsIdentified: expect.any(Array),
        finalAnswer: expect.any(String)
      });

      expect(result.stepsIdentified.length).toBeGreaterThan(0);
      expect(result.finalAnswer).toContain('5');
    });

    it('should provide consistent grading for similar submissions', async () => {
      // Arrange
      const submission1 = {
        id: 4,
        content: 'def add(a, b): return a + b',
        assignmentId: 1,
        studentId: 4
      };

      const submission2 = {
        id: 5,
        content: 'def add(a, b):\n    return a + b',
        assignmentId: 1,
        studentId: 5
      };

      // Act
      const result1 = await mlService.gradeSubmission(submission1, mockAssignment);
      const result2 = await mlService.gradeSubmission(submission2, mockAssignment);

      // Assert
      const scoreDifference = Math.abs(result1.score - result2.score);
      expect(scoreDifference).toBeLessThan(5); // Should be within 5 points for similar content
    });
  });

  describe('Feedback Generation', () => {
    it('should generate comprehensive feedback', async () => {
      // Arrange
      const gradingData = {
        score: 85,
        breakdown: {
          syntax: 28,
          logic: 32,
          style: 25
        },
        totalPoints: 100,
        assignmentType: 'coding',
        submissionContent: 'def factorial(n): return 1 if n <= 1 else n * factorial(n-1)'
      };

      // Act
      const feedback = await mlService.generateFeedback(gradingData);

      // Assert
      expect(feedback).toMatchObject({
        summary: expect.any(String),
        strengths: expect.any(Array),
        improvements: expect.any(Array),
        nextSteps: expect.any(Array),
        detailedComments: expect.any(Array),
        generatedAt: expect.any(String)
      });

      expect(feedback.summary.length).toBeGreaterThan(20);
      expect(feedback.strengths.length).toBeGreaterThan(0);
      expect(feedback.improvements.length).toBeGreaterThan(0);
    });

    it('should customize feedback based on score level', async () => {
      // Test different score ranges
      const scoreRanges = [
        { score: 95, level: 'excellent' },
        { score: 85, level: 'good' },
        { score: 75, level: 'satisfactory' },
        { score: 55, level: 'needs_improvement' }
      ];

      for (const range of scoreRanges) {
        const gradingData = {
          score: range.score,
          breakdown: { syntax: 30, logic: 30, style: 30 },
          totalPoints: 100,
          assignmentType: 'coding'
        };

        const feedback = await mlService.generateFeedback(gradingData);
        
        if (range.level === 'excellent') {
          expect(feedback.summary.toLowerCase()).toMatch(/excellent|outstanding|great/);
        } else if (range.level === 'needs_improvement') {
          expect(feedback.improvements.length).toBeGreaterThan(2);
        }
      }
    });
  });

  describe('Model Performance and Accuracy', () => {
    it('should maintain consistent performance under load', async () => {
      // Arrange
      const submissions = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        content: `def test_function_${i}(): return ${i}`,
        assignmentId: 1,
        studentId: i + 1
      }));

      // Act
      const startTime = Date.now();
      const results = await Promise.all(
        submissions.map(sub => mlService.gradeSubmission(sub, mockAssignment))
      );
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.confidence).toBeGreaterThan(0);
      });

      // Performance check - should process 10 submissions in reasonable time
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(30000); // 30 seconds max
    });

    it('should provide confidence metrics for predictions', async () => {
      // Arrange
      const clearSubmission = {
        id: 1,
        content: 'def hello(): print("Hello, World!")',
        assignmentId: 1,
        studentId: 1
      };

      const ambiguousSubmission = {
        id: 2,
        content: 'x = y + z # incomplete code',
        assignmentId: 1,
        studentId: 2
      };

      // Act
      const clearResult = await mlService.gradeSubmission(clearSubmission, mockAssignment);
      const ambiguousResult = await mlService.gradeSubmission(ambiguousSubmission, mockAssignment);

      // Assert
      expect(clearResult.confidence).toBeGreaterThan(ambiguousResult.confidence);
      expect(clearResult.confidence).toBeGreaterThan(0.7);
      expect(ambiguousResult.confidence).toBeLessThan(0.6);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty submissions', async () => {
      // Arrange
      const emptySubmission = {
        id: 1,
        content: '',
        assignmentId: 1,
        studentId: 1
      };

      // Act
      const result = await mlService.gradeSubmission(emptySubmission, mockAssignment);

      // Assert
      expect(result.score).toBe(0);
      expect(result.feedback).toContain('empty');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle very long submissions', async () => {
      // Arrange
      const longContent = 'a'.repeat(100000); // 100KB of content
      const longSubmission = {
        id: 1,
        content: longContent,
        assignmentId: 1,
        studentId: 1
      };

      // Act & Assert
      await expect(mlService.gradeSubmission(longSubmission, mockAssignment))
        .resolves.toMatchObject({
          score: expect.any(Number),
          confidence: expect.any(Number)
        });
    });

    it('should handle special characters and unicode', async () => {
      // Arrange
      const unicodeSubmission = {
        id: 1,
        content: 'def greet(): return "Hello, 世界! 🌍"',
        assignmentId: 1,
        studentId: 1
      };

      // Act
      const result = await mlService.gradeSubmission(unicodeSubmission, mockAssignment);

      // Assert
      expect(result.score).toBeGreaterThan(0);
      expect(result.feedback).toBeDefined();
    });

    it('should timeout on excessively long processing', async () => {
      // This test would simulate a scenario where ML processing takes too long
      jest.setTimeout(60000); // 1 minute timeout for this test

      const complexSubmission = {
        id: 1,
        content: 'x' * 1000000, // Very large submission
        assignmentId: 1,
        studentId: 1
      };

      const startTime = Date.now();
      
      try {
        await mlService.gradeSubmission(complexSubmission, mockAssignment);
        const endTime = Date.now();
        
        // Should complete within reasonable time
        expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
      } catch (error) {
        // If it times out, that's also acceptable behavior
        expect(error.message).toMatch(/timeout|processing time exceeded/i);
      }
    });
  });
});
