import React from "react"; // useCallback 사용을 위해 React import
import { Tabs, useFocusEffect } from "expo-router";
import { useUIStore } from "@/stores/uiStore"; // Zustand 스토어 import (경로 확인)
import { Feather, Ionicons } from "@expo/vector-icons";
import { Image, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { NotificationBadge } from "@/components/ui/NotificationBadge";

export default function TabLayout() {
  const { showTabBar, hideTabBar, unreadLikesCount } = useUIStore();
  const { colors } = useAppTheme();

  useFocusEffect(
    React.useCallback(() => {
      // (tabs) 네비게이터가 포커스를 받을 때마다 이 콜백이 실행됩니다.
      console.log("TabLayout focused: Preparing to animate tab bar in.");

      // 1. 먼저 탭 바를 숨김 상태로 만듭니다.
      // 이렇게 하면 isTabBarVisible이 false가 되고, CustomTabBar는 내려가는 애니메이션을 시작하거나
      // 이미 숨겨져 있다면 그 상태를 유지합니다.
      hideTabBar();

      // 2. 아주 짧은 지연 후 (또는 다음 렌더링 사이클을 기다린 후) 탭 바를 다시 보이게 합니다.
      //    이렇게 하면 isTabBarVisible이 true로 바뀌면서 CustomTabBar가 올라오는 애니메이션을 실행합니다.
      //    setTimeout 지연 시간은 애니메이션이 자연스럽게 보이도록 조절합니다.
      //    0ms도 효과가 있을 수 있으며, requestAnimationFrame을 사용하는 것도 한 방법입니다.
      const timerId = setTimeout(() => {
        console.log("TabLayout: Triggering showTabBar for animation.");
        showTabBar();
      }, 50);

      return () => {
        // 이 화면이 포커스를 잃기 전에 cleanup 함수가 실행됩니다.
        clearTimeout(timerId); // 타이머가 있다면 제거
        console.log("TabLayout blurred.");
        // 여기서 hideTabBar()를 호출하면 (tabs)를 떠날 때 탭바가 내려가는 애니메이션이 됩니다.
        // 하지만 다른 화면 (예: settings)에서 이미 탭바를 숨기도록 처리하고 있으므로,
        // 여기서는 특별히 호출하지 않아도 될 수 있습니다.
        // 만약 (tabs)를 떠날 때 항상 내려가는 애니메이션을 원한다면 hideTabBar() 호출.
      };
    }, [showTabBar, hideTabBar]) // hideTabBar와 showTabBar는 참조가 안정적이므로,
    // 실제로는 이 콜백이 불필요하게 자주 재생성되지는 않습니다.
  );

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index" // Main match tab as first item
        options={{
          title: "",
          animation: "none",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name="sparkles"
              color={focused ? colors.primary : color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="match" // Heart tab
        options={{
          title: "",
          animation: "none",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons
                name="heart"
                color={focused ? colors.primary : color}
                size={28}
              />
              <NotificationBadge count={unreadLikesCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chats" // 예: app/(tabs)/chats.tsx
        options={{
          title: "",
          animation: "none",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name="chatbubble"
              color={focused ? colors.primary : color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile" // 예: app/(tabs)/profile.tsx
        options={{
          title: "",
          animation: "none",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name="person"
              color={focused ? colors.primary : color}
              size={28}
            />
          ),
        }}
      />
      {/* 필요한 다른 Tabs.Screen들을 여기에 추가합니다. */}
    </Tabs>
  );
}
