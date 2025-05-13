// components/CustomView.tsx
import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

interface CustomViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  useSafeAreaTop?: boolean;
}

const CustomView: React.FC<CustomViewProps> = ({
  children,
  style,
  useSafeAreaTop = false,
}) => {
  const { colors, isDark } = useAppTheme();
  let bottomTabBarHeight = 0;

  try {
    bottomTabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    console.warn(
      "CustomView: useBottomTabBarHeight() 호출 중 오류 발생. 기본값 0을 사용합니다. 오류: ",
      e
    );
  }

  // 1. 탭 바가 차지하는 공간 (여백 포함)
  const tabBarSpaceHeight =
    bottomTabBarHeight > 0 ? bottomTabBarHeight + 16 : 0;

  // 2. 콘텐츠와 그라데이션/블러 효과가 겹치는 영역의 높이
  const blurOverlapHeight = 40;

  // 3. 블러 효과의 전체 높이 (탭 바 공간만큼)
  const totalBlurHeight = tabBarSpaceHeight > 0 ? tabBarSpaceHeight : 0;

  // 4. 그라데이션 효과의 전체 높이 (탭 바 공간 + 콘텐츠 겹침 영역)
  // 이 높이만큼 콘텐츠 하단이 배경으로 부드럽게 사라집니다.
  const totalGradientHeight =
    tabBarSpaceHeight > 0 ? tabBarSpaceHeight + blurOverlapHeight : 0;

  // 그라데이션 색상 정의:
  // 최상단: 완전 투명 (콘텐츠가 그대로 보임)
  // 중간점: 투명 유지가 끝나고 배경색으로 전환 시작
  // 최하단: 완전 불투명 (배경색과 동일)
  const gradientColors = [
    `${colors.background}00`, // 완전 투명
    `${colors.background}00`, // 투명 유지 끝점
    colors.background, // 완전 불투명 (배경색)
  ] as const; // `as const`로 타입을 readonly tuple로 명확히 합니다.

  // 그라데이션 색상 위치(locations) 정의:
  // `gradientColors`와 동일한 길이(3)를 가져야 합니다.
  let gradientLocations: readonly [number, number, number] = [0, 0.1, 1]; // 기본값

  if (totalGradientHeight > 0) {
    if (blurOverlapHeight > 0) {
      // `blurOverlapHeight`는 그라데이션이 블러보다 위로 올라가는 높이입니다.
      // 이 영역의 특정 비율(여기서는 80%)까지 투명도를 유지하여 콘텐츠가 부드럽게 전환되도록 합니다.
      // (blurOverlapHeight / totalGradientHeight)는 전체 그라데이션 중 이 "겹침" 영역의 비율입니다.
      const transparentUntilRatio =
        (blurOverlapHeight / totalGradientHeight) * 0.8; // 0.8은 조절 가능한 페이드 시작점 계수
      gradientLocations = [0, transparentUntilRatio, 1];
    } else {
      // `blurOverlapHeight`가 0이면, 그라데이션 시작부터 바로 색상 전환이 일어납니다.
      gradientLocations = [0, 0, 1];
    }
  }

  const RootElement = useSafeAreaTop ? SafeAreaView : View;
  const rootElementProps = useSafeAreaTop
    ? { edges: ["top"] as ReadonlyArray<Edge> }
    : {};

  return (
    <RootElement
      style={[styles.rootView, { backgroundColor: colors.background }, style]}
      {...rootElementProps}
    >
      <View style={styles.contentWrapper}>{children}</View>

      {/* 하단 효과 영역: 탭 바가 있을 때만 렌더링 */}
      {bottomTabBarHeight > 0 && (
        <>
          {/* 블러 효과 레이어 (그라데이션 아래에 위치) */}
          {totalBlurHeight > 0 && (
            <BlurView
              style={[styles.effectLayer, { height: totalBlurHeight }]}
              intensity={1} // 블러 강도 (iOS/Android 동일하게 1로 설정)
              tint={isDark ? "dark" : "light"}
              pointerEvents="none"
            />
          )}

          {/* 스무딩 그라데이션 레이어 (가장 위에 위치하여 블러와 콘텐츠 경계를 부드럽게) */}
          {totalGradientHeight > 0 && (
            <LinearGradient
              colors={gradientColors}
              locations={gradientLocations}
              style={[styles.effectLayer, { height: totalGradientHeight }]}
              pointerEvents="none"
            />
          )}
        </>
      )}
    </RootElement>
  );
};

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    // ScrollView/FlatList 사용 시, 콘텐츠가 하단 효과에 가려지지 않도록
    // contentContainerStyle.paddingBottom을 totalGradientHeight 값으로 충분히 설정해야 합니다.
  },
  effectLayer: {
    // 블러 및 그라데이션 레이어 공통 스타일
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default CustomView;
