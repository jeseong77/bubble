// app/_layout.tsx
import React, { useEffect, useRef, useState } from "react";
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
import BubbleFormationProvider from "@/providers/BubbleFormationProvider"; // [추가] BubbleFormationProvider 임포트
import { MatchmakingProvider } from "@/providers/MatchmakingProvider"; // [추가] MatchmakingProvider 임포트
import { configurePushNotifications } from "@/lib/pushNotifications";
import { supabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logger } from "@/services/Logger";

SplashScreen.preventAutoHideAsync();

function AppInitializer() {
  logger.debug("AppInitializer: Component rendering");
  const { isReady: isRoutingLogicProcessed } = useInitialRouteRedirect();
  const { session } = useAuth();
  
  // State to manage pending deep links
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);
  const processingDeepLink = useRef(false);

  // Define helper functions outside useEffect so they can be used in multiple places
  const performDirectJoin = async (groupId: string, userId: string, bubbleName: string, token?: string | null) => {
    try {
      logger.info("DeepLink: Calling join_bubble_direct RPC", {
        groupId,
        userId,
        bubbleName,
        hasToken: !!token
      });

      const { data, error } = await supabase.rpc("join_bubble_direct", {
        p_group_id: groupId,
        p_user_id: userId,
        p_invite_token: token,
      });

      logger.debug("DeepLink: join_bubble_direct RPC response", {
        hasData: !!data,
        hasError: !!error,
        data,
        error
      });

      if (error) {
        logger.error("DeepLink: RPC error", error, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        Alert.alert("Join Failed", error.message || "Failed to join bubble");
        processingDeepLink.current = false;
        return;
      }

      if (data?.success) {
        logger.info("DeepLink: Successfully joined bubble", { bubbleName });
        Alert.alert(
          "Welcome to the bubble! 🎉",
          data.message || `You've successfully joined "${bubbleName}"!`,
          [
            {
              text: "OK",
              onPress: () => {
                logger.info("DeepLink: User acknowledged successful join");
                processingDeepLink.current = false;
                setPendingDeepLink(null); // Clear any pending deep links
              },
            },
          ]
        );
      } else {
        logger.error("DeepLink: Join failed", undefined, {
          success: data?.success,
          message: data?.message,
          error: data?.error,
          fullData: data
        });
        const errorMessage = data?.message || data?.error || "Failed to join bubble for unknown reason";
        Alert.alert("Join Failed", errorMessage);
        processingDeepLink.current = false;
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error("DeepLink: Exception in performDirectJoin", errorObj);
      Alert.alert("Error", "An unexpected error occurred while joining the bubble.");
      processingDeepLink.current = false;
    }
  };

  const handleJoinBubble = async (groupId: string, userId: string, token?: string | null) => {
    processingDeepLink.current = true;
    logger.info("DeepLink: Starting bubble join process", {
      groupId,
      userId,
      hasToken: !!token,
      tokenLength: token?.length
    });

    try {
      logger.debug("DeepLink: Calling get_bubble RPC");

      // First, get bubble info for confirmation dialog
      const { data: bubbleData, error: bubbleError } = await supabase.rpc("get_bubble", {
        p_group_id: groupId,
      });

      logger.debug("DeepLink: get_bubble RPC response", {
        hasData: !!bubbleData,
        dataLength: bubbleData?.length,
        hasError: !!bubbleError,
        error: bubbleError
      });

      if (bubbleError) {
        logger.error("DeepLink: Error fetching bubble info", bubbleError, {
          message: bubbleError.message,
          code: bubbleError.code,
          details: bubbleError.details,
          hint: bubbleError.hint
        });
        Alert.alert("Error", `Failed to find bubble: ${bubbleError.message || 'Unknown error'}`);
        return;
      }

      if (!bubbleData || bubbleData.length === 0) {
        logger.error("DeepLink: Bubble not found in database");
        Alert.alert("Error", "This bubble no longer exists or has been deleted.");
        return;
      }

      const bubble = bubbleData[0];
      logger.info("DeepLink: Bubble found", {
        name: bubble.name,
        id: bubble.id,
        hasMembers: !!bubble.members
      });

      // Show confirmation dialog with improved UX
      Alert.alert(
        `Join ${bubble.name}?`,
        `Do you want to join this bubble?`,
        [
          {
            text: "No",
            style: "cancel",
            onPress: () => {
              console.log("[DeepLink] 🚫 User cancelled join");
              processingDeepLink.current = false;
            },
          },
          {
            text: "Yes",
            style: "default",
            onPress: async () => {
              console.log("[DeepLink] ✅ User confirmed join, proceeding...");
              await performDirectJoin(groupId, userId, bubble.name, token);
            },
          },
        ]
      );
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error("DeepLink: Exception in handleJoinBubble", errorObj);
      Alert.alert("Error", "An unexpected error occurred while processing the invitation.");
      processingDeepLink.current = false;
    }
  };

  // Handle deep linking for bubble invitations
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("[DeepLink] 🔗 Processing deep link:", url);
      console.log("[DeepLink] 📊 Current state:", {
        hasSession: !!session?.user,
        sessionId: session?.user?.id,
        isRoutingReady: isRoutingLogicProcessed,
        processingDeepLink: processingDeepLink.current
      });
      
      // If we're already processing a deep link, ignore new ones
      if (processingDeepLink.current) {
        console.log("[DeepLink] ⏸️ Already processing a deep link, ignoring:", url);
        return;
      }

      // Parse bubble join URLs: bubble://join/{groupId}/{token} or https://bubble.app/join/{groupId}/{token}
      const parsedUrl = Linking.parse(url);
      console.log("[DeepLink] 🔍 Parsed URL:", parsedUrl);
      
      if (parsedUrl.path && parsedUrl.path.startsWith('/join/')) {
        const pathParts = parsedUrl.path.replace('/join/', '').split('/');
        const groupId = pathParts[0];
        const token = pathParts[1] || null;
        
        console.log("[DeepLink] 📋 Extracted data:", {
          groupId,
          token,
          pathParts,
          originalPath: parsedUrl.path
        });
        
        // Validate group ID format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!groupId || !uuidRegex.test(groupId)) {
          console.error("[DeepLink] ❌ Invalid group ID format:", groupId);
          Alert.alert("Error", "Invalid invitation link format.");
          return;
        }
        
        // If app and auth aren't ready yet, store the deep link for later
        if (!isRoutingLogicProcessed || !session?.user) {
          console.log("[DeepLink] ⏳ App not ready, storing deep link for later:", {
            url,
            hasSession: !!session?.user,
            isRoutingReady: isRoutingLogicProcessed
          });
          setPendingDeepLink(url);
          return;
        }
        
        // Process the deep link now
        console.log("[DeepLink] ✅ App is ready, processing deep link immediately");
        await handleJoinBubble(groupId, session.user.id, token);
      } else {
        console.log("[DeepLink] 🤷‍♂️ URL doesn't match join pattern:", parsedUrl.path);
      }
    };

    // Handle initial URL (app was opened with a deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("[DeepLink] 🎯 Initial URL detected:", url);
        handleDeepLink(url);
      } else {
        console.log("[DeepLink] 📝 No initial URL");
      }
    }).catch((error) => {
      console.error("[DeepLink] 💥 Error getting initial URL:", error);
    });

    // Handle URLs when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log("[DeepLink] 📨 URL event received:", event.url);
      handleDeepLink(event.url);
    });

    return () => {
      console.log("[DeepLink] 🧹 Cleaning up URL subscription");
      subscription?.remove();
    };
  }, []); // Empty dependencies - handlers will access current state via closures

  // Separate effect to handle pending deep links when app becomes ready
  useEffect(() => {
    if (pendingDeepLink && isRoutingLogicProcessed && session?.user) {
      console.log("[DeepLink] 🔄 App is now ready, processing pending deep link:", pendingDeepLink);
      
      // Process the pending deep link
      const processPendingLink = async () => {
        const parsedUrl = Linking.parse(pendingDeepLink);
        if (parsedUrl.path && parsedUrl.path.startsWith('/join/')) {
          const pathParts = parsedUrl.path.replace('/join/', '').split('/');
          const groupId = pathParts[0];
          const token = pathParts[1] || null;
          
          console.log("[DeepLink] 🚀 Processing pending join:", { groupId, token });
          await handleJoinBubble(groupId, session.user.id, token);
        }
        setPendingDeepLink(null);
      };
      
      processPendingLink();
    }
  }, [pendingDeepLink, isRoutingLogicProcessed, session?.user]);

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
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          {/* [변경] RealtimeProvider로 AppInitializer를 감싸줍니다. */}
          <RealtimeProvider>
            <BubbleFormationProvider>
              <MatchmakingProvider>
                <AppInitializer />
              </MatchmakingProvider>
            </BubbleFormationProvider>
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
