import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] useAppTheme 훅 임포트 (경로 확인!)

type IconName = keyof typeof Ionicons.glyphMap;

interface CustomAppBarProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  backIconName?: IconName;
  backIconSize?: number;
  backIconColor?: string; // 사용자가 직접 색상을 지정할 수 있도록 prop은 유지
  title?: string;
  titleTextStyle?: TextStyle;
  rightComponent?: React.ReactNode;
  style?: ViewStyle; // AppBar 전체에 대한 커스텀 스타일
}

const CustomAppBar: React.FC<CustomAppBarProps> = ({
  showBackButton = true,
  onBackPress,
  backIconName = "chevron-back",
  backIconSize = 24,
  backIconColor: backIconColorProp, // prop으로 받은 색상을 backIconColorProp으로 받음
  title,
  titleTextStyle,
  rightComponent,
  style,
}) => {
  const router = useRouter();
  const { colors } = useAppTheme(); // <--- [추가] 현재 테마의 색상 가져오기

  // backIconColorProp이 제공되지 않으면 테마의 onBackground 색상을 기본값으로 사용
  const finalBackIconColor = backIconColorProp || colors.onBackground;

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
            color={finalBackIconColor} // <--- [변경] 테마 기반 아이콘 색상 적용
          />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRight = () => (
    <View style={styles.buttonPlaceholder}>{rightComponent}</View>
  );

  return (
    // AppBar의 배경은 기본적으로 투명하게 유지 (styles.appBar.backgroundColor)
    // 필요시 `style` prop을 통해 부모 컴포넌트에서 배경색을 지정하거나,
    // styles.appBar.backgroundColor를 colors.surface 등으로 변경할 수 있습니다.
    <View style={[styles.appBar, style]}>
      {renderLeft()}
      {title && (
        <Text
          style={[
            styles.title, // StyleSheet의 기본 스타일 (색상 제외)
            { color: colors.onBackground }, // <--- [변경] 테마 기반 제목 색상 적용
            titleTextStyle, // 사용자가 전달한 titleTextStyle이 있다면 이를 덮어씀
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
    height: 56, // 일반적인 앱바 높이
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    backgroundColor: "transparent", // 기본 배경은 투명. 부모의 배경을 따르거나 style prop으로 지정.
    // 예: colors.surface를 사용하려면 여기를 수정하거나 style prop 사용
  },
  backButton: {
    padding: 10, // 터치 영역 확보
  },
  buttonPlaceholder: {
    minWidth: 44, // 좌우 버튼 영역의 최소 너비 (균형을 위해)
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1, // 제목이 중앙 공간을 최대한 차지하도록
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    // color: '#000000', // <--- [제거] 이제 동적으로 적용됨
    marginHorizontal: 5, // 좌우 아이콘/버튼과의 최소 간격
  },
});

export default CustomAppBar;
