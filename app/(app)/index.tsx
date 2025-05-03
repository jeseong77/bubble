import React from 'react';
import { View, StyleSheet, Button } from 'react-native'; // 기본 Button 사용
import useAuthStore from '@/stores/authStore'; // Zustand 스토어 import (경로 확인)

export default function HomeScreen() {
  // Zustand 스토어에서 logout 함수 가져오기
  const logout = useAuthStore((state) => state.logout);

  return (
    // 전체 화면을 차지하고 내용을 중앙 정렬하는 View
    <View style={styles.container}>
      {/* 로그아웃 버튼 */}
      <Button title="로그아웃 (상태 초기화)" onPress={logout} />
      {/* 또는 CustomButton 사용 시:
        <CustomButton
          title="로그아웃 (상태 초기화)"
          onPress={logout}
          width={'60%'} // 예시 너비
          // buttonColor="#FF6347" // 예시 색상
          // textColor="#FFFFFF"
        />
      */}
    </View>
  );
}

// 필요한 스타일만 남김
const styles = StyleSheet.create({
  container: {
    flex: 1, // 화면 전체 사용
    justifyContent: 'center', // 수직 중앙 정렬
    alignItems: 'center', // 수평 중앙 정렬
    padding: 20,
  },
});