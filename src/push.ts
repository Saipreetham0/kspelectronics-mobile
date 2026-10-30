import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { api } from './api';

// Order updates by push. The phone's Expo push token is sent to the store (POST /api/push/register); the store sends the messages.
// A banner shows while the app is open; tapping a notification opens the screen named in its `url` (for example /order/123).
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });

// ask=false registers only when permission was already given (every launch); ask=true shows the system prompt (right after an order, when it makes sense).
export async function registerPush(ask: boolean) {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('orders', { name: 'Order updates', importance: Notifications.AndroidImportance.HIGH });
    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask && canAskAgain) status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api('/api/push/register', { method: 'POST', body: { token, platform: Platform.OS } });
  } catch { /* the store may not accept tokens yet: the app works the same without push */ }
}

// Tapping a notification: only in-app paths are followed.
export function onNotificationTap() {
  const open = (url?: unknown) => { if (typeof url === 'string' && url.startsWith('/')) router.push(url as never); };
  Notifications.getLastNotificationResponseAsync().then((r) => open(r?.notification.request.content.data?.url)).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data?.url));
  return () => sub.remove();
}
