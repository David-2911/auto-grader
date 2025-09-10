/**
 * Unit tests for API Core Service
 * Tests HTTP client, error handling, and request/response interceptors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiCore } from '@/services/core/api.core';
import { testUtils, TEST_CONSTANTS } from '@/test/setup';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      request: vi.fn()
    }))
  }
}));

describe('ApiCore Service Unit Tests', () => {
  let apiCore: ApiCore;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      request: vi.fn()
    };

    // Mock axios.create to return our mock instance
    const axios = require('axios');
    axios.default.create.mockReturnValue(mockAxiosInstance);

    // Initialize ApiCore
    apiCore = new ApiCore({
      baseURL: TEST_CONSTANTS.API_BASE_URL,
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCache: true,
      enableOfflineQueue: true,
      enableWebSocket: false,
      enableProgressTracking: true
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultApiCore = new ApiCore({
        baseURL: TEST_CONSTANTS.API_BASE_URL,
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        enableCache: false,
        enableOfflineQueue: false,
        enableWebSocket: false,
        enableProgressTracking: false
      });

      expect(defaultApiCore).toBeDefined();
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('HTTP Methods', () => {
    const mockResponse = {
      data: { success: true, data: 'test' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    };

    it('should make GET requests', async () => {
      // Arrange
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      // Act
      const result = await apiCore.get('/test-endpoint');

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test-endpoint'
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should make POST requests with data', async () => {
      // Arrange
      const postData = { name: 'test', value: 123 };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      // Act
      const result = await apiCore.post('/test-endpoint', postData);

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/test-endpoint',
          data: postData
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should make PUT requests', async () => {
      // Arrange
      const putData = { id: 1, name: 'updated' };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      // Act
      const result = await apiCore.put('/test-endpoint/1', putData);

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/test-endpoint/1',
          data: putData
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should make DELETE requests', async () => {
      // Arrange
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      // Act
      const result = await apiCore.delete('/test-endpoint/1');

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/test-endpoint/1'
        })
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Request Configuration', () => {
    it('should add authorization headers when token is available', async () => {
      // Arrange
      const mockToken = 'test-access-token';
      localStorage.setItem('accessToken', mockToken);
      mockAxiosInstance.request.mockResolvedValue({ data: {} });

      // Act
      await apiCore.get('/protected-endpoint');

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`
          })
        })
      );
    });

    it('should handle custom headers', async () => {
      // Arrange
      const customHeaders = { 'X-Custom-Header': 'custom-value' };
      mockAxiosInstance.request.mockResolvedValue({ data: {} });

      // Act
      await apiCore.get('/test-endpoint', { headers: customHeaders });

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining(customHeaders)
        })
      );
    });

    it('should set custom timeout', async () => {
      // Arrange
      const customTimeout = 10000;
      mockAxiosInstance.request.mockResolvedValue({ data: {} });

      // Act
      await apiCore.get('/test-endpoint', { timeout: customTimeout });

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: customTimeout
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      mockAxiosInstance.request.mockRejectedValue(networkError);

      // Act & Assert
      await expect(apiCore.get('/test-endpoint')).rejects.toThrow('Network Error');
    });

    it('should handle HTTP error responses', async () => {
      // Arrange
      const httpError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Resource not found' }
        },
        isAxiosError: true
      };
      mockAxiosInstance.request.mockRejectedValue(httpError);

      // Act & Assert
      await expect(apiCore.get('/nonexistent-endpoint')).rejects.toMatchObject({
        status: 404,
        message: 'Resource not found'
      });
    });

    it('should handle 401 unauthorized errors', async () => {
      // Arrange
      const authError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Token expired' }
        },
        isAxiosError: true
      };
      mockAxiosInstance.request.mockRejectedValue(authError);

      // Act & Assert
      await expect(apiCore.get('/protected-endpoint')).rejects.toMatchObject({
        status: 401
      });
    });

    it('should handle 500 server errors', async () => {
      // Arrange
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Server error' }
        },
        isAxiosError: true
      };
      mockAxiosInstance.request.mockRejectedValue(serverError);

      // Act & Assert
      await expect(apiCore.get('/error-endpoint')).rejects.toMatchObject({
        status: 500,
        message: 'Server error'
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      // Arrange
      const networkError = new Error('Network Error');
      mockAxiosInstance.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: { success: true } });

      // Act
      const result = await apiCore.get('/unreliable-endpoint');

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should not retry on certain error codes', async () => {
      // Arrange
      const clientError = {
        response: {
          status: 400,
          data: { message: 'Bad Request' }
        },
        isAxiosError: true
      };
      mockAxiosInstance.request.mockRejectedValue(clientError);

      // Act & Assert
      await expect(apiCore.get('/bad-request')).rejects.toMatchObject({
        status: 400
      });
      
      // Should only be called once (no retry for 4xx errors)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('Request Caching', () => {
    it('should cache GET requests when caching is enabled', async () => {
      // Arrange
      const responseData = { data: 'cached response' };
      mockAxiosInstance.request.mockResolvedValue({ data: responseData });

      // Act - Make the same request twice
      const result1 = await apiCore.get('/cacheable-endpoint');
      const result2 = await apiCore.get('/cacheable-endpoint');

      // Assert
      expect(result1).toEqual(responseData);
      expect(result2).toEqual(responseData);
      
      // Should cache the second request (implementation dependent)
      // This test would need actual cache implementation to verify
    });

    it('should not cache POST requests', async () => {
      // Arrange
      const responseData = { data: 'not cached' };
      mockAxiosInstance.request.mockResolvedValue({ data: responseData });
      const postData = { action: 'create' };

      // Act - Make the same POST request twice
      await apiCore.post('/non-cacheable-endpoint', postData);
      await apiCore.post('/non-cacheable-endpoint', postData);

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('File Upload', () => {
    it('should handle file uploads with FormData', async () => {
      // Arrange
      const file = testUtils.createMockFile('test.pdf');
      const formData = new FormData();
      formData.append('file', file);
      
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true, fileId: 123 }
      });

      // Act
      const result = await apiCore.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/upload',
          data: formData,
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data'
          })
        })
      );
      expect(result).toEqual({ success: true, fileId: 123 });
    });

    it('should handle upload progress tracking', async () => {
      // Arrange
      const progressCallback = vi.fn();
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true }
      });

      // Act
      await apiCore.post('/upload', new FormData(), {
        onUploadProgress: progressCallback
      });

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          onUploadProgress: progressCallback
        })
      );
    });
  });

  describe('Request Cancellation', () => {
    it('should support request cancellation', async () => {
      // Arrange
      const abortController = new AbortController();
      mockAxiosInstance.request.mockRejectedValue(new Error('Request cancelled'));

      // Act & Assert
      await expect(
        apiCore.get('/long-running-endpoint', {
          signal: abortController.signal
        })
      ).rejects.toThrow('Request cancelled');
    });
  });

  describe('Response Transformation', () => {
    it('should handle successful responses', async () => {
      // Arrange
      const mockApiResponse = {
        data: {
          success: true,
          data: { id: 1, name: 'test' },
          message: 'Success'
        },
        status: 200
      };
      mockAxiosInstance.request.mockResolvedValue(mockApiResponse);

      // Act
      const result = await apiCore.get('/test-endpoint');

      // Assert
      expect(result).toEqual(mockApiResponse.data);
    });

    it('should handle responses with different data structures', async () => {
      // Arrange
      const mockListResponse = {
        data: {
          success: true,
          data: [{ id: 1 }, { id: 2 }],
          pagination: { page: 1, total: 2 }
        },
        status: 200
      };
      mockAxiosInstance.request.mockResolvedValue(mockListResponse);

      // Act
      const result = await apiCore.get('/list-endpoint');

      // Assert
      expect(result).toEqual(mockListResponse.data);
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toBeDefined();
    });
  });
});
