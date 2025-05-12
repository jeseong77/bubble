// components/CustomTabBarButton.tsx
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  GestureResponderEvent,
} from "react-native";
import React, { useEffect } from "react";
import { icons } from "@/constants/Icons";
import { useTheme } from "@react-navigation/native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  // For more control over spring, you can import:
  // WithSpringConfig,
  // Easing,
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
  const { colors } = useTheme();
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
    const scaleValue = interpolate(scale.value, [0, 1], [1, 1.2]); // Icon is smaller when not focused, larger when focused
    // 2. Calculate 'top' value directly inside useAnimatedStyle
    const topValue = interpolate(scale.value, [0, 1], [0, 9]); // Moves down by 9 when not focused, 0 when focused
    return {
      transform: [{ scale: scaleValue }],
      top: topValue,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    // Text becomes transparent when focused, opaque when not focused
    const opacity = interpolate(scale.value, [0, 1], [1, 0]);
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
            color={isFocused ? '#fff' : '#222'}
          />
        ) : (
          <View style={{ width: 24, height: 24 }} /> // Placeholder
        )}
      </Animated.View>

      <Animated.Text
        style={[
          styles.labelText, // Base styles for the label
          { color: isFocused ? "#6363D3" : "#333" }, // Dynamic color
          animatedTextStyle, // Animated opacity
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
    justifyContent: "center", // To better center content vertically if needed
    paddingVertical: 8,
    // The height of the tab item might need to be fixed or have minHeight
    // to accommodate the icon moving up and down, preventing layout shifts.
    // For example: minHeight: 60,
  },
  labelText: {
    // fontSize and marginTop were previously in the inline style, moved here for clarity
    fontSize: 12,
    marginTop: 4, // Spacing between icon and text
    // Consider adding a fixed height or line height if text visibility changes cause jumps
  },
});
