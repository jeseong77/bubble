import React, { useEffect, useState } from "react"; // useEffect, useState import
import {
  View,
  StyleSheet,
  Text,
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

// 아이콘 이름 타입 (기존 코드 유지)
type KnownIconRouteNames = keyof typeof icons;

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useAppTheme();
  // 탭 바의 실제 크기를 저장하기 위한 상태 (onLayout으로 측정)
  // 초기 높이값을 좀 더 현실적인 값으로 변경하거나, onLayout 전까지 렌더링을 다르게 처리할 수 있습니다.
  const [tabBarDimensions, setTabBarDimensions] = useState({
    height: 60,
    width: 300,
  });
  const buttonWidth = tabBarDimensions.width / state.routes.length;

  // Zustand 스토어에서 탭 바 표시 상태 구독
  const isTabBarVisibleFromStore = useUIStore((s) => s.isTabBarVisible);

  // 탭 바 표시/숨김 애니메이션을 위한 SharedValue (1: 보임, 0: 숨김)
  const tabBarAnimatedVisibility = useSharedValue(
    isTabBarVisibleFromStore ? 1 : 0
  );

  // 스토어의 isTabBarVisibleFromStore 값이 변경될 때 애니메이션 값 업데이트
  useEffect(() => {
    console.log(
      "CustomTabBar: isTabBarVisibleFromStore changed to",
      isTabBarVisibleFromStore
    );
    tabBarAnimatedVisibility.value = withTiming(
      isTabBarVisibleFromStore ? 1 : 0,
      {
        duration: 250, // 애니메이션 지속 시간 (ms)
      }
    );
  }, [isTabBarVisibleFromStore, tabBarAnimatedVisibility]);

  // 탭 바의 레이아웃(크기)이 결정되거나 변경될 때 호출
  const onTabBarLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setTabBarDimensions({ height, width });
  };

  // 탭 바 전체의 표시/숨김 애니메이션 스타일
  const tabBarVisibilityAnimatedStyle = useAnimatedStyle(() => {
    // 탭 바가 숨겨질 때 이동할 Y축 거리
    // tabBarDimensions.height (실제 탭바 높이) + 약간의 추가 여유 공간(예: 20)
    // 이렇게 하면 탭바가 화면 하단 밖으로 완전히 사라집니다.
    const hideTranslateY = tabBarDimensions.height + 20;

    const translateY = interpolate(
      tabBarAnimatedVisibility.value,
      [0, 1], // 입력 범위 (0: 숨김, 1: 보임)
      [hideTranslateY, 0] // 출력 범위 (숨겨질 때 Y 위치, 보일 때 Y 위치)
    );

    return {
      transform: [{ translateY }],
      opacity: tabBarAnimatedVisibility.value, // 투명도도 함께 애니메이션
    };
  });

  // 선택된 탭 표시자(슬라이더)의 X축 위치 애니메이션 (기존 로직)
  const tabSelectorPositionX = useSharedValue(0);
  const tabSelectorAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: tabSelectorPositionX.value }],
    };
  });

  // 탭 바가 숨겨져 있고 애니메이션 값도 0이면 렌더링하지 않음 (메모리 최적화 및 불필요한 계산 방지)
  // 단, 애니메이션이 부드럽게 진행되려면 opacity가 0이 될 때까지는 렌더링 되어야 합니다.
  // 따라서 이 조건은 애니메이션이 끝난 후 (tabBarAnimatedVisibility.value === 0 일때) 적용하는 것이 좋습니다.
  // 현재는 opacity로 처리하므로, 항상 렌더링 하되 안보이게 됩니다.
  // if (!isTabBarVisibleFromStore && tabBarAnimatedVisibility.value === 0) {
  //   console.log('CustomTabBar: Rendering null as tab bar is hidden and animation value is 0');
  //   return null;
  // }

  return (
    // 최상위 View를 Animated.View로 변경하고, 표시/숨김 애니메이션 스타일 적용
    <Animated.View
      onLayout={onTabBarLayout}
      style={[
        styles.tabBar,
        tabBarVisibilityAnimatedStyle,
        {
          backgroundColor: colors.surface, // 테마의 surface 색상 사용
          shadowColor: colors.shadow, // 테마의 shadow 색상 사용 (Colors.ts에 정의되어 있다면)
        },
      ]}
      pointerEvents={isTabBarVisibleFromStore ? "auto" : "none"} // 숨겨졌을 때 터치 이벤트 무시
    >
      {/* 선택된 탭 표시자 (슬라이더) */}
      <Animated.View
        style={[
          tabSelectorAnimatedStyle, // 슬라이더 위치 애니메이션
          styles.tabSelector, // 공통 스타일 분리
          {
            // 동적 스타일
            height: tabBarDimensions.height - 15, // 측정된 높이 기반으로 설정
            width: buttonWidth > 25 ? buttonWidth - 25 : buttonWidth, // 너비가 너무 작아지지 않도록
            backgroundColor: colors.primary,
          },
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        // 레이블 결정 로직 (기존과 동일)
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
          // 선택된 탭 표시자(슬라이더) 위치 애니메이션
          // withSpring 대신 withTiming을 사용하거나 duration을 조절하여 더 빠른 반응을 줄 수 있습니다.
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
            // 아이콘을 사용한다면 여기서 icons[route.name as KnownIconRouteNames] 와 같이 전달
            routeName={String(route.name)}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute", // 화면 하단에 고정
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // bottom, left, right는 탭 바의 화면상 위치와 너비를 결정
    bottom: Platform.OS === "ios" ? 30 : 20,
    left: 20,
    right: 20,
    paddingVertical: 10, // 탭 바 내부 상하 패딩
    borderRadius: 35, // 탭 바 모서리 둥글게
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
    // 선택된 탭 표시자(슬라이더)의 공통 스타일
    position: "absolute",
    borderRadius: 30, // 슬라이더 모서리 둥글게
    marginHorizontal: 12, // 슬라이더 좌우 마진
    // height와 width는 동적으로 설정됨
  },
});
