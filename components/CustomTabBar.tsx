// components/CustomTabBar.tsx
import {
  View,
  StyleSheet,
  Text,
  Platform,
  LayoutChangeEvent,
} from "react-native"; // Ensure Text is imported if not already
import { useTheme } from "@react-navigation/native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import CustomTabBarButton from "./CustomTabBarButton";
// import { useLinkBuilder } from "@react-navigation/native"; // buildHref not used if PlatformPressable removed

// Make sure your IconName type or similar is available or handled by your icons object
// For example, if icons has an index signature or you cast route.name
import { icons } from "@/constants/Icons"; // Assuming this is where icons is defined
import { useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// If your icons object has specific keys, define them for routeName type safety
type KnownIconRouteNames = keyof typeof icons;

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const [dimensions, setDimensions] = useState({ height: 20, width: 100 });
  const buttonWidth = dimensions.width / state.routes.length;

  const onTabbarLayout = (e: LayoutChangeEvent) => {
    setDimensions({
      height: e.nativeEvent.layout.height,
      width: e.nativeEvent.layout.width,
    });
  };

  const tabPositionX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: tabPositionX.value }],
    };
  });

  return (
    <View onLayout={onTabbarLayout} style={styles.tabBar}>
      <Animated.View
        style={[
          animatedStyle,
          {
            position: "absolute",
            backgroundColor: "#6363D3",
            borderRadius: 30,
            marginHorizontal: 12,
            height: dimensions.height - 15,
            width: buttonWidth - 25,
          },
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        let labelString: string;
        if (typeof options.tabBarLabel === "function") {
          // If tabBarLabel is a function, React Navigation would normally pass it
          // props like { focused, color, children (default string label) }.
          // Since our CustomTabBarButton expects a simple string for its Text component,
          // we'll use a fallback string. The 'children' part of what RN passes
          // to a tabBarLabel function is typically options.title or route.name.
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
          tabPositionX.value = withSpring(buttonWidth * index, {
            duration: 1500,
          });
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // Ensure route.params are passed if they exist
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
            label={labelString} // Pass the resolved string label
            routeName={String(route.name)}
          />
        );
      })}
    </View>
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
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 35,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  // tabItem style is managed within CustomTabBarButton.tsx
});
