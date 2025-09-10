/**
 * Unit tests for Grading Service
 * Tests automated grading, ML integration, and feedback generation
 */

const gradingService = require('../../../src/services/grading.service');
const mlService = require('../../../ml/services/ml.service');
const assignmentService = require('../../../src/services/assignment.service');

// Mock dependencies
jest.mock('../../../ml/services/ml.service');
jest.mock('../../../src/services/assignment.service');
jest.mock('../../../src/config/database');

describe('Grading Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processSubmission', () => {
    const mockSubmission = {
      id: 1,
      assignmentId: 1,
      studentId: 1,
      content: 'Test submission content',
      filePath: '/path/to/submission.pdf',
      submittedAt: new Date().toISOString()
    };

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

    it('should process coding submission successfully', async () => {
      // Arrange
      const mockMLResult = {
        score: 85,
        confidence: 0.92,
        breakdown: {
          syntax: 28,
          logic: 32,
          style: 25
        },
        feedback: 'Good overall structure with minor improvements needed',
        suggestions: [
          'Consider adding more comments',
          'Variable naming could be improved'
        ]
      };

      assignmentService.getById.mockResolvedValue(mockAssignment);
      mlService.gradeSubmission.mockResolvedValue(mockMLResult);

      // Act
      const result = await gradingService.processSubmission(mockSubmission);

      // Assert
      expect(assignmentService.getById).toHaveBeenCalledWith(mockSubmission.assignmentId);
      expect(mlService.gradeSubmission).toHaveBeenCalledWith(
        mockSubmission,
        mockAssignment
      );
      expect(result).toEqual(
        expect.objectContaining({
          submissionId: mockSubmission.id,
          score: 85,
          totalPoints: 100,
          grade: 'B',
          confidence: 0.92,
          gradingMethod: 'automated',
          feedback: expect.stringContaining('Good overall structure'),
          breakdown: mockMLResult.breakdown,
          suggestions: mockMLResult.suggestions,
          gradedAt: expect.any(String)
        })
      );
    });

    it('should handle OCR processing for PDF submissions', async () => {
      // Arrange
      const pdfSubmission = {
        ...mockSubmission,
        filePath: '/path/to/submission.pdf',
        fileType: 'pdf'
      };

      const mockOCRResult = {
        text: 'Extracted text from PDF',
        confidence: 0.88,
        pages: 2
      };

      const mockMLResult = {
        score: 78,
        confidence: 0.85,
        feedback: 'Document processed successfully'
      };

      assignmentService.getById.mockResolvedValue(mockAssignment);
      mlService.processOCR.mockResolvedValue(mockOCRResult);
      mlService.gradeSubmission.mockResolvedValue(mockMLResult);

      // Act
      const result = await gradingService.processSubmission(pdfSubmission);

      // Assert
      expect(mlService.processOCR).toHaveBeenCalledWith(pdfSubmission.filePath);
      expect(mlService.gradeSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          ...pdfSubmission,
          extractedText: mockOCRResult.text
        }),
        mockAssignment
      );
      expect(result.ocrProcessed).toBe(true);
      expect(result.extractedText).toBe(mockOCRResult.text);
    });

    it('should apply manual override when confidence is low', async () => {
      // Arrange
      const mockMLResult = {
        score: 85,
        confidence: 0.45, // Low confidence
        feedback: 'Uncertain automated analysis'
      };

      assignmentService.getById.mockResolvedValue(mockAssignment);
      mlService.gradeSubmission.mockResolvedValue(mockMLResult);

      // Act
      const result = await gradingService.processSubmission(mockSubmission);

      // Assert
      expect(result.requiresManualReview).toBe(true);
      expect(result.gradingMethod).toBe('pending_manual');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle different assignment types', async () => {
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

      const mockMLResult = {
        score: 82,
        confidence: 0.89,
        breakdown: {
          content: 32,
          structure: 25,
          grammar: 25
        }
      };

      assignmentService.getById.mockResolvedValue(essayAssignment);
      mlService.gradeSubmission.mockResolvedValue(mockMLResult);

      // Act
      const result = await gradingService.processSubmission(mockSubmission);

      // Assert
      expect(result.assignmentType).toBe('essay');
      expect(result.breakdown).toEqual(mockMLResult.breakdown);
    });
  });

  describe('generateFeedback', () => {
    const mockGradingData = {
      score: 85,
      breakdown: {
        syntax: 28,
        logic: 32,
        style: 25
      },
      totalPoints: 100,
      assignmentType: 'coding'
    };

    it('should generate comprehensive feedback', async () => {
      // Arrange
      const mockFeedback = {
        summary: 'Good work with room for improvement',
        strengths: ['Clear logic flow', 'Proper syntax usage'],
        improvements: ['Add more comments', 'Improve variable naming'],
        nextSteps: ['Review style guidelines', 'Practice documentation']
      };

      mlService.generateFeedback.mockResolvedValue(mockFeedback);

      // Act
      const result = await gradingService.generateFeedback(mockGradingData);

      // Assert
      expect(mlService.generateFeedback).toHaveBeenCalledWith(mockGradingData);
      expect(result).toEqual(
        expect.objectContaining({
          summary: expect.any(String),
          strengths: expect.any(Array),
          improvements: expect.any(Array),
          nextSteps: expect.any(Array),
          generatedAt: expect.any(String)
        })
      );
    });

    it('should customize feedback based on score range', async () => {
      // Arrange
      const lowScoreData = { ...mockGradingData, score: 55 };
      const mockLowScoreFeedback = {
        summary: 'Significant improvement needed',
        strengths: ['Basic structure present'],
        improvements: ['Review fundamental concepts', 'Improve logic flow']
      };

      mlService.generateFeedback.mockResolvedValue(mockLowScoreFeedback);

      // Act
      const result = await gradingService.generateFeedback(lowScoreData);

      // Assert
      expect(result.summary).toContain('improvement needed');
      expect(result.improvements).toContain('Review fundamental concepts');
    });
  });

  describe('bulkGrading', () => {
    const mockSubmissions = [
      { id: 1, assignmentId: 1, studentId: 1 },
      { id: 2, assignmentId: 1, studentId: 2 },
      { id: 3, assignmentId: 1, studentId: 3 }
    ];

    it('should process multiple submissions efficiently', async () => {
      // Arrange
      const mockResults = mockSubmissions.map((sub, index) => ({
        submissionId: sub.id,
        score: 80 + index * 5,
        gradingMethod: 'automated'
      }));

      assignmentService.getById.mockResolvedValue(mockAssignment);
      mlService.gradeSubmission.mockImplementation((submission) => 
        Promise.resolve({
          score: 80 + submission.id * 5,
          confidence: 0.9
        })
      );

      // Act
      const results = await gradingService.bulkGrading(mockSubmissions);

      // Assert
      expect(results).toHaveLength(3);
      expect(mlService.gradeSubmission).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.submissionId).toBe(mockSubmissions[index].id);
        expect(result.score).toBe(80 + (index + 1) * 5);
      });
    });

    it('should handle partial failures in bulk grading', async () => {
      // Arrange
      assignmentService.getById.mockResolvedValue(mockAssignment);
      mlService.gradeSubmission
        .mockResolvedValueOnce({ score: 85, confidence: 0.9 })
        .mockRejectedValueOnce(new Error('ML service error'))
        .mockResolvedValueOnce({ score: 78, confidence: 0.88 });

      // Act
      const results = await gradingService.bulkGrading(mockSubmissions);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('error');
      expect(results[1].error).toContain('ML service error');
      expect(results[2].status).toBe('success');
    });
  });

  describe('gradeAnalytics', () => {
    it('should calculate assignment statistics', async () => {
      // Arrange
      const mockGrades = [
        { score: 95, studentId: 1 },
        { score: 87, studentId: 2 },
        { score: 76, studentId: 3 },
        { score: 82, studentId: 4 },
        { score: 91, studentId: 5 }
      ];

      // Act
      const analytics = await gradingService.calculateAssignmentAnalytics(mockGrades);

      // Assert
      expect(analytics).toEqual(
        expect.objectContaining({
          totalSubmissions: 5,
          averageScore: 86.2,
          medianScore: 87,
          highestScore: 95,
          lowestScore: 76,
          standardDeviation: expect.any(Number),
          gradeDistribution: expect.objectContaining({
            A: 2, // 95, 91
            B: 2, // 87, 82
            C: 1  // 76
          })
        })
      );
    });

    it('should identify outliers in grading', async () => {
      // Arrange
      const mockGrades = [
        { score: 95, studentId: 1 },
        { score: 15, studentId: 2 }, // Outlier
        { score: 87, studentId: 3 },
        { score: 92, studentId: 4 }
      ];

      // Act
      const analytics = await gradingService.calculateAssignmentAnalytics(mockGrades);

      // Assert
      expect(analytics.outliers).toContain(
        expect.objectContaining({
          studentId: 2,
          score: 15,
          deviation: expect.any(Number)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle ML service failures gracefully', async () => {
      // Arrange
      const mockSubmission = global.testUtils.generateTestSubmission(1, 1);
      assignmentService.getById.mockResolvedValue(mockAssignment);
      mlService.gradeSubmission.mockRejectedValue(new Error('ML service unavailable'));

      // Act
      const result = await gradingService.processSubmission(mockSubmission);

      // Assert
      expect(result.status).toBe('error');
      expect(result.error).toContain('ML service unavailable');
      expect(result.requiresManualReview).toBe(true);
    });

    it('should validate submission data before processing', async () => {
      // Arrange
      const invalidSubmission = {
        id: null,
        assignmentId: 'invalid',
        content: ''
      };

      // Act & Assert
      await expect(gradingService.processSubmission(invalidSubmission))
        .rejects.toThrow('Invalid submission data');
    });

    it('should handle database errors during grade storage', async () => {
      // Arrange
      const mockSubmission = global.testUtils.generateTestSubmission(1, 1);
      const mockMLResult = { score: 85, confidence: 0.9 };
      
      assignmentService.getById.mockResolvedValue(mockAssignment);
      mlService.gradeSubmission.mockResolvedValue(mockMLResult);
      
      // Mock database error during save
      const dbError = new Error('Database connection failed');
      const mockPool = require('../../../src/config/database').pool;
      mockPool.execute.mockRejectedValue(dbError);

      // Act & Assert
      await expect(gradingService.processSubmission(mockSubmission))
        .rejects.toThrow('Database connection failed');
    });
  });
});
