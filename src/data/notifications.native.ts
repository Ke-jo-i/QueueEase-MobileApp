import { isRunningInExpoGo } from 'expo';
import { Alert, Platform } from 'react-native';

export const turnAlertDelivery = isRunningInExpoGo() ? 'in-app' : 'notification';
let notifications: Promise<typeof import('expo-notifications')> | undefined;

function loadNotifications() {
  notifications ??= import('expo-notifications').then(async (sdk) => {
    sdk.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await sdk.setNotificationChannelAsync('queue-turns', {
        name: 'Queue turns',
        importance: sdk.AndroidImportance.HIGH,
      });
    }
    return sdk;
  }).catch((error) => {
    notifications = undefined;
    throw error;
  });
  return notifications;
}

export async function requestTurnAlerts() {
  if (turnAlertDelivery === 'in-app') return true;
  const sdk = await loadNotifications();
  const permission = await sdk.requestPermissionsAsync();
  return permission.granted;
}

export async function notifyTurn(title: string, body: string) {
  if (turnAlertDelivery === 'in-app') {
    Alert.alert(title, body);
    return;
  }
  const sdk = await loadNotifications();
  const permission = await sdk.getPermissionsAsync();
  if (!permission.granted) return;
  await sdk.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: Platform.OS === 'android' ? { channelId: 'queue-turns' } : null,
  });
}
