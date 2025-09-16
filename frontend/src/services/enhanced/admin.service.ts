import { apiCore } from '../core/api.core';
import {
  User,
  Course,
  Assignment,
  Submission,
  ApiResponse,
} from '@/types';
import { AxiosRequestConfig } from 'axios';

export interface AdminDashboardData {
  systemStats: {
    totalUsers: number;
    totalCourses: number;
    totalAssignments: number;
    totalSubmissions: number;
    activeUsers: number;
    systemUptime: number;
    storageUsed: number;
    storageTotal: number;
  };
  userStats: {
    students: number;
    teachers: number;
    admins: number;
    newUsersThisWeek: number;
    activeUsersToday: number;
  };
  activityStats: {
    submissionsToday: number;
    gradingBacklog: number;
    loginAttempts: number;
    failedLogins: number;
  };
  systemHealth: {
    apiStatus: 'healthy' | 'warning' | 'error';
    databaseStatus: 'healthy' | 'warning' | 'error';
    mlServiceStatus: 'healthy' | 'warning' | 'error';
    fileStorageStatus: 'healthy' | 'warning' | 'error';
  };
  recentActivity: ActivityLog[];
}

export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword?: string;
    fromAddress: string;
    fromName: string;
    enableNotifications: boolean;
  };
  security: {
    passwordMinLength: number;
    requirePasswordChange: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    enableTwoFactor: boolean;
    allowedIpRanges?: string[];
  };
  grading: {
    enableAutoGrading: boolean;
    defaultGradingRubric?: string;
    plagiarismCheckEnabled: boolean;
    anonymousGradingDefault: boolean;
    maxSubmissionSize: number;
  };
  backup: {
    autoBackupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    backupLocation: string;
  };
}

export interface UserCreateData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
  identifier: string;
  password?: string;
  sendWelcomeEmail?: boolean;
  temporaryPassword?: boolean;
}

