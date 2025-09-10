import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';
import {
  User,
  Course,
  Assignment,
  Submission,
  LoginCredentials,
  RegisterData,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Course', 'Assignment', 'Submission'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<ApiResponse<{ user: User; token: string }>, LoginCredentials>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<ApiResponse<{ user: User; token: string }>, RegisterData>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    getCurrentUser: builder.query<ApiResponse<User>, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    
    // User management
    getUsers: builder.query<PaginatedResponse<User>, { page?: number; limit?: number; role?: string }>({
      query: ({ page = 1, limit = 10, role }) => ({
        url: '/users',
        params: { page, limit, role },
      }),
      providesTags: ['User'],
    }),
    getUserById: builder.query<ApiResponse<User>, number>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    updateUser: builder.mutation<ApiResponse<User>, { id: number; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    
    // Course endpoints
    getCourses: builder.query<PaginatedResponse<Course>, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 10 }) => ({
        url: '/courses',
        params: { page, limit },
      }),
      providesTags: ['Course'],
    }),
    getCourseById: builder.query<ApiResponse<Course>, number>({
      query: (id) => `/courses/${id}`,
      providesTags: (result, error, id) => [{ type: 'Course', id }],
    }),
    createCourse: builder.mutation<ApiResponse<Course>, Partial<Course>>({
      query: (courseData) => ({
        url: '/courses',
        method: 'POST',
        body: courseData,
      }),
      invalidatesTags: ['Course'],
    }),
    updateCourse: builder.mutation<ApiResponse<Course>, { id: number; data: Partial<Course> }>({
      query: ({ id, data }) => ({
        url: `/courses/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Course', id }],
    }),
    deleteCourse: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: `/courses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Course'],
    }),
    
    // Assignment endpoints
    getAssignments: builder.query<PaginatedResponse<Assignment>, { courseId?: number; page?: number; limit?: number }>({
      query: ({ courseId, page = 1, limit = 10 }) => ({
        url: '/assignments',
        params: { courseId, page, limit },
      }),
      providesTags: ['Assignment'],
    }),
    getAssignmentById: builder.query<ApiResponse<Assignment>, number>({
      query: (id) => `/assignments/${id}`,
      providesTags: (result, error, id) => [{ type: 'Assignment', id }],
    }),
    createAssignment: builder.mutation<ApiResponse<Assignment>, Partial<Assignment>>({
      query: (assignmentData) => ({
        url: '/assignments',
        method: 'POST',
        body: assignmentData,
      }),
      invalidatesTags: ['Assignment'],
    }),
    updateAssignment: builder.mutation<ApiResponse<Assignment>, { id: number; data: Partial<Assignment> }>({
      query: ({ id, data }) => ({
        url: `/assignments/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Assignment', id }],
    }),
    deleteAssignment: builder.mutation<ApiResponse<void>, number>({
      query: (id) => ({
        url: `/assignments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Assignment'],
    }),
    
    // Submission endpoints
    getSubmissions: builder.query<PaginatedResponse<Submission>, { assignmentId?: number; studentId?: number; page?: number; limit?: number }>({
      query: ({ assignmentId, studentId, page = 1, limit = 10 }) => ({
        url: '/submissions',
        params: { assignmentId, studentId, page, limit },
      }),
      providesTags: ['Submission'],
    }),
    getSubmissionById: builder.query<ApiResponse<Submission>, number>({
      query: (id) => `/submissions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Submission', id }],
    }),
    createSubmission: builder.mutation<ApiResponse<Submission>, FormData>({
      query: (formData) => ({
        url: '/submissions',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Submission'],
    }),
    gradeSubmission: builder.mutation<ApiResponse<Submission>, { id: number; grade: number; feedback: string }>({
      query: ({ id, grade, feedback }) => ({
        url: `/submissions/${id}/grade`,
        method: 'PUT',
        body: { grade, feedback },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Submission', id }],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useGetAssignmentsQuery,
  useGetAssignmentByIdQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
  useGetSubmissionsQuery,
  useGetSubmissionByIdQuery,
  useCreateSubmissionMutation,
  useGradeSubmissionMutation,
} = api;
