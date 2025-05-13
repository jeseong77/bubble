import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  ImageBackground,
  Platform, // Platform 모듈 임포트
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import CustomView from "@/components/CustomView";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur"; // <--- [추가] BlurView 임포트

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme(); // <--- [추가] isDark를 가져와서 tint에 사용
  const girl2Image = require("../../assets/images/girl3.png"); // 이미지 경로 확인 필요

  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    console.log(
      "HomeScreen - Bottom Tab Bar Height (from hook):",
      tabBarHeight
    );
  }, [tabBarHeight]);

  return (
    <CustomView>
      <ImageBackground
        source={girl2Image}
        resizeMode="cover"
        style={styles.imageBackgroundContainer}
      >
        <View style={styles.contentOverlay}>
          {/* BlurView로 Text를 감싸거나 Text의 배경처럼 배치합니다. */}
          {/* 여기서는 Text를 BlurView의 자식으로 넣어 BlurView가 패딩과 배경 역할을 하도록 합니다. */}
          <BlurView
            style={styles.blurContainer} // BlurView 자체 스타일
            intensity={Platform.OS === "ios" ? 70 : 90} // 블러 강도 (0-100), 플랫폼별로 적절한 값 사용
            tint={isDark ? "dark" : "light"} // 현재 테마에 맞는 tint 적용
          >
            <Text style={styles.exploreText}>Love</Text>
          </BlurView>
          {/* 다른 홈 화면 콘텐츠를 여기에 추가할 수 있습니다. */}
        </View>
      </ImageBackground>
    </CustomView>
  );
}

const styles = StyleSheet.create({
  imageBackgroundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentOverlay: {
    // contentOverlay는 이제 blurContainer의 위치를 잡는 역할도 합니다.
    // padding: 20, // 이 padding은 blurContainer 외부의 여백이 됩니다.
    // blurContainer 자체에 padding을 주는 것이 좋습니다.
    // 필요에 따라 contentOverlay에 스타일을 추가하여 blurContainer의 위치를 정밀하게 조정할 수 있습니다.
  },
  blurContainer: {
    // <--- [추가] BlurView를 위한 스타일
    paddingVertical: 15, // 블러 영역 내부의 상하 패딩
    paddingHorizontal: 25, // 블러 영역 내부의 좌우 패딩
    borderRadius: 15, // 모서리를 둥글게
    overflow: "hidden", // borderRadius가 일부 플랫폼(특히 Android)에서 잘 적용되도록 함
    alignItems: "center", // 내부 텍스트 가로 중앙 정렬
    justifyContent: "center", // 내부 텍스트 세로 중앙 정렬
    // backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', // <--- 필요시 반투명 배경 추가 가능 (테마 색상 사용)
    // 하지만 BlurView는 tint와 intensity로 충분한 경우가 많음
  },
  exploreText: {
    color: "#FFFFFF", // 이 색상은 블러된 배경 및 tint와 대비가 잘 되어야 합니다.
    // isDark 상태에 따라 colors.inverseOnSurface 등을 사용할 수도 있습니다.
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
});