export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'student' | 'teacher' | 'admin';
  identifier?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  requirePasswordChange?: boolean;
  permissions?: string[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId?: number;
  userEmail?: string;
  action: string;
  resource: string;
  details?: any;
  ipAddress: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SystemReport {
  id: string;
  type: 'users' | 'courses' | 'submissions' | 'system' | 'security';
  title: string;
  generatedAt: string;
  parameters: any;
  data: any;
  downloadUrl?: string;
}

export interface BulkUserOperation {
  operation: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
  users: any[];
  options?: {
    sendEmails?: boolean;
    skipValidation?: boolean;
    rollbackOnError?: boolean;
  };
}

class EnhancedAdminService {
  constructor() {
    this.initializeWebSocketListeners();
  }

  // Dashboard and System Overview
  async getDashboardData(useCache: boolean = true): Promise<AdminDashboardData> {
    const config: AxiosRequestConfig = {
      metadata: {
        endpoint: 'admin_dashboard',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
        cacheKey: useCache ? 'admin_dashboard' : undefined,
      },
    };

    const response = await apiCore.get<ApiResponse<AdminDashboardData>>('/admin/dashboard', config);
    return response.data.data!;
  }

  async getSystemHealth(): Promise<AdminDashboardData['systemHealth']> {
    const response = await apiCore.get<ApiResponse<AdminDashboardData['systemHealth']>>(
      '/admin/system/health',
      {
      }
    );

    return response.data.data!;
  }

  async getSystemLogs(filters?: {
    level?: 'info' | 'warning' | 'error';
    startDate?: string;
    endDate?: string;
    userId?: number;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: ActivityLog[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await apiCore.get<ApiResponse<any>>('/admin/system/logs', {
      params: filters,
    });

    return response.data.data!;
  }

  // User Management
  async getUsers(filters?: {
    role?: 'student' | 'teacher' | 'admin';
    status?: 'active' | 'inactive' | 'suspended';
    search?: string;
    sortBy?: 'name' | 'email' | 'created' | 'lastLogin';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    users: User[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const response = await apiCore.get<ApiResponse<any>>('/admin/users', {
      params: filters,
    });

    return response.data.data!;
  }

  async getUser(id: number): Promise<User> {
    const response = await apiCore.get<ApiResponse<User>>(`/admin/users/${id}`, {
    });

    return response.data.data!;
  }

  async createUser(data: UserCreateData): Promise<User> {
    const response = await apiCore.post<ApiResponse<User>>('/admin/users', data, {
    });

    await this.clearUsersCache();

    return response.data.data!;
  }

  async updateUser(id: number, data: UserUpdateData): Promise<User> {
    const response = await apiCore.put<ApiResponse<User>>(`/admin/users/${id}`, data, {
    });

    await this.clearUserCache(id);

    return response.data.data!;
  }

  async deleteUser(id: number, transferData?: {
    newOwnerId?: number;
    deleteContent?: boolean;
  }): Promise<void> {
    await apiCore.delete(`/admin/users/${id}`, {
      data: transferData,
    });

    await this.clearUsersCache();
  }

  async suspendUser(id: number, reason: string, duration?: number): Promise<void> {
    await apiCore.post(`/admin/users/${id}/suspend`, {
      reason,
      duration,
    }, {
    });

    await this.clearUserCache(id);
  }

  async unsuspendUser(id: number): Promise<void> {
    await apiCore.post(`/admin/users/${id}/unsuspend`, {}, {
    });

    await this.clearUserCache(id);
  }

  async resetUserPassword(id: number, sendEmail: boolean = true): Promise<{
    temporaryPassword?: string;
    emailSent: boolean;
  }> {
    const response = await apiCore.post<ApiResponse<any>>(`/admin/users/${id}/reset-password`, {
      sendEmail,
    }, {
    });

    return response.data.data!;
  }

  async bulkUserOperation(operation: BulkUserOperation): Promise<{
    success: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
    results?: any[];
  }> {
    const response = await apiCore.post<ApiResponse<any>>('/admin/users/bulk', operation, {
    });

    await this.clearUsersCache();

    return response.data.data!;
  }

  // Course Management
  async getAllCourses(filters?: {
    status?: 'active' | 'archived' | 'draft';
    teacherId?: number;
    search?: string;
    semester?: string;
    year?: number;
    sortBy?: 'title' | 'code' | 'created' | 'students';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    courses: Course[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const response = await apiCore.get<ApiResponse<any>>('/admin/courses', {
      params: filters,
    });

    return response.data.data!;
  }

  async getCourseDetails(id: number): Promise<Course & {
    enrollmentCount: number;
    assignmentCount: number;
    submissionCount: number;
    statistics: any;
  }> {
    const response = await apiCore.get<ApiResponse<any>>(`/admin/courses/${id}`, {
    });

    return response.data.data!;
  }

  async archiveCourse(id: number): Promise<void> {
    await apiCore.post(`/admin/courses/${id}/archive`, {}, {
    });

    await this.clearCourseCache(id);
  }

  async transferCourse(id: number, newTeacherId: number): Promise<void> {
    await apiCore.post(`/admin/courses/${id}/transfer`, {
      newTeacherId,
    }, {
    });

    await this.clearCourseCache(id);
  }

  // System Settings Management
  async getSystemSettings(): Promise<SystemSettings> {
    const response = await apiCore.get<ApiResponse<SystemSettings>>('/admin/settings', {
    });

    return response.data.data!;
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await apiCore.put<ApiResponse<SystemSettings>>('/admin/settings', settings, {
    });

    await this.clearSettingsCache();

    return response.data.data!;
  }

  async testEmailSettings(settings: SystemSettings['email']): Promise<{
    success: boolean;
    error?: string;
  }> {
    const response = await apiCore.post<ApiResponse<any>>('/admin/settings/test-email', settings, {
    });

    return response.data.data!;
  }

  // System Maintenance
  async createSystemBackup(): Promise<{
    backupId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }> {
    const response = await apiCore.post<ApiResponse<any>>('/admin/system/backup', {}, {
    });

    return response.data.data!;
  }

  async getBackupStatus(backupId: string): Promise<{
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    size?: number;
    downloadUrl?: string;
    error?: string;
  }> {
    const response = await apiCore.get<ApiResponse<any>>(`/admin/system/backup/${backupId}`, {
    });

    return response.data.data!;
  }

  async getBackupHistory(): Promise<Array<{
    id: string;
    createdAt: string;
    size: number;
    status: string;
    downloadUrl?: string;
  }>> {
    const response = await apiCore.get<ApiResponse<any>>('/admin/system/backups', {
    });

    return response.data.data!;
  }

  async enableMaintenanceMode(message?: string, estimatedDuration?: number): Promise<void> {
    await apiCore.post('/admin/system/maintenance', {
      enabled: true,
      message,
      estimatedDuration,
    }, {
    });
  }

  async disableMaintenanceMode(): Promise<void> {
    await apiCore.post('/admin/system/maintenance', {
      enabled: false,
    }, {
    });
  }

  async clearSystemCache(cacheType?: 'all' | 'api' | 'templates' | 'static'): Promise<void> {
    await apiCore.post('/admin/system/clear-cache', {
      type: cacheType || 'all',
    }, {
    });
  }

  async restartServices(services?: string[]): Promise<{
    restarted: string[];
    failed: string[];
    errors: Record<string, string>;
  }> {
    const response = await apiCore.post<ApiResponse<any>>('/admin/system/restart', {
      services,
    }, {
    });

    return response.data.data!;
  }

  // Analytics and Reporting
  async generateSystemReport(type: SystemReport['type'], parameters?: any): Promise<{
    reportId: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
  }> {
    const response = await apiCore.post<ApiResponse<any>>('/admin/reports/generate', {
      type,
      parameters,
    }, {
    });

    return response.data.data!;
  }

  async getReportStatus(reportId: string): Promise<{
    status: 'pending' | 'generating' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
    error?: string;
  }> {
    const response = await apiCore.get<ApiResponse<any>>(`/admin/reports/${reportId}`, {
    });

    return response.data.data!;
  }

  async getReportHistory(): Promise<SystemReport[]> {
    const response = await apiCore.get<ApiResponse<SystemReport[]>>('/admin/reports', {
    });

    return response.data.data!;
  }

  async getSystemAnalytics(dateRange?: {
    start: string;
    end: string;
  }): Promise<{
    userGrowth: Array<{ date: string; count: number }>;
    courseActivity: Array<{ date: string; submissions: number; logins: number }>;
    performanceMetrics: {
      averageResponseTime: number;
      errorRate: number;
      uptime: number;
    };
    resourceUsage: {
      cpu: number;
      memory: number;
      storage: number;
      bandwidth: number;
    };
  }> {
    const params = dateRange ? { start: dateRange.start, end: dateRange.end } : {};
    
    const response = await apiCore.get<ApiResponse<any>>('/admin/analytics', {
      params,
    });

    return response.data.data!;
  }

  // Security Management
  async getSecurityEvents(filters?: {
    type?: 'login' | 'failed_login' | 'permission_denied' | 'suspicious_activity';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    userId?: number;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    events: Array<{
      id: string;
      type: string;
      severity: string;
      timestamp: string;
      userId?: number;
      userEmail?: string;
      ipAddress: string;
      details: any;
    }>;
    total: number;
    hasMore: boolean;
  }> {
    const response = await apiCore.get<ApiResponse<any>>('/admin/security/events', {
      params: filters,
    });

    return response.data.data!;
  }

  async blockIpAddress(ipAddress: string, reason: string, duration?: number): Promise<void> {
    await apiCore.post('/admin/security/block-ip', {
      ipAddress,
      reason,
      duration,
    }, {
    });
  }

  async unblockIpAddress(ipAddress: string): Promise<void> {
    await apiCore.delete('/admin/security/block-ip', {
      data: { ipAddress },
    });
  }

  async getBlockedIps(): Promise<Array<{
    ipAddress: string;
    reason: string;
    blockedAt: string;
    expiresAt?: string;
  }>> {
    const response = await apiCore.get<ApiResponse<any>>('/admin/security/blocked-ips', {
    });

    return response.data.data!;
  }

  // Cache Management
  private async clearUsersCache(): Promise<void> {
    // Implementation would clear user-related cache entries
  }

  private async clearUserCache(userId: number): Promise<void> {
    // Implementation would clear specific user cache
  }

  private async clearCourseCache(courseId: number): Promise<void> {
    // Implementation would clear specific course cache
  }

  private async clearSettingsCache(): Promise<void> {
    // Implementation would clear settings cache
  }

  // WebSocket Event Listeners
  private initializeWebSocketListeners(): void {
    apiCore.subscribeToWebSocket('system:alert', (data) => {
      console.log('System alert:', data);
    });

    apiCore.subscribeToWebSocket('security:event', (data) => {
      console.log('Security event:', data);
    });

    apiCore.subscribeToWebSocket('admin:notification', (data) => {
      console.log('Admin notification:', data);
    });
  }
}

export const enhancedAdminService = new EnhancedAdminService();
export default enhancedAdminService;
