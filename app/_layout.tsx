// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Literata_400Regular,
  Literata_500Medium,
  Literata_600SemiBold,
} from "@expo-google-fonts/literata";

import { useInitialRouteRedirect } from "../hooks/useInitialRouteRedirect"; // 이 훅의 실제 경로를 확인해주세요.
import { ThemeProvider } from "@/theme/ThemeContext"; // ThemeProvider 임포트 (경로 확인!)

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
          animation: "fade", // (tabs)로 전환 시 페이드 애니메이션
          animationDuration: 400,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          animation: "flip", // settings로 전환 시 플립 애니메이션
        }}
      />
      <Stack.Screen
        name="bubble"
        options={{
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      {/* 다른 최상위 스택 스크린이 있다면 여기에 추가 */}
    </Stack>
  );
}

export default function RootLayout() {
  console.log("RootLayout: Component rendering/re-rendering.");

  const [fontsLoaded, fontError] = useFonts({
    Literata: Literata_400Regular,
    "Literata-Bold": Literata_600SemiBold,
    "LeagueSpartan-Thin": require("../assets/fonts/LeagueSpartan-Thin.ttf"), // 폰트 경로 확인
    "LeagueSpartan-ExtraLight": require("../assets/fonts/LeagueSpartan-ExtraLight.ttf"),
    "LeagueSpartan-Light": require("../assets/fonts/LeagueSpartan-Light.ttf"),
    "LeagueSpartan-Regular": require("../assets/fonts/LeagueSpartan-Regular.ttf"),
    "LeagueSpartan-Medium": require("../assets/fonts/LeagueSpartan-Medium.ttf"),
    "LeagueSpartan-SemiBold": require("../assets/fonts/LeagueSpartan-SemiBold.ttf"),
    "LeagueSpartan-Bold": require("../assets/fonts/LeagueSpartan-Bold.ttf"),
    "LeagueSpartan-ExtraBold": require("../assets/fonts/LeagueSpartan-ExtraBold.ttf"),
    "LeagueSpartan-Black": require("../assets/fonts/LeagueSpartan-Black.ttf"),
    "SpaceMono-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (fontError) {
      console.error("RootLayout: Font loading error:", fontError);
      // 폰트 로딩 실패 시 스플래시 스크린을 강제로 숨기고 에러 화면을 보여주는 등의 처리를 고려할 수 있습니다.
      // SplashScreen.hideAsync();
    }
    // 스플래시 스크린 숨김 로직은 AppInitializer 내부로 이동되었습니다.
    // (isRoutingLogicProcessed가 true가 될 때 숨겨짐)
  }, [fontError]);

  // 폰트가 로드되거나, 폰트 로딩 중 에러가 발생할 때까지 (즉, 폰트 관련 처리가 끝날 때까지) 기다립니다.
  if (!fontsLoaded && !fontError) {
    console.log("RootLayout: Fonts not loaded yet. Returning null.");
    return null; // 이 동안 스플래시 스크린이 계속 표시됩니다.
  }

  console.log(
    "RootLayout: Fonts are ready. Rendering ThemeProvider and AppInitializer."
  );
  // ThemeProvider로 AppInitializer를 감싸서 앱 전체에 테마 컨텍스트를 제공합니다.
  return (
    <ThemeProvider>
      <AppInitializer />
    </ThemeProvider>
  );
}
