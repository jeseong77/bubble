import { create } from "zustand";

// UI 관련 상태를 위한 인터페이스 정의
interface UIState {
  // --- 탭 바 관련 상태 및 함수 ---
  isTabBarVisible: boolean;
  showTabBar: () => void;
  hideTabBar: () => void;
  customTabBarHeight: number; // [추가] 탭 바의 실제 높이를 저장할 상태
  setCustomTabBarHeight: (height: number) => void; // [추가] 탭 바 높이를 설정하는 함수

  // 여기에 다른 UI 요소들의 가시성 상태 및 제어 함수들을 추가할 수 있습니다.
}

/**
 * UI 요소들의 상태를 관리하는 Zustand 스토어입니다.
 * 탭 바의 가시성 및 실제 높이를 저장하고 제어하는 상태와 함수를 포함합니다.
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

  // --- 탭 바 높이 관련 상태 및 함수 ---
  // [추가] 초기 높이값은 앱 로딩 중 레이아웃 깨짐을 방지하기 위해 적절한 예상치로 설정합니다.
  // (대략적인 버튼 높이 + 상하 패딩 + 하단 여백)
  customTabBarHeight: 80,
  setCustomTabBarHeight: (height) => {
    // console.log(`UIStore: Setting custom tab bar height to ${height}`); // 디버깅 필요시 주석 해제
    set({ customTabBarHeight: height });
  },
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
