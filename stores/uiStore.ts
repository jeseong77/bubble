import { create } from "zustand";

// UI 관련 상태를 위한 인터페이스 정의
interface UIState {
  // 탭 바 관련 상태 및 함수
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;

  // 여기에 다른 UI 요소들의 가시성 상태 및 제어 함수들을 추가할 수 있습니다.
  // 예시:
  // isSomeModalVisible: boolean;
  // showSomeModal: () => void;
  // hideSomeModal: () => void;
  //
  // isAnotherOverlayVisible: boolean;
  // toggleAnotherOverlay: () => void;
}

/**
 * UI 요소들의 상태를 관리하는 Zustand 스토어입니다.
 * 현재는 탭 바의 가시성(isTabBarVisible)과 이를 제어하는 함수(showTabBar, hideTabBar)를 포함합니다.
 * 다른 UI 요소의 상태도 필요에 따라 확장할 수 있습니다.
 */
export const useUIStore = create<UIState>((set) => ({
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

  // --- 다른 UI 요소 관련 상태 및 함수 (예시, 필요시 주석 해제 및 구현) ---
  // isSomeModalVisible: false,
  // showSomeModal: () => set({ isSomeModalVisible: true }),
  // hideSomeModal: () => set({ isSomeModalVisible: false }),
  //
  // isAnotherOverlayVisible: true,
  // toggleAnotherOverlay: () => set((state) => ({ isAnotherOverlayVisible: !state.isAnotherOverlayVisible })),
}));

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
