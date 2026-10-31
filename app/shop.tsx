import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

export default function ShopRedirect() {
  const params = useLocalSearchParams();
  useEffect(() => {
    router.replace({ pathname: '/(tabs)/shop', params: params as never });
  }, [params]);
  return null;
}

