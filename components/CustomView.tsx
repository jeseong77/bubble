// components/CustomView.tsx
import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native"; // Platform import 제거 (현재 미사용)
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/hooks/useAppTheme"; // 경로 확인

interface CustomViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const CustomView: React.FC<CustomViewProps> = ({ children, style }) => {
  const { colors } = useAppTheme();

  // gradientColors 배열을 선언할 때 'as const'를 추가하여
  // TypeScript가 이 배열을 읽기 전용 튜플 타입으로 인식하도록 합니다.
  const gradientColors = [
    `${colors.background}00`, // 완전 투명 (Hex8 alpha: 00)
    `${colors.background}99`, // 중간 투명도 (Hex8 alpha: 99)
    colors.background, // 완전 불투명 (테마 배경색)
  ] as const; // <--- [변경] 'as const' 추가

  return (
    <View
      style={[
        styles.safeAreaBase,
        { backgroundColor: colors.background },
        style,
      ]}
    >
      {children}
      <LinearGradient
        colors={gradientColors} // 이제 타입 에러가 발생하지 않아야 합니다.
        locations={[0, 0.7, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeAreaBase: {
    flex: 1,
  },
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: '20%',
  },
});

export default CustomView;
