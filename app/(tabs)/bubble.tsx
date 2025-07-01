import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useUIStore } from "@/stores/uiStore"; // [추가] Zustand 스토어 임포트
// [참고] useShallow는 현재 코드에서 필요하지 않지만, 필요시 아래처럼 임포트합니다.
// import { useShallow } from 'zustand/react/shallow'

// 이미지 파일의 경로를 정의합니다. 프로젝트 구조에 맞게 수정해주세요.
const bubbleImages = {
  "4-4": require("@/assets/images/4-4bubble.png"),
  "3-3": require("@/assets/images/3-3bubble.png"),
  "2-2": require("@/assets/images/2-2bubble.png"),
  mail: require("@/assets/images/mail-button.png"),
};

export default function BubbleScreen() {
  const router = useRouter();

  // [추가] 스토어에서 탭 바 높이를 가져옵니다.
  // 단일 원시 값(primitive value)을 선택할 때는 리렌더링이 자동으로 최적화되므로
  // useShallow를 사용할 필요가 없습니다.
  const customTabBarHeight = useUIStore((s) => s.customTabBarHeight);

  // [추가] CustomTabBar의 하단 간격 값을 그대로 가져옵니다.
  // (CustomTabBar.tsx의 styles.tabBar.bottom 값과 동일)
  const tabBarBottomOffset = Platform.OS === "ios" ? 30 : 20;

  // [추가] 메일 버튼이 탭 바 위로 자연스럽게 올라오도록 최종 bottom 값을 계산합니다.
  // (탭 바 높이 + 탭 바의 하단 여백 + 추가 여백 15)
  const mailButtonBottomPosition = customTabBarHeight + tabBarBottomOffset + 15;

  const handleBubblePress = (bubbleType: "2-2" | "3-3" | "4-4") => {
    console.log(`- ${bubbleType} bubble pressed`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.greetingText}>
          Hi <Text style={styles.nameText}>John!</Text>
        </Text>
        <Text style={styles.titleText}>
          Ready to form{"\n"}your <Text style={styles.bubbleText}>Bubble?</Text>
        </Text>
      </View>

      <View style={styles.bubblesContainer}>
        <TouchableOpacity
          style={[styles.bubbleWrapper, styles.bubble44]}
          onPress={() => handleBubblePress("4-4")}
        >
          <Image source={bubbleImages["4-4"]} style={styles.bubbleImage44} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bubbleWrapper, styles.bubble33]}
          onPress={() => handleBubblePress("3-3")}
        >
          <Image source={bubbleImages["3-3"]} style={styles.bubbleImage33} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bubbleWrapper, styles.bubble22]}
          onPress={() => handleBubblePress("2-2")}
        >
          <Image source={bubbleImages["2-2"]} style={styles.bubbleImage22} />
        </TouchableOpacity>
      </View>

      {/* Mail button without routing - just for visual */}
      <View style={[styles.mailButton, { bottom: mailButtonBottomPosition }]}>
        <Image source={bubbleImages.mail} style={styles.mailButtonImage} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... container, headerContainer, greetingText 등 다른 스타일은 변경 없음 ...
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
  },
  greetingText: {
    fontSize: 24,
    color: "#000000",
  },
  nameText: {
    fontWeight: "bold",
    color: "#5A99E5",
  },
  titleText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 8,
    lineHeight: 44,
  },
  bubbleText: {
    color: "#5A99E5",
  },
  bubblesContainer: {
    flex: 1,
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleWrapper: {
    position: "absolute",
  },
  bubble44: {
    top: "5%",
    left: "10%",
  },
  bubble33: {
    top: "50%",
    left: "5%",
  },
  bubble22: {
    top: "38%",
    right: "8%",
  },
  bubbleImage44: {
    width: 260,
    height: 260,
  },
  bubbleImage33: {
    width: 220,
    height: 220,
  },
  bubbleImage22: {
    width: 160,
    height: 160,
  },
  mailButton: {
    position: "absolute",
    // [제거] 고정된 bottom 값은 인라인 스타일로 대체되므로 제거합니다.
    right: 26,
  },
  mailButtonImage: {
    width: 75,
    height: 75,
  },
});
