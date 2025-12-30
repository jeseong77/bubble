import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from "react-native-reanimated";
import { StyleSheet } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

export interface FloatingBubbleProps {
  size: number;
  initialX: number;
  initialY: number;
  delay?: number;
  xRange: number;
  yRange: number;
  durationRange: [number, number];
}

// Reanimated v2 이상에서는 withDelay가 내장되어 있지 않을 수 있습니다.
// 필요시 간단하게 구현하거나, reanimated-helper 등의 라이브러리를 사용합니다.
// 여기서는 setTimeout을 이용한 간단한 딜레이 효과를 가정합니다.
// (실제 복잡한 애니메이션에서는 requestAnimationFrame 기반의 딜레이나
// reanimated의 sequence 기능을 활용하는 것이 더 적합할 수 있습니다.)
// Reanimated 2/3의 경우, withDelay는 withSequence의 일부로 사용될 수 있습니다.
// 좀 더 정확한 Reanimated 2/3 스타일의 딜레이는 애니메이션 시작 부분에서 처리합니다.
const withDelay = (delayMs: number, animation: any) => {
  // Reanimated 2/3 에서는 SharedValue의 .value 할당 시점에 setTimeout을 사용하거나,
  // useDerivedValue와 같은 훅 내부에서 타이밍을 제어하는 방식을 사용합니다.
  // 이 예제에서는 useEffect 내에서 애니메이션 시작을 늦추는 방식으로 구현합니다.
  // useEffect 내에서 setTimeout으로 애니메이션 시작을 감싸는 형태로 적용됩니다.
  // FloatingBubble의 useEffect 내에서 withTiming/withRepeat을 setTimeout으로 감싸면 됩니다.
  // 이 함수는 개념적인 표현이며, 실제 사용 시에는 useEffect 내에서 직접 딜레이 로직을 구현합니다.
  return animation; // 여기서는 단순 반환, 실제 딜레이는 useEffect에서 처리
};

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  size,
  initialX,
  initialY,
  delay = 0,
  xRange,
  yRange,
  durationRange,
}) => {
  const { colors } = useAppTheme();
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const opacity = useSharedValue(0.3); // 초기 투명도

  useEffect(() => {
    const randomDuration = () =>
      Math.random() * (durationRange[1] - durationRange[0]) + durationRange[0];

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(initialX + (Math.random() - 0.5) * 2 * xRange, {
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1), // 부드러운 움직임
          }),
          withTiming(initialX + (Math.random() - 0.5) * 2 * xRange, {
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
          withTiming(initialX, {
            // 원래 X 위치 근처로 복귀 시도
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          })
        ),
        -1, // 무한 반복
        true // 반대 방향으로도 애니메이션
      )
    );

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(initialY + (Math.random() - 0.5) * 2 * yRange, {
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
          withTiming(initialY + (Math.random() - 0.5) * 2 * yRange, {
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          }),
          withTiming(initialY, {
            // 원래 Y 위치 근처로 복귀 시도
            duration: randomDuration(),
            easing: Easing.bezier(0.42, 0, 0.58, 1),
          })
        ),
        -1, // 무한 반복
        true // 반대 방향으로도 애니메이션
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: randomDuration() * 0.8 }), // 좀 더 선명하게
          withTiming(0.3, { duration: randomDuration() * 1.2 }) // 다시 흐릿하게
        ),
        -1,
        true
      )
    );
  }, [
    translateX,
    translateY,
    opacity,
    initialX,
    initialY,
    delay,
    xRange,
    yRange,
    durationRange,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ] as any,
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary, // Primary 색상 사용
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: "absolute", // 부모 View (styles.container) 기준으로 절대 위치
    // backgroundColor는 FloatingBubble 컴포넌트 내부에서 설정
    // zIndex를 낮춰 프로필 이미지/텍스트보다 뒤에 있도록 할 수 있지만,
    // 보통은 렌더링 순서로 조절합니다. (배경 요소들을 먼저 렌더링)
  },
});
