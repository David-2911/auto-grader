import React, { useEffect } from 'react';
import { useGetCurrentUserQuery } from '@/store/api/apiSlice';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { onTokensUpdated } from '@/auth/tokenScheduler';

// Mount early in App to fetch user if token exists but user not loaded
const AuthInitializer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector(s => s.auth);
  const skip = !!user || !token;
  const { data, error } = useGetCurrentUserQuery(undefined, { skip });

  useEffect(() => {
    if (data?.data && !user) {
      dispatch(setUser(data.data));
    }
    if (error) {
      // Intentionally silent; reauth wrapper will handle 401
    }
  }, [data, error, user, dispatch]);

  // Schedule refresh whenever token changes or on mount
  useEffect(() => {
    if (token) {
      onTokensUpdated();
    }
  }, [data, error, user, dispatch]);

  return null;
};

export default AuthInitializer;
