import React from "react";
import { View, Button, StyleSheet, Text } from "react-native"; // Text와 StyleSheet 추가
import { useRouter } from "expo-router"; // Expo Router의 useRouter 훅 import

// React 컴포넌트 이름은 대문자로 시작하는 것이 컨벤션입니다.
function ProfileScreen() {
  const router = useRouter(); // useRouter 훅을 사용하여 router 객체를 가져옵니다.

  // 설정 페이지로 이동하는 함수
  const navigateToSettings = () => {
    router.push("/settings"); // '/settings' 경로로 네비게이션합니다.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>프로필 페이지</Text>
      <Button
        title="설정으로 이동"
        onPress={navigateToSettings} // 버튼 클릭 시 navigateToSettings 함수 실행
      />
      {/* 여기에 다른 프로필 관련 UI 요소들을 추가할 수 있습니다. */}
    </View>
  );
}

// 간단한 스타일 추가
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center", // 내용을 수직 중앙 정렬
    alignItems: "center", // 내용을 수평 중앙 정렬
    padding: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30, // 버튼과의 간격
  },
});

// 변경된 컴포넌트 이름으로 export
export default ProfileScreen;
