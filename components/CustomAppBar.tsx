import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform, // Platform 추가
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";
import { BlurView } from "expo-blur"; // BlurView 임포트

type IconName = keyof typeof Ionicons.glyphMap;

interface CustomAppBarProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  backIconName?: IconName;
  backIconSize?: number;
  backIconColor?: string;
  title?: string;
  titleTextStyle?: TextStyle;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
  background?: boolean; // true일 경우 BlurView 배경, false일 경우 투명 배경
  blurIntensity?: number; // BlurView의 강도 설정 옵션 추가
}

const CustomAppBar: React.FC<CustomAppBarProps> = ({
  showBackButton = true,
  onBackPress,
  backIconName = "chevron-back",
  backIconSize = 24,
  backIconColor: backIconColorProp,
  title,
  titleTextStyle,
  rightComponent,
  style,
  background = false,
  // 기본 블러 강도 설정 (iOS와 Android에서 유사한 시각적 효과를 위해 값 차등)
  blurIntensity = Platform.OS === "ios" ? 70 : 100,
}) => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme(); // isDark는 BlurView의 tint에 사용

  // 'background' prop에 따른 기본 콘텐츠 색상 결정
  // true (BlurView 사용 시): onPrimary (BlurView가 주 배경 역할을 한다고 가정)
  // false (투명 배경 시): onBackground
  const defaultContentColor = background
    ? colors.onPrimary
    : colors.onBackground;

  // 최종 뒤로가기 아이콘 색상
  const finalBackIconColor = backIconColorProp || defaultContentColor;

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const effectiveBackPress = onBackPress || handleGoBack;

  const renderLeft = () => (
    <View style={styles.buttonPlaceholder}>
      {showBackButton && (
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
      )}
    </View>
  );

  const renderRight = () => (
    <View style={styles.buttonPlaceholder}>{rightComponent}</View>
  );

  return (
    <View
      style={[
        styles.appBar, // 기본 AppBar 스타일 (높이, flex 정렬, 패딩 등)
        style, // 사용자가 전달한 커스텀 스타일
        // 'background'가 true (BlurView 사용)일 경우, AppBar 컨테이너 자체의 배경색을 투명하게 강제합니다.
        // 이는 사용자가 'style' prop으로 전달한 배경색을 덮어쓰고 BlurView가 보이도록 보장합니다.
        background ? { backgroundColor: "transparent" } : {},
      ]}
    >
      {background && (
        <BlurView
          intensity={blurIntensity}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill} // 부모 View (AppBar)를 완전히 채웁니다.
        />
      )}
      {/* 콘텐츠는 BlurView 위에 렌더링됩니다. */}
      {renderLeft()}
      {title && (
        <Text
          style={[
            styles.title, // 기본 제목 스타일
            { color: defaultContentColor }, // 동적으로 결정된 제목 색상
            titleTextStyle, // 사용자가 전달한 제목 스타일 (색상 덮어쓰기 가능)
          ]}
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
  appBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    // backgroundColor는 동적으로 처리되거나, background=false 시 사용자의 'style' prop에 의해 설정됩니다.
    // background=true 시에는 { backgroundColor: "transparent" }가 강제로 적용됩니다.
  },
  backButton: {
    padding: 10, // 터치 영역 확보
  },
  buttonPlaceholder: {
    // 좌우 컴포넌트 영역의 최소 너비를 확보하여 정렬을 돕습니다.
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1, // 제목이 남은 공간을 차지하고 중앙 정렬되도록 합니다.
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 5, // 제목이 좌우 컴포넌트에 너무 붙지 않도록 여백을 줍니다.
    // color는 동적으로 적용됩니다.
  },
});

export default CustomAppBar;
