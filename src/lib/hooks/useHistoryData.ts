'use client';

import { useState, useEffect } from 'react';
import { HistoryItem } from '@lib/types/history';

export function useHistoryData(initialData: HistoryItem[]) {
  const [histories, setHistories] = useState<HistoryItem[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHistories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    histories,
    isLoading,
    error,
    refreshHistories
  };
}