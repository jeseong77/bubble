// hooks/useInitialRouteRedirect.tsx
import { useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import useAuthStore from "@/stores/authStore";

// Helper function (remains the same as before)
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

export function useInitialRouteRedirect() {
  const router = useRouter();
  const segments: string[] = useSegments();

  const [isRedirectLogicCompleted, setIsRedirectLogicCompleted] =
    useState(false);

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const hasCompletedOnboarding = useAuthStore(
    (state) => state.hasCompletedOnboarding
  );
  const hasCompletedProfileSetup = useAuthStore(
    (state) => state.hasCompletedProfileSetup
  );
  // const isAuthLoading = useAuthStore((state) => state.isLoading); // Example

  useEffect(() => {
    // if (isAuthLoading) {
    //   console.log("useInitialRouteRedirect: Waiting for auth state to load...");
    //   if (isRedirectLogicCompleted) setIsRedirectLogicCompleted(false);
    //   return;
    // }

    console.log("useInitialRouteRedirect: Evaluating redirection logic.");
    let isActive = true;

    const checkStatusAndRedirect = () => {
      try {
        if (!isActive) return;

        const currentPathForLogging = segments.join("/") || "/";
        const currentFirstSegment = segments.length > 0 ? segments[0] : null;

        console.log(
          `useInitialRouteRedirect Status: isLoggedIn=${isLoggedIn}, onboarding=${hasCompletedOnboarding}, profileSetup=${hasCompletedProfileSetup}, currentPath='${currentPathForLogging}'`
        );

        // --- MODIFIED LOGIC BELOW ---
        if (!isLoggedIn && currentFirstSegment !== "login") {
          // Check if NOT in any /login/... path
          console.log(
            "Redirecting to /login (User is not logged in and not in login flow)"
          );
          if (isActive) router.replace("/login");
        } else if (
          isLoggedIn &&
          !hasCompletedOnboarding &&
          currentFirstSegment !== "onboarding" // Check if NOT in any /onboarding/... path
        ) {
          console.log(
            "Redirecting to /onboarding (User is logged in, needs onboarding, and not in onboarding flow)"
          );
          if (isActive) router.replace("/onboarding");
        } else if (
          isLoggedIn &&
          hasCompletedOnboarding &&
          !hasCompletedProfileSetup &&
          !isCurrentPath(segments, "/onboarding/profile-setup") // Assuming profile-setup is a specific endpoint or base
        ) {
          // If /onboarding/profile-setup itself has sub-routes, this might need segments[0] === 'onboarding' && segments[1] === 'profile-setup' type check
          console.log("Redirecting to /onboarding/profile-setup");
          if (isActive) router.replace("/onboarding/profile-setup");
        } else if (
          isLoggedIn &&
          hasCompletedOnboarding &&
          hasCompletedProfileSetup &&
          currentFirstSegment !== "(app)" // Assuming main app routes are under an (app) group
          // and you want to redirect if not already in that group.
          // If your main app isn't in a group, adjust this check.
        ) {
          console.log(
            "Redirecting to /(app) (User is fully set up, redirecting to main app area)"
          );
          if (isActive) router.replace("/(app)"); // Or specific home like "/(app)/home"
        } else {
          console.log(
            "No redirect needed or already on an appropriate screen for the current state."
          );
        }
      } catch (e) {
        console.error("Error during redirection logic:", e);
      } finally {
        if (isActive) {
          setIsRedirectLogicCompleted(true);
        }
      }
    };

    checkStatusAndRedirect();

    return () => {
      isActive = false;
    };
  }, [
    router,
    segments,
    isLoggedIn,
    hasCompletedOnboarding,
    hasCompletedProfileSetup,
    // isAuthLoading,
  ]);

  return { isReady: isRedirectLogicCompleted };
}
