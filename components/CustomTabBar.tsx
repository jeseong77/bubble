import React, { useEffect, useState } from "react";
import {
  View, // View는 직접 사용되지 않지만, React Native의 기본 요소로 남겨둘 수 있습니다.
  StyleSheet,
  Text, // Text는 현재 이 파일에서 직접 사용되지 않지만, CustomTabBarButton에서 사용될 수 있습니다.
  Platform,
  LayoutChangeEvent,
} from "react-native";
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
import { BlurView } from "expo-blur"; // BlurView 임포트

// 아이콘 이름 타입 (기존 코드 유지)
type KnownIconRouteNames = keyof typeof icons;

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, isDark } = useAppTheme(); // isDark를 BlurView tint에 사용
  const [tabBarDimensions, setTabBarDimensions] = useState({
    height: 60,
    width: 300,
  });
  const buttonWidth = tabBarDimensions.width / state.routes.length;

  const isTabBarVisibleFromStore = useUIStore((s) => s.isTabBarVisible);
  const tabBarAnimatedVisibility = useSharedValue(
    isTabBarVisibleFromStore ? 1 : 0
  );

  // BlurView의 강도 설정 (필요시 prop으로 전달하여 조절 가능)
  const blurIntensity = Platform.OS === "ios" ? 90 : 120; // iOS와 Android에 다른 기본값 적용

  useEffect(() => {
    // console.log(
    //   "CustomTabBar: isTabBarVisibleFromStore changed to",
    //   isTabBarVisibleFromStore
    // );
    tabBarAnimatedVisibility.value = withTiming(
      isTabBarVisibleFromStore ? 1 : 0,
      {
        duration: 250, // 애니메이션 지속 시간 (ms)
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
        styles.tabBar, // borderRadius, overflow: 'hidden' 등 기본 스타일
        tabBarVisibilityAnimatedStyle,
        {
          backgroundColor: "transparent", // BlurView를 위해 배경을 투명하게 변경
          shadowColor: colors.shadow, // 그림자 효과는 컨테이너에 유지
        },
      ]}
      pointerEvents={isTabBarVisibleFromStore ? "auto" : "none"}
    >
      {/* 배경 BlurView */}
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill} // 부모 Animated.View를 채우고, borderRadius에 의해 잘림
      />

      {/* 선택된 탭 표시자 (슬라이더) - BlurView 위에 렌더링 */}
      <Animated.View
        style={[
          tabSelectorAnimatedStyle,
          styles.tabSelector,
          {
            height: tabBarDimensions.height - 15,
            width: buttonWidth > 25 ? buttonWidth - 25 : buttonWidth,
            backgroundColor: colors.primary, // 슬라이더 색상은 테마의 primary 사용
          },
        ]}
      />
      {/* 탭 버튼들 - BlurView 위에 렌더링 */}
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
    left: 20,
    right: 20,
    paddingVertical: 10,
    borderRadius: 35,
    overflow: "hidden", // BlurView가 borderRadius에 맞게 잘리도록 설정
    // 그림자 효과
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5, // Android 그림자
  },
  tabSelector: {
    position: "absolute",
    borderRadius: 30,
    marginHorizontal: 12,
    // height와 width는 동적으로 설정됨
  },
});
