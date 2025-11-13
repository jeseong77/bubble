import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Push Notification 권한 요청 및 Device Token 가져오기
 * @returns ExpoPushToken 문자열 또는 null
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // 물리 디바이스 체크
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  try {
    // 1. 현재 권한 상태 확인
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 2. 권한이 없으면 요청
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // 3. 권한이 거부되면 null 반환
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // 4. Expo Push Token 가져오기
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error('EAS Project ID not found in app config');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // 5. Android의 경우 알림 채널 설정
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Supabase users 테이블에 Push Token 저장
 * @param userId - Auth User ID
 * @param pushToken - Expo Push Token
 * @returns 성공 여부
 */
export async function updatePushTokenInSupabase(
  userId: string,
  pushToken: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        expo_push_token: pushToken,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating push token in Supabase:', error);
      return false;
    }

    console.log('Push token successfully saved to Supabase');
    return true;
  } catch (error) {
    console.error('Error updating push token:', error);
    return false;
  }
}

/**
 * Push Token 등록 전체 파이프라인
 * @param userId - Auth User ID
 * @returns 등록된 Push Token 또는 null
 */
export async function registerPushTokenForUser(
  userId: string
): Promise<string | null> {
  const pushToken = await registerForPushNotificationsAsync();

  if (!pushToken) {
    console.log('Could not get push token');
    return null;
  }

  const success = await updatePushTokenInSupabase(userId, pushToken);

  if (!success) {
    console.log('Failed to save push token to database');
    return null;
  }

  return pushToken;
}

/**
 * Notification Handlers 설정
 * Foreground에서 알림을 어떻게 표시할지 결정
 */
export function configurePushNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
