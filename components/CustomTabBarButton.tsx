import {
  Pressable,
  StyleSheet,
  Text,
  View,
  GestureResponderEvent,
} from "react-native";
import React, { useEffect } from "react";
import { icons } from "@/constants/Icons"; // 아이콘 경로 확인
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] 커스텀 테마 훅 (경로 확인)
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type IconName = "index" | "explore" | "profile" | string; // Or keyof typeof icons

interface CustomTabBarButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  onLongPress: (event: GestureResponderEvent) => void;
  isFocused: boolean;
  label: string;
  routeName: IconName;
}

const CustomTabBarButton: React.FC<CustomTabBarButtonProps> = ({
  onPress,
  onLongPress,
  isFocused,
  label,
  routeName,
}) => {
  const { colors } = useAppTheme();
  const scale = useSharedValue(isFocused ? 1 : 0);
  const IconComponent = icons[routeName] || icons["default"];

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0, {
      damping: 15,
      stiffness: 120,
      mass: 1,
    });
  }, [scale, isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    const scaleValue = interpolate(scale.value, [0, 1], [1, 1.2]);
    const topValue = interpolate(scale.value, [0, 1], [0, 9]); // focused 시 아이콘이 위로 올라가는 효과 유지
    return {
      transform: [{ scale: scaleValue }],
      top: topValue,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scale.value, [0, 1], [1, 0]); // focused 시 텍스트 사라짐
    return {
      opacity: opacity,
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={animatedIconStyle}>
        {IconComponent ? (
          <IconComponent
            size={24}
            // [변경] 아이콘 색상을 테마에 맞게 동적으로 설정
            color={isFocused ? colors.white : colors.black}
          />
        ) : (
          <View style={{ width: 24, height: 24 }} /> // 아이콘 없을 시 Placeholder
        )}
      </Animated.View>

      <Animated.Text
        style={[
          styles.labelText,
          // [변경] 텍스트 색상을 테마에 맞게 동적으로 설정
          { color: isFocused ? colors.primary : colors.black },
          animatedTextStyle, // focused 시 투명도 애니메이션
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
};

export default CustomTabBarButton;

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    // minHeight: 60, // 아이콘 애니메이션으로 인한 레이아웃 변경 방지 (필요시)
  },
  labelText: {
    fontSize: 12,
    marginTop: 4, // 아이콘과 텍스트 사이 간격
  },
});
