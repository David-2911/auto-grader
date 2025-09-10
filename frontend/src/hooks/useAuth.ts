import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { loginStart, loginSuccess, loginFailure, logout } from '@/store/slices/authSlice';
import { useLoginMutation, useRegisterMutation, useGetCurrentUserQuery } from '@/store/api/apiSlice';
import { LoginCredentials, RegisterData } from '@/types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, loading, error } = useAppSelector(
    (state) => state.auth
  );

  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  
  // Get current user if token exists
  const { data: currentUserData, isLoading: isLoadingUser } = useGetCurrentUserQuery(
    undefined,
    { skip: !token }
  );

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch(loginStart());
      const result = await loginMutation(credentials).unwrap();
      
      if (result.success && result.data) {
        dispatch(loginSuccess(result.data));
        return { success: true };
      } else {
        dispatch(loginFailure(result.message || 'Login failed'));
        return { success: false, error: result.message };
      }
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Login failed';
      dispatch(loginFailure(errorMessage));
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      dispatch(loginStart());
      const result = await registerMutation(userData).unwrap();
      
      if (result.success && result.data) {
        dispatch(loginSuccess(result.data));
        return { success: true };
      } else {
        dispatch(loginFailure(result.message || 'Registration failed'));
        return { success: false, error: result.message };
      }
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Registration failed';
      dispatch(loginFailure(errorMessage));
      return { success: false, error: errorMessage };
    }
  };

  const logoutUser = () => {
    dispatch(logout());
  };

  const hasRole = (roles: string | string[]) => {
    if (!user) return false;
    const userRoles = Array.isArray(roles) ? roles : [roles];
    return userRoles.includes(user.role);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    // Add permission checking logic based on your requirements
    return true;
  };

  return {
    user,
    token,
    isAuthenticated,
    loading: loading || isLoadingUser,
    error,
    login,
    register,
    logout: logoutUser,
    hasRole,
    hasPermission,
  };
};
