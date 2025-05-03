import React, { useEffect } from "react";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Literata_600SemiBold,
  Literata_300Light,
  Literata_400Regular,
} from "@expo-google-fonts/literata";
import { useInitialRouteRedirect } from "../hooks/useInitialRouteRedirect"; // Adjust path if needed

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isReady: isRoutingReady } = useInitialRouteRedirect();

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

  // Determine overall app readiness
  const isAppReady = isRoutingReady && (fontsLoaded || fontError);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync();
    }
  }, [isAppReady]);

  useEffect(() => {
    if (fontError) {
      console.error("Font loading error:", fontError);
      // Handle font error appropriately, maybe show a fallback UI
    }
  }, [fontError]);

  // Render the children routes once the app is ready
  return <Slot />;
}
