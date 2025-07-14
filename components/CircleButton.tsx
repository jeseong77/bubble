import React, { JSX } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";

interface CircleButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 59x59 크기의 원형 아이콘 버튼 컴포넌트 (함수 선언문 방식)
 * @param onPress - 버튼을 눌렀을 때 실행될 함수
 * @param disabled - 버튼의 비활성화 여부 (기본값: false)
 * @param style - 컴포넌트의 최상위 컨테이너에 적용할 추가 스타일
 */
export default function CircleButton({
  onPress,
  disabled = false,
  style,
}: CircleButtonProps): JSX.Element {
  const { colors } = useAppTheme();

  const buttonBackgroundColor = disabled
    ? colors.disableButton
    : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, style]}
      activeOpacity={0.7}
    >
      <View style={[styles.circle, { backgroundColor: buttonBackgroundColor }]}>
        <Feather name="chevron-right" size={32} color={colors.white} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 59,
    height: 59,
  },
  circle: {
    width: "100%",
    height: "100%",
    borderRadius: 59 / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
