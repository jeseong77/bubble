import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerPushTokenForUser } from '@/lib/pushNotifications';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Push Notification Token 등록 및 관리 Hook
 *
 * 기능:
 * - 로그인 시 자동으로 push token 등록
 * - AppState 변경 시 token 갱신 (앱이 백그라운드에서 돌아올 때)
 * - Notification 수신 이벤트 리스너 제공
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const appState = useRef(AppState.currentState);

  // Push Token 등록 함수
  const registerToken = async () => {
    if (!session?.user?.id) return;

    const token = await registerPushTokenForUser(session.user.id);
    if (token) {
      setExpoPushToken(token);
    }
  };

  // 로그인 시 Token 등록
  useEffect(() => {
    if (session?.user?.id) {
      registerToken();
    } else {
      setExpoPushToken(null);
    }
  }, [session?.user?.id]);

  // Notification 이벤트 리스너 설정
  useEffect(() => {
    // Foreground에서 알림 수신 시
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        setNotification(notification);
      }
    );

    // 알림 탭 시
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        // 여기서 딥링킹 처리 가능
        // 예: router.push(response.notification.request.content.data.screen);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // AppState 변경 감지 (백그라운드 → Foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // 앱이 다시 활성화되면 token 갱신
          if (session?.user?.id) {
            registerToken();
          }
        }
        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [session?.user?.id]);

  return {
    expoPushToken,
    notification,
  };
}
