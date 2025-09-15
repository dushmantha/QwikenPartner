/**
 * Performance optimization utilities for React Native
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';

// Debounce hook for expensive operations
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for scroll events
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCall = useRef<number>(0);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }

      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        return callback(...args);
      } else {
        timeoutId.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
        }, delay - (now - lastCall.current));
      }
    }) as T,
    [callback, delay]
  );
};

// Memoized API call hook
export const useMemoizedAPI = <T>(
  apiCall: () => Promise<T>,
  dependencies: any[],
  cacheKey?: string
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, T>>(new Map());

  const fetchData = useCallback(async () => {
    const key = cacheKey || JSON.stringify(dependencies);
    
    // Check cache first
    if (cache.current.has(key)) {
      setData(cache.current.get(key)!);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
      cache.current.set(key, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = useCallback(() => {
    const key = cacheKey || JSON.stringify(dependencies);
    cache.current.delete(key);
    fetchData();
  }, [fetchData, cacheKey, dependencies]);

  return { data, loading, error, refetch };
};

// Performance monitoring
export const performanceMonitor = {
  startTiming: (label: string) => {
    console.time(label);
  },
  
  endTiming: (label: string) => {
    console.timeEnd(label);
  },
  
  measureRender: (componentName: string) => {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = function (...args: any[]) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const end = performance.now();
        
        if (end - start > 16) { // Longer than one frame
          console.warn(`Slow render in ${componentName}.${propertyName}: ${end - start}ms`);
        }
        
        return result;
      };
      
      return descriptor;
    };
  }
};

// Image preloader for better UX
export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => {
    return new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject();
      image.src = url;
    });
  });
  
  try {
    await Promise.allSettled(promises);
  } catch (error) {
    console.warn('Some images failed to preload');
  }
};

import { useState } from 'react';