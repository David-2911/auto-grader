import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { studentService, StudentDashboardData } from '@/services/student.service';
import {
  Assignment,
  Submission,
  Course,
  Notification,
  PerformanceMetrics,
  User
} from '@/types';

export interface StudentState {
  // Dashboard data
  dashboardData: StudentDashboardData | null;
  dashboardLoading: boolean;
  dashboardError: string | null;
  
  // Assignments
  assignments: Assignment[];
  currentAssignment: Assignment | null;
  assignmentsLoading: boolean;
  assignmentsError: string | null;
  
  // Submissions
  submissions: Submission[];
  currentSubmission: Submission | null;
  submissionLoading: boolean;
  submissionError: string | null;
  uploadProgress: number;
  
  // Grades
  grades: Submission[];
  gradesLoading: boolean;
  gradesError: string | null;
  
  // Performance
  performance: PerformanceMetrics | null;
  performanceLoading: boolean;
  performanceError: string | null;
  
  // Profile
  profile: User | null;
  profileLoading: boolean;
  profileError: string | null;
  
  // Notifications
  notifications: Notification[];
  notificationsLoading: boolean;
  notificationsError: string | null;
  unreadCount: number;
  
  // Courses
  courses: Course[];
  coursesLoading: boolean;
  coursesError: string | null;
  
  // UI state
  selectedCourse: number | null;
  viewMode: 'grid' | 'list';
  showCompletedAssignments: boolean;
}

const initialState: StudentState = {
  dashboardData: null,
  dashboardLoading: false,
  dashboardError: null,
  
  assignments: [],
  currentAssignment: null,
  assignmentsLoading: false,
  assignmentsError: null,
  
  submissions: [],
  currentSubmission: null,
  submissionLoading: false,
  submissionError: null,
  uploadProgress: 0,
  
  grades: [],
  gradesLoading: false,
  gradesError: null,
  
  performance: null,
  performanceLoading: false,
  performanceError: null,
  
  profile: null,
  profileLoading: false,
  profileError: null,
  
  notifications: [],
  notificationsLoading: false,
  notificationsError: null,
  unreadCount: 0,
  
  courses: [],
  coursesLoading: false,
  coursesError: null,
  
  selectedCourse: null,
  viewMode: 'grid',
  showCompletedAssignments: false,
};

// Async thunks
export const fetchDashboardData = createAsyncThunk(
  'student/fetchDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      const data = await studentService.getDashboardData();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard data');
    }
  }
);

export const fetchAssignments = createAsyncThunk(
  'student/fetchAssignments',
  async (courseId?: number, { rejectWithValue }) => {
    try {
      const assignments = await studentService.getAssignments(courseId);
      return assignments;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assignments');
    }
  }
);

export const fetchAssignment = createAsyncThunk(
  'student/fetchAssignment',
  async (id: number, { rejectWithValue }) => {
    try {
      const assignment = await studentService.getAssignment(id);
      return assignment;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assignment');
    }
  }
);

export const submitAssignment = createAsyncThunk(
  'student/submitAssignment',
  async (data: { assignmentId: number; file?: File; submissionText?: string }, { rejectWithValue }) => {
    try {
      const submission = await studentService.submitAssignment(data);
      return submission;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit assignment');
    }
  }
);

export const fetchSubmissions = createAsyncThunk(
  'student/fetchSubmissions',
  async (assignmentId?: number, { rejectWithValue }) => {
    try {
      const submissions = await studentService.getSubmissions(assignmentId);
      return submissions;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch submissions');
    }
  }
);

export const fetchGrades = createAsyncThunk(
  'student/fetchGrades',
  async (_, { rejectWithValue }) => {
    try {
      const grades = await studentService.getGrades();
      return grades;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch grades');
    }
  }
);

