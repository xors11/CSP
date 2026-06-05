import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

export function useResult(resultId) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResult = useCallback(async () => {
    if (!resultId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/results/${resultId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch result (status ${res.status})`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('[useResult] Fetch error:', err);
      setError(err.message || 'An error occurred while loading results.');
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  return { result, loading, error, refetch: fetchResult };
}

export default useResult;
