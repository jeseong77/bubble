// app/_layout.tsx
import React, { useEffect } from "react";
import { Slot } from "expo-router"; // useRootNavigationState is NOT imported/used
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Literata_400Regular } from "@expo-google-fonts/literata";
import { useInitialRouteRedirect } from "../hooks/useInitialRouteRedirect"; // Step 1: Restore import

SplashScreen.preventAutoHideAsync();

// AppInitializer Component (can be defined here or imported)
function AppInitializer() {
  console.log("AppInitializer: Component rendering.");
  // Call your redirection hook.
  const { isReady: isRoutingLogicProcessed } = useInitialRouteRedirect();

  useEffect(() => {
    if (isRoutingLogicProcessed) {
      console.log("AppInitializer: Routing logic processed. Hiding splash screen.");
      SplashScreen.hideAsync(); // Hide splash screen once routing is done
    } else {
      console.log("AppInitializer: Routing logic not yet processed.");
    }
  }, [isRoutingLogicProcessed]);

  if (!isRoutingLogicProcessed) {
    console.log("AppInitializer: Waiting for routing logic processing. Returning null.");
    // It's important to return null or a loader here,
    // otherwise <Slot /> might render prematurely before redirection logic takes effect.
    // The splash screen should still be visible.
    return null;
  }

  console.log("AppInitializer: Routing logic processed. Rendering <Slot />.");
  return <Slot />;
}


export default function RootLayout() {
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
      // If fonts are critical and fail, you might hide splash and show error.
      // For now, AppInitializer won't render if fonts don't load (see below).
      // SplashScreen.hideAsync(); // Or handle this error state more gracefully
    }
  }, [fontError]);

  // Wait for fonts before attempting any navigation logic or rendering the app
  if (!fontsLoaded && !fontError) {
    console.log("RootLayout: Fonts not loaded yet. Returning null.");
    return null;
  }

  // If fonts loaded (or errored but we proceed), render AppInitializer
  console.log("RootLayout: Fonts are ready (loaded or error). Rendering AppInitializer.");
  return <AppInitializer />; // Render the new component that handles routing
}