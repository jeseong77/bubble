import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserProfile {
  id: string;
  name?: string;
}

interface AuthState {
  isLoggedIn: boolean;
  authToken: string | null;
  user: UserProfile | null;
  hasCompletedOnboarding: boolean;
  hasCompletedProfileSetup: boolean; // <<< 프로필 설정 완료 상태 추가
  login: (token: string, userData: UserProfile) => void;
  logout: () => void;
  completeOnboarding: () => void;
  completeProfileSetup: () => void; // <<< 프로필 설정 완료 액션 추가
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      authToken: null,
      user: null,
      hasCompletedOnboarding: false,
      hasCompletedProfileSetup: false, // <<< 초기값 false 설정

      login: (token, userData) =>
        set({ isLoggedIn: true, authToken: token, user: userData }),
      logout: () => {
        set({
          isLoggedIn: false,
          authToken: null,
          user: null,
          hasCompletedOnboarding: false, // 로그아웃 시 온보딩부터 다시 하도록
          hasCompletedProfileSetup: false, // 프로필 설정도 리셋
        });
      },
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      completeProfileSetup: () => set({ hasCompletedProfileSetup: true }), // <<< 액션 구현
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        authToken: state.authToken,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasCompletedProfileSetup: state.hasCompletedProfileSetup, // <<< 영속화 상태에 추가
      }),
    }
  )
);

console.log("Initial auth state:", useAuthStore.getState());

export default useAuthStore;
