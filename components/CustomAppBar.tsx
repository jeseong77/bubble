// components/CustomAppBar.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

const APPBAR_CONTENT_HEIGHT = 56;

interface CustomAppBarProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  backIconName?: IconName;
  backIconSize?: number;
  backIconColor?: string;
  title?: string;
  titleTextStyle?: TextStyle;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
  background?: boolean;
  blurIntensity?: number;
  extendStatusBar?: boolean;
}

const CustomAppBar: React.FC<CustomAppBarProps> = ({
  showBackButton = true,
  onBackPress,
  backIconName = "chevron-back",
  backIconSize = 24,
  backIconColor: backIconColorProp,
  title,
  titleTextStyle,
  leftComponent,
  rightComponent,
  style,
  background = false,
  blurIntensity = Platform.OS === "ios" ? 70 : 100,
  extendStatusBar = false,
}) => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const defaultContentColor = background
    ? colors.black
    : colors.white;

  const finalBackIconColor = backIconColorProp || defaultContentColor;

  const topInsetForBackground = extendStatusBar ? insets.top : 0;
  const appBarTotalHeight = APPBAR_CONTENT_HEIGHT + topInsetForBackground;
  const appBarContentPaddingTop = extendStatusBar ? insets.top : 0;

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const effectiveBackPress = onBackPress || handleGoBack;

  const renderLeft = () => {
    if (leftComponent) {
      return <View style={styles.sideItemContainer}>{leftComponent}</View>;
    }
    if (showBackButton) {
      return (
        <View style={styles.sideItemContainer}>
          <TouchableOpacity
            onPress={effectiveBackPress}
            style={styles.backButton}
          >
            <Ionicons
              name={backIconName}
              size={backIconSize}
              color={finalBackIconColor}
            />
          </TouchableOpacity>
        </View>
      );
    }
    return <View style={styles.sideItemContainer} />;
  };

  const renderRight = () => (
    <View style={styles.sideItemContainer}>{rightComponent}</View>
  );

  const baseStyle = background ? styles.appBarAbsoluteBase : {};

  return (
    <View
      style={[
        baseStyle,
        {
          height: appBarTotalHeight,
          paddingTop: appBarContentPaddingTop,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 10,
        },
        style,
        background ? { backgroundColor: "transparent" } : {},
      ]}
    >
      {background && (
        <BlurView
          intensity={blurIntensity}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      {renderLeft()}
      {title && (
        <Text
          style={[styles.title, { color: defaultContentColor }, titleTextStyle]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
      {renderRight()}
    </View>
  );
};

const styles = StyleSheet.create({
  appBarAbsoluteBase: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  sideItemContainer: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    height: APPBAR_CONTENT_HEIGHT,
  },
  backButton: {
    padding: 10,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 5,
    height: APPBAR_CONTENT_HEIGHT,
    lineHeight: APPBAR_CONTENT_HEIGHT,
  },
});

export default CustomAppBar;
