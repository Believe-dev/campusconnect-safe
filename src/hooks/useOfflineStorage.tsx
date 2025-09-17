import { useState, useEffect } from 'react';

interface OfflineStorageOptions<T> {
  key: string;
  defaultValue: T;
  ttl?: number; // Time to live in milliseconds
}

export const useOfflineStorage = <T,>({
  key,
  defaultValue,
  ttl = 24 * 60 * 60 * 1000 // 24 hours default
}: OfflineStorageOptions<T>) => {
  const [data, setData] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if data has expired
        if (parsed.timestamp && Date.now() - parsed.timestamp > ttl) {
          localStorage.removeItem(key);
          return defaultValue;
        }
        return parsed.data || defaultValue;
      }
    } catch {
      localStorage.removeItem(key);
    }
    return defaultValue;
  });

  const setStoredData = (newData: T) => {
    try {
      const toStore = {
        data: newData,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(toStore));
      setData(newData);
    } catch (error) {
      console.warn('Failed to store data offline:', error);
      setData(newData);
    }
  };

  const clearStoredData = () => {
    localStorage.removeItem(key);
    setData(defaultValue);
  };

  return [data, setStoredData, clearStoredData] as const;
};