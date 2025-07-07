import React, { JSX } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  DimensionValue, // DimensionValue 타입 import
} from "react-native";

// Props 인터페이스 업데이트
interface CustomButtonProps {
  onPress: () => void;
  title: string;
  buttonColor?: string; // 활성 상태 배경색
  buttonColorDisabled?: string; // 비활성 상태 배경색 추가
  textColor?: string; // 활성 상태 텍스트 색
  textColorDisabled?: string; // 비활성 상태 텍스트 색 추가
  horizontalMargin?: number;
  disabled?: boolean;
  activeOpacity?: number;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  paddingVertical?: number;
  width?: DimensionValue;
}

// React.FC 제거하고 함수 파라미터에 직접 타입 지정
const CustomButton = ({
  onPress,
  title,
  buttonColor = "#007AFF",
  buttonColorDisabled = "#A9A9A9", // 비활성 색상 기본값
  textColor = "#FFFFFF",
  textColorDisabled = "#E0E0E0", // 비활성 텍스트 색상 기본값
  horizontalMargin = 0,
  disabled = false,
  activeOpacity = 0.7,
  loading = false,
  style,
  textStyle,
  paddingVertical = 16,
  width = "80%",
}: CustomButtonProps): JSX.Element => {
  // 반환 타입 명시

  // 현재 상태에 따른 색상 결정 (props 우선 사용)
  const currentButtonColor =
    disabled || loading ? buttonColorDisabled : buttonColor;
  const currentTextColor = disabled || loading ? textColorDisabled : textColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
      // 스타일 배열 안에서 동적 스타일 직접 적용
      style={[
        styles.container, // StyleSheet의 기본 스타일
        {
          // 동적으로 계산되는 스타일
          backgroundColor: currentButtonColor,
          marginHorizontal: horizontalMargin,
          paddingVertical: paddingVertical,
          width: width, // 타입 단언 제거
        },
        style, // 외부에서 전달된 커스텀 스타일
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentTextColor} />
      ) : (
        <Text style={[styles.text, { color: currentTextColor }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 30,
    alignSelf: "center",
  },
  text: {
    fontFamily: "Quicksand-SemiBold",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default CustomButton;
