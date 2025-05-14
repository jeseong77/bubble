import React from "react";
import { View, Text, StyleSheet, ImageBackground } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import CustomView from "@/components/CustomView"; // <--- [추가] CustomView 임포트 (경로 확인!)

// 컴포넌트 함수의 이름은 PascalCase가 일반적이나,
// 파일 기반 라우팅에서는 파일 이름이 중요합니다. export default는 유지합니다.
function Message() {
  const { colors } = useAppTheme(); // 테마 색상 (텍스트 등 스타일에 사용 가능)
  const girl1Image = require("../../assets/images/girl1.png");
  const girl2Image = require("../../assets/images/talk.png");

  return (
    <CustomView>
      {/* CustomView가 화면 전체 프레임과 SafeArea, 하단 그라데이션을 제공합니다. */}
      {/* ImageBackground는 CustomView의 자식으로 들어가 전체 내용을 채웁니다. */}
      <ImageBackground
        source={girl2Image}
        resizeMode="cover"
        style={styles.imageBackgroundContainer} // flex: 1을 주어 CustomView 내부를 채움
      >
        {/* ImageBackground 위에 표시될 내용 */}
        <View style={styles.contentOverlay}>
          <Text style={styles.exploreText}>Talk</Text>
          {/* 여기에 탐색 페이지의 다른 UI 요소들을 추가할 수 있습니다. */}
        </View>
      </ImageBackground>
    </CustomView>
  );
}

const styles = StyleSheet.create({
  // styles.container는 ImageBackground에 적용될 스타일로 이름을 변경하거나 내용을 수정합니다.
  imageBackgroundContainer: {
    flex: 1, // CustomView의 content 영역을 꽉 채우도록 설정
    justifyContent: "center",
    alignItems: "center",
  },
  contentOverlay: {
    padding: 20,
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

// Expo Router는 파일 이름을 기반으로 라우트를 생성하므로,
// export default 이름은 파일 이름과 일치하거나 원하는 대로 설정할 수 있습니다.
// 여기서는 원래 함수 이름 'explore'를 유지합니다.
export default Message; // 함수 이름을 ExplorePage로 변경했으므로 export도 맞춰줍니다.
// 만약 원래 함수 이름 'explore'를 유지하고 싶다면 export default explore;
