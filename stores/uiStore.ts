import { create } from "zustand";
import { EventBus } from "@/services/EventBus";

// UI 관련 상태를 위한 인터페이스 정의
interface UIState {
  // --- 탭 바 관련 상태 및 함수 ---
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  customTabBarHeight: number; // [추가] 탭 바의 실제 높이를 저장할 상태
  setCustomTabBarHeight: (height: number) => void; // [추가] 탭 바 높이를 설정하는 함수

  // --- 알림 배지 관련 상태 및 함수 ---
  unreadLikesCount: number;
  setUnreadLikesCount: (count: number) => void;
  decrementUnreadLikes: () => void;
  
  // --- 채팅 메시지 알림 배지 관련 상태 및 함수 ---
  totalUnreadMessages: number;
  setTotalUnreadMessages: (count: number) => void;

  // --- Global notification refresh functions ---
  refreshLikesCount: ((userId: string) => Promise<void>) | null;
  refreshMessagesCount: ((userId: string) => Promise<void>) | null;
  setRefreshLikesCount: (fn: (userId: string) => Promise<void>) => void;
  setRefreshMessagesCount: (fn: (userId: string) => Promise<void>) => void;

  // --- EventBus integration ---
  initializeEventListeners: () => void;
  cleanupEventListeners: () => void;

  // 여기에 다른 UI 요소들의 가시성 상태 및 제어 함수들을 추가할 수 있습니다.
}

/**
 * UI 요소들의 상태를 관리하는 Zustand 스토어입니다.
 * 탭 바의 가시성 및 실제 높이를 저장하고 제어하는 상태와 함수를 포함합니다.
 */
export const useUIStore = create<UIState>((set, get) => {
  let eventUnsubscribers: Array<() => void> = [];

  return {
  // --- 탭 바 관련 상태 및 함수 ---
  isTabBarVisible: true, // 기본적으로 탭 바는 보이도록 설정
  showTabBar: () => {
    console.log("UIStore: showTabBar called - Setting isTabBarVisible to true");
    set({ isTabBarVisible: true });
  },
  hideTabBar: () => {
    console.log(
      "UIStore: hideTabBar called - Setting isTabBarVisible to false"
    );
    set({ isTabBarVisible: false });
  },

  // --- 탭 바 높이 관련 상태 및 함수 ---
  // [추가] 초기 높이값은 앱 로딩 중 레이아웃 깨짐을 방지하기 위해 적절한 예상치로 설정합니다.
  // (대략적인 버튼 높이 + 상하 패딩 + 하단 여백)
  customTabBarHeight: 80,
  setCustomTabBarHeight: (height) => {
    // console.log(`UIStore: Setting custom tab bar height to ${height}`); // 디버깅 필요시 주석 해제
    set({ customTabBarHeight: height });
  },

  // --- 알림 배지 관련 상태 및 함수 ---
  unreadLikesCount: 0,
  setUnreadLikesCount: (count) => {
    console.log(`UIStore: Setting unread likes count to ${count}`);
    set({ unreadLikesCount: Math.max(0, count) }); // 음수 방지
  },
  decrementUnreadLikes: () => {
    set((state) => {
      const newCount = Math.max(0, state.unreadLikesCount - 1);
      console.log(`UIStore: Decrementing unread likes from ${state.unreadLikesCount} to ${newCount}`);
      return { unreadLikesCount: newCount };
    });
  },

  // --- 채팅 메시지 알림 배지 관련 상태 및 함수 ---
  totalUnreadMessages: 0,
  setTotalUnreadMessages: (count) => {
    console.log(`UIStore: Setting total unread messages to ${count}`);
    set({ totalUnreadMessages: Math.max(0, count) }); // 음수 방지
  },

  // --- Global notification refresh functions ---
  refreshLikesCount: null,
  refreshMessagesCount: null,
  setRefreshLikesCount: (fn) => {
    console.log('UIStore: Setting refresh likes count function');
    set({ refreshLikesCount: fn });
  },
  setRefreshMessagesCount: (fn) => {
    console.log('UIStore: Setting refresh messages count function');
    set({ refreshMessagesCount: fn });
  },

  // --- EventBus integration ---
  initializeEventListeners: () => {
    console.log('UIStore: Initializing EventBus listeners');
    
    // Listen for refresh events
    const unsubRefreshMessages = EventBus.onEvent('REFRESH_MESSAGES_COUNT', () => {
      const { refreshMessagesCount } = get();
      // We need a way to get current user ID - for now we'll trigger the existing refresh
      console.log('UIStore: Received REFRESH_MESSAGES_COUNT event');
      // Note: This will be called by RealtimeProvider which already handles the refresh
    });

    const unsubRefreshLikes = EventBus.onEvent('REFRESH_LIKES_COUNT', () => {
      const { refreshLikesCount } = get();
      console.log('UIStore: Received REFRESH_LIKES_COUNT event');
      // Note: This will be called by RealtimeProvider which already handles the refresh
    });

    // Listen for new invitations
    const unsubNewInvitation = EventBus.onEvent('NEW_INVITATION', (payload) => {
      console.log('UIStore: New invitation received:', payload);
      // Could trigger a notification or update invitation count here
    });

    // Listen for new matches
    const unsubNewMatch = EventBus.onEvent('NEW_MATCH', (payload) => {
      console.log('UIStore: New match received:', payload);
      // Could trigger a match notification here
    });

    // Store unsubscribers
    eventUnsubscribers = [
      unsubRefreshMessages,
      unsubRefreshLikes,
      unsubNewInvitation,
      unsubNewMatch
    ];
  },

  cleanupEventListeners: () => {
    console.log('UIStore: Cleaning up EventBus listeners');
    eventUnsubscribers.forEach(unsub => unsub());
    eventUnsubscribers = [];
  },
}});

// Initialize event listeners when store is created
useUIStore.getState().initializeEventListeners();

// 스토어 사용 예시 (다른 컴포넌트에서):
// import { useUIStore } from '@/stores/uiStore'; // 실제 경로로 수정
//
// function SomeComponent() {
//   const { isTabBarVisible, hideTabBar, showTabBar } = useUIStore();
//
//   // 탭 바 숨기기
//   // if (condition) hideTabBar();
//
//   return (
//     <Text>탭 바가 보이나요? {isTabBarVisible ? '네' : '아니요'}</Text>
//   );
// }
