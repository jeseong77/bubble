import React from "react";
import {
  View,
  Button,
  StyleSheet,
  Text,
  SafeAreaView,
  ImageBackground,
} from "react-native"; // Text와 StyleSheet 추가
import { useRouter } from "expo-router"; // Expo Router의 useRouter 훅 import
import { useAppTheme } from "@/hooks/useAppTheme";
import CustomAppBar from "@/components/CustomAppBar";
import CustomView from "@/components/CustomView";

// React 컴포넌트 이름은 대문자로 시작하는 것이 컨벤션입니다.
function ProfileScreen() {
  const router = useRouter(); // useRouter 훅을 사용하여 router 객체를 가져옵니다.
  const { colors } = useAppTheme();
  const girl2Image = require("../../assets/images/girl4.png");

  // 설정 페이지로 이동하는 함수
  const navigateToSettings = () => {
    router.push("/settings"); // '/settings' 경로로 네비게이션합니다.
  };

  return (
    <CustomView>
      {/* CustomView가 화면 전체 프레임과 SafeArea, 하단 그라데이션을 제공합니다. */}
      {/* ImageBackground는 CustomView의 자식으로 들어가 전체 내용을 채웁니다. */}
      <ImageBackground
        source={girl2Image}
        resizeMode="cover"
        style={styles.imageBackgroundContainer} // flex: 1을 주어 CustomView 내부를 채움
      >
        <SafeAreaView style={[styles.container]}>
          <CustomAppBar
            title="You"
            rightComponent={
              <Button
                title="설정"
                onPress={navigateToSettings} // 버튼 클릭 시 navigateToSettings 함수 실행
              />
            }
          />

          {/* 여기에 다른 프로필 관련 UI 요소들을 추가할 수 있습니다. */}
        </SafeAreaView>
      </ImageBackground>
    </CustomView>
  );
}

// 간단한 스타일 추가
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageBackgroundContainer: {
    flex: 1,
  },
  contentOverlay: {
    flex: 1,
  },
  exploreText: {
    // 배경 이미지(girl1Image)와 잘 대비되는 색상을 선택해야 합니다.
    // 예시: girl1Image가 어두운 경우 밝은 색상 사용
    color: "#FFFFFF", // 또는 테마 색상 중 밝은 색 (예: colors.surface, 또는 colors.onPrimary가 밝다면 그것)
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
});

// 변경된 컴포넌트 이름으로 export
export default ProfileScreen;
