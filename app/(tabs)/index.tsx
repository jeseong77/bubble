import React from "react";
import { View, StyleSheet, Button, SafeAreaView } from "react-native"; // 기본 Button 사용
import useAuthStore from "@/stores/authStore"; // Zustand 스토어 import (경로 확인)
import { useAppTheme } from "@/hooks/useAppTheme";

export default function HomeScreen() {
  // Zustand 스토어에서 logout 함수 가져오기
  const logout = useAuthStore((state) => state.logout);
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <Button title="로그아웃 (상태 초기화)" onPress={logout} />
    </SafeAreaView>
  );
}

// 필요한 스타일만 남김
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
});
