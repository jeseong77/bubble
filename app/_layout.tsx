// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import "core-js/actual/structured-clone";
import { useInitialRouteRedirect } from "../hooks/useInitialRouteRedirect";
import { ThemeProvider } from "@/theme/ThemeContext";
import { AuthProvider } from "@/providers/AuthProvider";
import RealtimeProvider from "@/providers/RealtimeProvider"; // [추가] RealtimeProvider 임포트
import { MatchmakingProvider } from "@/providers/MatchmakingProvider"; // [추가] MatchmakingProvider 임포트
import { configurePushNotifications } from "@/lib/pushNotifications";

SplashScreen.preventAutoHideAsync();

function AppInitializer() {
  console.log("AppInitializer: Component rendering.");
  const { isReady: isRoutingLogicProcessed } = useInitialRouteRedirect();

  useEffect(() => {
    if (isRoutingLogicProcessed) {
      console.log(
        "AppInitializer: Routing logic processed. Hiding splash screen."
      );
      SplashScreen.hideAsync();
    } else {
      console.log("AppInitializer: Routing logic not yet processed.");
    }
  }, [isRoutingLogicProcessed]);

  if (!isRoutingLogicProcessed) {
    console.log(
      "AppInitializer: Waiting for routing logic processing. Returning null."
    );
    return null;
  }

  console.log(
    "AppInitializer: Routing logic processed. Rendering Stack Navigator."
  );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          animation: "fade",
          animationDuration: 400,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          animation: "flip",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  console.log("RootLayout: Component rendering/re-rendering.");

  const [fontsLoaded, fontError] = useFonts({
    "Quicksand-Light": require("../assets/fonts/Quicksand-Light.ttf"),
    "Quicksand-Regular": require("../assets/fonts/Quicksand-Regular.ttf"),
    "Quicksand-Medium": require("../assets/fonts/Quicksand-Medium.ttf"),
    "Quicksand-SemiBold": require("../assets/fonts/Quicksand-SemiBold.ttf"),
    "Quicksand-Bold": require("../assets/fonts/Quicksand-Bold.ttf"),
  });

  useEffect(() => {
    if (fontError) {
      console.error("RootLayout: Font loading error:", fontError);
    }
  }, [fontError]);

  // Push Notification 핸들러 설정 (앱 시작 시 한 번)
  useEffect(() => {
    console.log("RootLayout: Configuring push notifications");
    configurePushNotifications();
  }, []);

  if (!fontsLoaded && !fontError) {
    console.log("RootLayout: Fonts not loaded yet. Returning null.");
    return null;
  }

  console.log(
    "RootLayout: Fonts are ready. Rendering ThemeProvider and AppInitializer."
  );

  return (
    <ThemeProvider>
      <AuthProvider>
        {/* [변경] RealtimeProvider로 AppInitializer를 감싸줍니다. */}
        <RealtimeProvider>
          <MatchmakingProvider>
            <AppInitializer />
          </MatchmakingProvider>
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
