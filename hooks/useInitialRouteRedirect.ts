// hooks/useInitialRouteRedirect.tsx
import { useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

// Helper function (기존과 동일)
const isCurrentPath = (
  currentSegments: string[],
  targetPath: string
): boolean => {
  const targetPathSegments = targetPath.startsWith("/")
    ? targetPath
        .substring(1)
        .split("/")
        .filter((s) => s.length > 0)
    : targetPath.split("/").filter((s) => s.length > 0);

  if (targetPathSegments.length === 0) {
    return currentSegments.length === 0;
  }
  if (currentSegments.length !== targetPathSegments.length) {
    return false;
  }
  return currentSegments.every(
    (seg, index) => seg === targetPathSegments[index]
  );
};

// 사용자가 모든 설정을 완료했을 때 리디렉션에서 제외할 경로들의 첫 번째 세그먼트 목록
const ALLOWED_FIRST_SEGMENTS_WHEN_FULLY_SETUP = [
  "(tabs)", // 메인 탭 화면 그룹
  "settings", // 설정 페이지
  "search", // 검색 페이지
  "bubble", // 버블 폼 페이지 허용
  "match", // 매칭 페이지 허용
];

export function useInitialRouteRedirect() {
  const router = useRouter();
  const segments: string[] = useSegments();

  const [isRedirectLogicCompleted, setIsRedirectLogicCompleted] =
    useState(false);

  const {
    isLoggedIn,
    hasCompletedOnboarding,
    hasCompletedProfileSetup,
    loading,
  } = useAuth();

  useEffect(() => {
    if (loading) {
      console.log("useInitialRouteRedirect: Auth state is loading...");
      if (isRedirectLogicCompleted) setIsRedirectLogicCompleted(false);
      return;
    }

    console.log("useInitialRouteRedirect: Evaluating redirection logic.");
    let isActive = true;

    const checkStatusAndRedirect = () => {
      try {
        if (!isActive) return;

        const currentPathForLogging = "/" + segments.join("/");
        const currentFirstSegment = segments.length > 0 ? segments[0] : null;

        console.log(
          `useInitialRouteRedirect Status: isLoggedIn=${isLoggedIn}, onboarding=${hasCompletedOnboarding}, profileSetup=${hasCompletedProfileSetup}, currentPath='${currentPathForLogging}'`
        );

        if (!isLoggedIn && currentFirstSegment !== "login") {
          console.log("Redirecting to /login");
          if (isActive) router.replace("/login");
        } else if (
          isLoggedIn &&
          !hasCompletedOnboarding &&
          currentFirstSegment !== "onboarding"
        ) {
          console.log("Redirecting to /onboarding");
          if (isActive) router.replace("/onboarding");
        } else if (
          isLoggedIn &&
          hasCompletedOnboarding &&
          !hasCompletedProfileSetup &&
          !isCurrentPath(segments, "/onboarding/profile-setup")
        ) {
          console.log("Redirecting to /onboarding/profile-setup");
          if (isActive) router.replace("/onboarding/profile-setup");
        } else if (
          isLoggedIn &&
          hasCompletedOnboarding &&
          hasCompletedProfileSetup &&
          currentFirstSegment && // 현재 경로의 첫 번째 세그먼트가 존재하고
          !ALLOWED_FIRST_SEGMENTS_WHEN_FULLY_SETUP.includes(currentFirstSegment) // 허용된 경로 목록에 없다면
        ) {
          console.log(
            `Redirecting to /(tabs) (User is fully set up, currentPath='${currentPathForLogging}' is not in allowed list [${ALLOWED_FIRST_SEGMENTS_WHEN_FULLY_SETUP.join(
              ", "
            )}])`
          );
          if (isActive) router.replace("/(tabs)");
        } else {
          console.log("No redirect needed or on an allowed screen.");
        }
      } catch (e) {
        console.error("Error during redirection logic:", e);
      } finally {
        if (isActive) {
          setIsRedirectLogicCompleted(true);
          console.log("useInitialRouteRedirect: Redirection logic completed.");
        }
      }
    };

    if (segments) {
      checkStatusAndRedirect();
    }

    return () => {
      isActive = false;
      console.log("useInitialRouteRedirect: useEffect cleanup.");
    };
  }, [
    router,
    segments,
    isLoggedIn,
    hasCompletedOnboarding,
    hasCompletedProfileSetup,
    loading,
  ]);

  return { isReady: isRedirectLogicCompleted };
}
