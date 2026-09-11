import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export default function useScreenRefresh(loader, onSuccess, dependencies = []) {
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const lastLoadedAtRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!mountedRef.current) return;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await loader();
      if (mountedRef.current && requestRef.current === requestId) {
        onSuccess(result);
        lastLoadedAtRef.current = Date.now();
      }
    } catch (loadError) {
      if (mountedRef.current && requestRef.current === requestId) {
        setError(loadError);
      }
    } finally {
      if (mountedRef.current && requestRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loader, onSuccess, ...dependencies]);

  const refresh = useCallback(() => load(true), [load]);
  const retry = useCallback(() => load(), [load]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && Date.now() - lastLoadedAtRef.current > 30000) {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      load();

      return () => {
        mountedRef.current = false;
      };
    }, [load])
  );

  return {
    loading,
    refreshing,
    error,
    refresh,
    retry,
  };
}