export const fetchPerformance = createAsyncThunk(
  'student/fetchPerformance',
  async (_, { rejectWithValue }) => {
    try {
      const performance = await studentService.getPerformanceMetrics();
      return performance;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch performance data');
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'student/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const profile = await studentService.getProfile();
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'student/updateProfile',
  async (data: any, { rejectWithValue }) => {
    try {
      const profile = await studentService.updateProfile(data);
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

export const fetchNotifications = createAsyncThunk(
  'student/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const notifications = await studentService.getNotifications();
      return notifications;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'student/markNotificationAsRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await studentService.markNotificationAsRead(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }
);

export const fetchCourses = createAsyncThunk(
  'student/fetchCourses',
  async (_, { rejectWithValue }) => {
    try {
      const courses = await studentService.getCourses();
      return courses;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch courses');
    }
  }
);

const studentSlice = createSlice({
  name: 'student',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.dashboardError = null;
      state.assignmentsError = null;
      state.submissionError = null;
      state.gradesError = null;
      state.performanceError = null;
      state.profileError = null;
      state.notificationsError = null;
      state.coursesError = null;
    },
    setSelectedCourse: (state, action: PayloadAction<number | null>) => {
      state.selectedCourse = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload;
    },
    setShowCompletedAssignments: (state, action: PayloadAction<boolean>) => {
      state.showCompletedAssignments = action.payload;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    resetUploadProgress: (state) => {
      state.uploadProgress = 0;
    },
    setCurrentAssignment: (state, action: PayloadAction<Assignment | null>) => {
      state.currentAssignment = action.payload;
    },
    setCurrentSubmission: (state, action: PayloadAction<Submission | null>) => {
      state.currentSubmission = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Dashboard data
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardData = action.payload;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload as string;
      });

    // Assignments
    builder
      .addCase(fetchAssignments.pending, (state) => {
        state.assignmentsLoading = true;
        state.assignmentsError = null;
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.assignmentsLoading = false;
        state.assignments = action.payload;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.assignmentsLoading = false;
        state.assignmentsError = action.payload as string;
      });

    builder
      .addCase(fetchAssignment.pending, (state) => {
        state.assignmentsLoading = true;
        state.assignmentsError = null;
      })
      .addCase(fetchAssignment.fulfilled, (state, action) => {
        state.assignmentsLoading = false;
        state.currentAssignment = action.payload;
      })
      .addCase(fetchAssignment.rejected, (state, action) => {
        state.assignmentsLoading = false;
        state.assignmentsError = action.payload as string;
      });

    // Submit assignment
    builder
      .addCase(submitAssignment.pending, (state) => {
        state.submissionLoading = true;
        state.submissionError = null;
      })
      .addCase(submitAssignment.fulfilled, (state, action) => {
        state.submissionLoading = false;
        state.currentSubmission = action.payload;
        state.submissions.push(action.payload);
        state.uploadProgress = 0;
      })
      .addCase(submitAssignment.rejected, (state, action) => {
        state.submissionLoading = false;
        state.submissionError = action.payload as string;
        state.uploadProgress = 0;
      });

    // Submissions
    builder
      .addCase(fetchSubmissions.pending, (state) => {
        state.submissionLoading = true;
        state.submissionError = null;
      })
      .addCase(fetchSubmissions.fulfilled, (state, action) => {
        state.submissionLoading = false;
        state.submissions = action.payload;
      })
      .addCase(fetchSubmissions.rejected, (state, action) => {
        state.submissionLoading = false;
        state.submissionError = action.payload as string;
      });

    // Grades
    builder
      .addCase(fetchGrades.pending, (state) => {
        state.gradesLoading = true;
        state.gradesError = null;
      })
      .addCase(fetchGrades.fulfilled, (state, action) => {
        state.gradesLoading = false;
        state.grades = action.payload;
      })
      .addCase(fetchGrades.rejected, (state, action) => {
        state.gradesLoading = false;
        state.gradesError = action.payload as string;
      });

    // Performance
    builder
      .addCase(fetchPerformance.pending, (state) => {
        state.performanceLoading = true;
        state.performanceError = null;
      })
      .addCase(fetchPerformance.fulfilled, (state, action) => {
        state.performanceLoading = false;
        state.performance = action.payload;
      })
      .addCase(fetchPerformance.rejected, (state, action) => {
        state.performanceLoading = false;
        state.performanceError = action.payload as string;
      });

    // Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload as string;
      });

    builder
      .addCase(updateProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload as string;
      });

    // Notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.notificationsLoading = true;
        state.notificationsError = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notificationsLoading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter(n => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.notificationsLoading = false;
        state.notificationsError = action.payload as string;
      });

    builder
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });

    // Courses
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.coursesLoading = true;
        state.coursesError = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.coursesLoading = false;
        state.courses = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.coursesLoading = false;
        state.coursesError = action.payload as string;
      });
  },
});

export const {
  clearErrors,
  setSelectedCourse,
  setViewMode,
  setShowCompletedAssignments,
  setUploadProgress,
  resetUploadProgress,
  setCurrentAssignment,
  setCurrentSubmission,
} = studentSlice.actions;

export default studentSlice.reducer;
