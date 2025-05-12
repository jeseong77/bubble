// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Literata_400Regular } from "@expo-google-fonts/literata";
import { useInitialRouteRedirect } from "../hooks/useInitialRouteRedirect";

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
  // ... (기존 RootLayout 코드의 나머지 부분은 동일하게 유지) ...
  console.log("RootLayout: Component rendering/re-rendering.");

  const [fontsLoaded, fontError] = useFonts({
    Literata: Literata_400Regular,
    "LeagueSpartan-Thin": require("../assets/fonts/LeagueSpartan-Thin.ttf"),
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
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    console.log("RootLayout: Fonts not loaded yet. Returning null.");
    return null;
  }

  console.log("RootLayout: Fonts are ready. Rendering AppInitializer.");
  return <AppInitializer />;
}
