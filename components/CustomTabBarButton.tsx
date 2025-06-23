// CustomTabBarButton.tsx
import {
  Pressable,
  StyleSheet,
  Text,
  GestureResponderEvent,
} from "react-native";
import React, { useEffect } from "react";
import { useAppTheme } from "@/hooks/useAppTheme";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import TabBarIcon from "./TabBarIcon"; // 로직 분리를 위한 TabBarIcon 사용은 유지

interface CustomTabBarButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  onLongPress: (event: GestureResponderEvent) => void;
  isFocused: boolean;
  label: string;
  routeName: string;
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

  useEffect(() => {
    // 이 부분은 변경되지 않았습니다.
    scale.value = withSpring(isFocused ? 1 : 0, {
      damping: 15,
      stiffness: 120,
      mass: 1,
    });
  }, [scale, isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    const scaleValue = interpolate(scale.value, [0, 1], [1, 1.2]);
    // [복원] 아이콘이 아래로 이동하는 원래 로직으로 복원합니다. (-9 -> 9)
    const topValue = interpolate(scale.value, [0, 1], [0, 9]);
    return {
      transform: [{ scale: scaleValue }],
      top: topValue,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    // 이 부분은 변경되지 않았습니다.
    const opacity = interpolate(scale.value, [0, 1], [1, 0]);
    return {
      opacity: opacity,
    };
  });

  const iconColor = isFocused ? colors.white : colors.black;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem} // [복원] 원래 스타일로 복원
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={animatedIconStyle}>
        <TabBarIcon
          routeName={routeName}
          isFocused={isFocused}
          color={iconColor}
          size={24}
        />
      </Animated.View>

      <Animated.Text
        style={[
          styles.labelText, // [복원] 원래 스타일로 복원
          // [복원] 포커스 시 텍스트 색상이 colors.primary가 되도록 원래 로직으로 복원
          { color: isFocused ? colors.primary : colors.black },
          animatedTextStyle,
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
    paddingVertical: 6,
  },
  labelText: {
    fontSize: 12,
    marginTop: 4,
  },
});
