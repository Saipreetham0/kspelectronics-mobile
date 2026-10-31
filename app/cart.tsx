import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

export default function CartRedirect() {
  const params = useLocalSearchParams();
  useEffect(() => {
    router.replace({ pathname: '/(tabs)/cart', params: params as never });
  }, [params]);
  return null;
}

