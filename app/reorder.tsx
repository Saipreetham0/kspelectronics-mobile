import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

export default function ReorderRedirect() {
  const params = useLocalSearchParams();
  useEffect(() => {
    router.replace({ pathname: '/(tabs)/reorder', params: params as never });
  }, [params]);
  return null;
}

