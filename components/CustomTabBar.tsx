import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import CustomTabBarButton from "./CustomTabBarButton"; // 이 파일의 경로가 정확한지 확인해주세요.
import { icons } from "@/constants/Icons"; // 이 파일의 경로가 정확한지 확인해주세요.
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useUIStore } from "@/stores/uiStore";
import { useAppTheme } from "@/hooks/useAppTheme";
import { BlurView } from "expo-blur";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

type KnownIconRouteNames = keyof typeof icons;

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const [tabBarDimensions, setTabBarDimensions] = useState({
    height: 60,
    width: 300,
  });
  const buttonWidth = tabBarDimensions.width / state.routes.length;

  const isTabBarVisibleFromStore = useUIStore((s) => s.isTabBarVisible);
  const tabBarAnimatedVisibility = useSharedValue(
    isTabBarVisibleFromStore ? 1 : 0
  );

  useEffect(() => {
    tabBarAnimatedVisibility.value = withTiming(
      isTabBarVisibleFromStore ? 1 : 0,
      {
        duration: 250,
      }
    );
  }, [isTabBarVisibleFromStore, tabBarAnimatedVisibility]);

  const onTabBarLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setTabBarDimensions({ height, width });
  };

  const tabBarVisibilityAnimatedStyle = useAnimatedStyle(() => {
    const hideTranslateY = tabBarDimensions.height + 20;
    const translateY = interpolate(
      tabBarAnimatedVisibility.value,
      [0, 1],
      [hideTranslateY, 0]
    );
    return {
      transform: [{ translateY }],
      opacity: tabBarAnimatedVisibility.value,
    };
  });

  const tabSelectorPositionX = useSharedValue(0);
  const tabSelectorAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: tabSelectorPositionX.value }],
    };
  });

  return (
    <AnimatedBlurView
      onLayout={onTabBarLayout}
      style={[styles.tabBar, tabBarVisibilityAnimatedStyle]}
      // tint는 'dark'나 'light'로 설정하여 오버레이 색상과 조화를 이루게 할 수 있습니다.
      tint="light"
      intensity={90} // 강도를 조금 높여 색상과 잘 어우러지게 조절할 수 있습니다.
      pointerEvents={isTabBarVisibleFromStore ? "auto" : "none"}
    >
      {/* --- ✨ 요청하신 colors.mediumGray 오버레이 View --- */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            // colors.mediumGray를 배경으로 사용하되, 투명도를 추가합니다.
            // 뒤의 '80'은 16진수 투명도 값으로, 약 50%의 투명도를 의미합니다.
            // 이 값을 조절하여 투명도를 변경할 수 있습니다. (00: 투명, FF: 불투명)
            backgroundColor: `${colors.mediumGray}80`,
          },
        ]}
      />
      {/* ---------------------------------------------------- */}

      {/* 선택된 탭 표시자 (슬라이더) */}
      <Animated.View
        style={[
          tabSelectorAnimatedStyle,
          styles.tabSelector,
          {
            height: tabBarDimensions.height - 15,
            width: buttonWidth > 25 ? buttonWidth - 25 : buttonWidth,
            backgroundColor: colors.primary,
          },
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        let labelString: string;
        if (typeof options.tabBarLabel === "function") {
          labelString =
            options.title !== undefined ? options.title : route.name;
        } else if (options.tabBarLabel !== undefined) {
          labelString = options.tabBarLabel;
        } else if (options.title !== undefined) {
          labelString = options.title;
        } else {
          labelString = route.name;
        }

        const onPress = () => {
          tabSelectorPositionX.value = withSpring(buttonWidth * index, {
            damping: 20,
            stiffness: 200,
          });

          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <CustomTabBarButton
            key={route.name}
            onPress={onPress}
            onLongPress={onLongPress}
            isFocused={isFocused}
            label={labelString}
            routeName={String(route.name)}
          />
        );
      })}
    </AnimatedBlurView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    bottom: Platform.OS === "ios" ? 30 : 20,
    left: 10,
    right: 10,
    paddingVertical: 10,
    borderRadius: 35,
    overflow: "hidden",
  },
  tabSelector: {
    position: "absolute",
    borderRadius: 30,
    marginHorizontal: 12,
  },
});

export default CustomTabBar;
