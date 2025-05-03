import { useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import useAuthStore from "@/stores/authStore"; // 경로 확인

export function useInitialRouteRedirect() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const hasCompletedOnboarding = useAuthStore(
    (state) => state.hasCompletedOnboarding
  );
  // --- 프로필 설정 완료 상태 가져오기 ---
  const hasCompletedProfileSetup = useAuthStore(
    (state) => state.hasCompletedProfileSetup
  );
  // ------------------------------------

  useEffect(() => {
    let isActive = true;

    const checkStatusAndRedirect = async () => {
      try {
        if (!isActive) return;

        const currentFirstSegment = segments.length > 0 ? segments[0] : null;
        const isOnboardingScreen = currentFirstSegment === "onboarding";
        const isLoginScreen = currentFirstSegment === "login";
        const isInAppGroup = currentFirstSegment === "(app)";
        // --- 프로필 설정 화면 경로 확인 추가 ---
        const isProfileSetupScreen =
          segments.join("/") === "onboarding/profile-setup"; // 경로 확인!
        // ----------------------------------

        console.log(
          `Status Check: isLoggedIn=${isLoggedIn}, hasCompletedOnboarding=${hasCompletedOnboarding}, hasCompletedProfileSetup=${hasCompletedProfileSetup}, currentSegment=${currentFirstSegment}`
        );

        // --- 리디렉션 로직 업데이트 ---
        if (!isLoggedIn && !isLoginScreen) {
          console.log("Redirecting to /login (Not logged in)");
          router.replace("/login");
        } else if (
          isLoggedIn &&
          !hasCompletedOnboarding &&
          !isOnboardingScreen
        ) {
          console.log(
            "Redirecting to /onboarding (Logged in, onboarding needed)"
          );
          router.replace("/onboarding");
        } else if (
          isLoggedIn &&
          hasCompletedOnboarding &&
          !hasCompletedProfileSetup && // <<< 프로필 설정 안됨 조건 추가
          !isProfileSetupScreen // <<< 현재 프로필 설정 화면이 아닐 때만 이동
        ) {
          console.log(
            "Redirecting to /onboarding/profile-setup (Logged in, onboarded, profile setup needed)"
          );
          router.replace("/onboarding/profile-setup"); // <<< 프로필 설정 화면 경로
        } else if (
          isLoggedIn &&
          hasCompletedOnboarding &&
          hasCompletedProfileSetup && // <<< 프로필 설정 완료 조건 추가
          !isInAppGroup
        ) {
          console.log(
            "Redirecting to /(app) (Logged in, onboarded, profile setup done)"
          );
          router.replace("/(app)");
        } else {
          console.log("No redirect needed.");
        }
        // --------------------------
      } catch (e) {
        console.error("Initialization error:", e);
        if (isActive && segments.length > 0 && segments[0] !== "login") {
          router.replace("/login");
        }
      } finally {
        if (isActive) {
          setIsReady(true);
        }
      }
    };

    checkStatusAndRedirect();

    return () => {
      isActive = false;
    };
    // --- 의존성 배열에 hasCompletedProfileSetup 추가 ---
  }, [
    router,
    segments,
    isLoggedIn,
    hasCompletedOnboarding,
    hasCompletedProfileSetup,
  ]);
  // ----------------------------------------------

  return { isReady };
}
