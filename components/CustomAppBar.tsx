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
  background?: boolean; // true일 때 BlurView 배경 및 'absolute' 포지셔닝 활성화
  blurIntensity?: number;
  extendStatusBar?: boolean; // 상태 표시줄 영역까지 배경 확장 여부 prop
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
  background = false, // 기본값 false
  blurIntensity = Platform.OS === "ios" ? 70 : 100,
  extendStatusBar = false, // 기본값 false
}) => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const defaultContentColor = background // 'background' prop이 true (블러 배경)일 때 콘텐츠 색상 결정
    ? colors.onPrimary
    : colors.onBackground;

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

  // 'background' prop이 true일 때만 절대 위치 스타일(appBarAbsoluteBase) 적용
  const baseStyle = background ? styles.appBarAbsoluteBase : {};

  return (
    <View // 메인 AppBar 컨테이너
      style={[
        baseStyle, // background prop에 따라 절대 위치 스타일 또는 빈 객체 적용
        {
          height: appBarTotalHeight,
          paddingTop: appBarContentPaddingTop,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 10,
        },
        style, // 사용자가 전달한 스타일 (position, zIndex 등 덮어쓰기 가능)
        // background가 true일 때만 backgroundColor를 transparent로 설정 (BlurView 위함)
        // background가 false이면, 이 객체는 아무것도 하지 않으므로,
        // 사용자의 style prop이나 다른 스타일에서 배경색을 설정할 수 있음.
        background ? { backgroundColor: "transparent" } : {},
      ]}
    >
      {background && ( // background가 true일 때만 BlurView 렌더링
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
    // 'background={true}'일 때 적용될 절대 위치 스타일
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
