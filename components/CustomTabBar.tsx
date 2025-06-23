import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text, // Text는 CustomTabBarButton에서 사용될 수 있으므로 유지합니다.
  Platform,
  LayoutChangeEvent,
} from "react-native";
// useTheme는 현재 코드에서 사용되지 않으므로 제거하거나 필요시 다시 추가합니다.
// import { useTheme } from "@react-navigation/native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import CustomTabBarButton from "./CustomTabBarButton"; // 이 파일의 경로가 정확한지 확인해주세요.
import { icons } from "@/constants/Icons"; // 이 파일의 경로가 정확한지 확인해주세요.
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring, // 탭 선택자 애니메이션용
  withTiming, // 탭 바 표시/숨김 애니메이션용
  interpolate, // 탭 바 표시/숨김 애니메이션용
} from "react-native-reanimated";
import { useUIStore } from "@/stores/uiStore";
import { useAppTheme } from "@/hooks/useAppTheme";

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
    <Animated.View
      onLayout={onTabBarLayout}
      style={[
        styles.tabBar, // 그림자 관련 스타일이 제거된 tabBar 스타일 적용
        tabBarVisibilityAnimatedStyle,
        {
          backgroundColor: colors.disableButton, // 기존 배경색 유지
          // shadowColor: colors.shadow, // [제거] 인라인 shadowColor 제거
        },
      ]}
      pointerEvents={isTabBarVisibleFromStore ? "auto" : "none"}
    >
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
    </Animated.View>
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
  },
  tabSelector: {
    position: "absolute",
    borderRadius: 30,
    marginHorizontal: 12,
  },
});

export default CustomTabBar;
