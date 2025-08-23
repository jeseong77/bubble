// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Alert } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";
import "core-js/actual/structured-clone";
import { useInitialRouteRedirect } from "../hooks/useInitialRouteRedirect";
import { ThemeProvider } from "@/theme/ThemeContext";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import RealtimeProvider from "@/providers/RealtimeProvider"; // [추가] RealtimeProvider 임포트
import { MatchmakingProvider } from "@/providers/MatchmakingProvider"; // [추가] MatchmakingProvider 임포트
import { supabase } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();

function AppInitializer() {
  console.log("AppInitializer: Component rendering.");
  const { isReady: isRoutingLogicProcessed } = useInitialRouteRedirect();
  const { session } = useAuth();

  // Handle deep linking for bubble invitations
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("[DeepLink] Processing deep link:", url);
      
      // Parse bubble join URLs: bubble://join/{groupId}/{token} or https://bubble.app/join/{groupId}/{token}
      const parsedUrl = Linking.parse(url);
      console.log("[DeepLink] Parsed URL:", parsedUrl);
      
      if (parsedUrl.path && parsedUrl.path.startsWith('/join/')) {
        const pathParts = parsedUrl.path.replace('/join/', '').split('/');
        const groupId = pathParts[0];
        const token = pathParts[1] || null; // Token is optional for backward compatibility
        
        console.log("[DeepLink] Group ID extracted:", groupId);
        console.log("[DeepLink] Token extracted:", token);
        
        if (groupId && session?.user) {
          await handleJoinBubble(groupId, session.user.id, token);
        } else if (!session?.user) {
          console.log("[DeepLink] User not authenticated, storing join intent");
          // TODO: Store join intent for after login
          Alert.alert(
            "Login Required", 
            "Please log in to join this bubble.",
            [{ text: "OK", style: "default" }]
          );
        } else {
          console.error("[DeepLink] Invalid group ID:", groupId);
          Alert.alert("Error", "Invalid invitation link.");
        }
      }
    };

    const handleJoinBubble = async (groupId: string, userId: string, token?: string | null) => {
      try {
        console.log("[DeepLink] Fetching bubble info for join confirmation");
        
        // First, get bubble info for confirmation dialog
        const { data: bubbleData, error: bubbleError } = await supabase.rpc("get_bubble", {
          p_group_id: groupId,
        });

        if (bubbleError) {
          console.error("[DeepLink] Error fetching bubble info:", bubbleError);
          Alert.alert("Error", "Failed to find bubble information.");
          return;
        }

        if (!bubbleData || bubbleData.length === 0) {
          console.error("[DeepLink] Bubble not found");
          Alert.alert("Error", "This bubble no longer exists.");
          return;
        }

        const bubble = bubbleData[0];
        console.log("[DeepLink] Bubble found:", bubble.name);

        // Show confirmation dialog
        Alert.alert(
          "Join Bubble?",
          `Do you want to join "${bubble.name}"?`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => console.log("[DeepLink] Join cancelled by user"),
            },
            {
              text: "Join",
              style: "default",
              onPress: async () => {
                console.log("[DeepLink] User confirmed join, calling RPC");
                await performDirectJoin(groupId, userId, bubble.name, token);
              },
            },
          ]
        );
      } catch (error) {
        console.error("[DeepLink] Error in handleJoinBubble:", error);
        Alert.alert("Error", "An error occurred while processing the invitation.");
      }
    };

    const performDirectJoin = async (groupId: string, userId: string, bubbleName: string, token?: string | null) => {
      try {
        console.log("[DeepLink] Calling join_bubble_direct RPC");
        
        const { data, error } = await supabase.rpc("join_bubble_direct", {
          p_group_id: groupId,
          p_user_id: userId,
          p_invite_token: token, // Pass the secure token
        });

        console.log("[DeepLink] RPC response:", { data, error });

        if (error) {
          console.error("[DeepLink] RPC error:", error);
          Alert.alert("Error", error.message || "Failed to join bubble");
          return;
        }

        if (data?.success) {
          console.log("[DeepLink] Successfully joined bubble:", bubbleName);
          Alert.alert(
            "Success! 🎉",
            data.message || `Successfully joined "${bubbleName}"!`,
            [
              {
                text: "OK",
                onPress: () => {
                  // Navigate to bubble/profile after successful join
                  console.log("[DeepLink] Navigating to profile after successful join");
                  // Note: Navigation will be handled by the app's natural flow
                },
              },
            ]
          );
        } else {
          console.error("[DeepLink] Join failed:", data);
          const errorMessage = data?.message || "Failed to join bubble";
          Alert.alert("Join Failed", errorMessage);
        }
      } catch (error) {
        console.error("[DeepLink] Error in performDirectJoin:", error);
        Alert.alert("Error", "An unexpected error occurred while joining the bubble.");
      }
    };

    // Handle initial URL (app was opened with a deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[DeepLink] Initial URL detected:", url);
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log("[DeepLink] URL event received:", event.url);
      handleDeepLink(event.url);
    });

    return () => subscription?.remove();
  }, [session?.user]);

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
