import { useState, useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/notificationSlice';

interface UseNotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const useNotification = (options: UseNotificationOptions = {}) => {
  const dispatch = useAppDispatch();
  const { duration = 5000 } = options;

  const showNotification = useCallback(
    (
      type: 'info' | 'success' | 'warning' | 'error',
      title: string,
      message: string,
      actionUrl?: string
    ) => {
      dispatch(
        addNotification({
          type,
          title,
          message,
          actionUrl,
          read: false,
        })
      );

      // Auto-remove notification after duration
      if (duration > 0) {
        setTimeout(() => {
          // Implementation would remove the specific notification
        }, duration);
      }
    },
    [dispatch, duration]
  );

  const showSuccess = useCallback(
    (title: string, message: string, actionUrl?: string) => {
      showNotification('success', title, message, actionUrl);
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message: string, actionUrl?: string) => {
      showNotification('error', title, message, actionUrl);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, actionUrl?: string) => {
      showNotification('warning', title, message, actionUrl);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, actionUrl?: string) => {
      showNotification('info', title, message, actionUrl);
    },
    [showNotification]
  );

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
