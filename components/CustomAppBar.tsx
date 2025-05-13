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

const APPBAR_CONTENT_HEIGHT = 56; // AppBar 콘텐츠 영역의 실제 높이

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
  extendStatusBar?: boolean; // <-- [추가] 상태 표시줄 영역까지 배경 확장 여부 prop
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
  extendStatusBar = false, // <-- [추가] 기본값은 false
}) => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const defaultContentColor = background
    ? colors.onPrimary
    : colors.onBackground;

  const finalBackIconColor = backIconColorProp || defaultContentColor;

  // extendStatusBar prop 값에 따라 실제 상단 inset과 패딩 결정
  const topInsetForBackground = extendStatusBar ? insets.top : 0;
  const appBarTotalHeight = APPBAR_CONTENT_HEIGHT + topInsetForBackground;
  const appBarContentPaddingTop = extendStatusBar
    ? insets.top
    : 0;

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

  return (
    <View // 메인 AppBar 컨테이너
      style={[
        // 기본 스타일: 높이, 내부 콘텐츠 정렬 등
        {
          height: appBarTotalHeight, // 전체 높이 계산 값 적용
          paddingTop: appBarContentPaddingTop, // 콘텐츠 영역 상단 패딩 계산 값 적용
          flexDirection: "row",
          alignItems: "center", // AppBar 콘텐츠 영역 내에서 아이템들을 수직 중앙 정렬
          justifyContent: "space-between",
          paddingHorizontal: 10, // 좌우 패딩
        },
        style, // 사용자가 전달한 스타일
        background ? { backgroundColor: "transparent" } : {}, // BlurView 사용 시 배경 투명 처리
      ]}
    >
      {background && (
        <BlurView
          intensity={blurIntensity}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill} // 전체 AppBar 컨테이너(상태 표시줄 영역 포함 또는 미포함)를 채움
        />
      )}
      {/* 콘텐츠는 paddingTop 이후의 공간에 렌더링됨 */}
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
  sideItemContainer: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    height: APPBAR_CONTENT_HEIGHT, // 컨테이너 높이를 콘텐츠 높이와 일치시켜 아이템 정렬 용이
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
    height: APPBAR_CONTENT_HEIGHT, // 제목 영역의 높이
    lineHeight: APPBAR_CONTENT_HEIGHT, // 텍스트 수직 중앙 정렬을 위함 (근사치)
  },
});

export default CustomAppBar;
