import { useEffect, useRef } from 'react';

/**
 * Hook to automatically clear loading states after a timeout
 * Prevents infinite loading screens
 */
export const useLoadingTimeout = (
  isLoading: boolean,
  onTimeout: () => void,
  timeout: number = 10000
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Set timeout to clear loading state
      timeoutRef.current = setTimeout(() => {
        console.warn(`⚠️ Loading timeout after ${timeout}ms - force clearing`);
        onTimeout();
      }, timeout);
    } else {
      // Clear timeout if loading finished normally
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, timeout, onTimeout]);
};