import React from "react"; // useCallback을 사용하기 위해 React import
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router"; // 화면 포커스/블러 효과를 위해 import
import CustomAppBar from "@/components/CustomAppBar"; // CustomAppBar 컴포넌트의 실제 경로로 수정해주세요.
import { useUIStore } from "@/stores/uiStore"; // 수정한 Zustand 스토어 import

export default function SettingsScreen() {
  // Zustand 스토어에서 탭 바 제어 함수들을 가져옵니다.
  const { hideTabBar, showTabBar } = useUIStore();

  useFocusEffect(
    React.useCallback(() => {
      // 이 화면이 사용자에게 보여질 때 (포커스될 때) 실행됩니다.
      hideTabBar(); // 탭 바를 숨깁니다.
      console.log("SettingsScreen focused: TabBar hidden via uiStore");

      return () => {
        // 이 화면이 사용자에게서 사라질 때 (포커스를 잃을 때) 실행됩니다.
        // 예: 뒤로 가거나 다른 탭으로 이동 등
        showTabBar(); // 탭 바를 다시 보이도록 합니다.
        console.log("SettingsScreen blurred: TabBar shown via uiStore");
      };
    }, [hideTabBar, showTabBar]) // 의존성 배열: hideTabBar, showTabBar 함수가 변경되지 않는 한 콜백은 재생성되지 않음
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomAppBar title="설정" />
      <View style={styles.content}>
        <Text style={styles.text}>Settings Page</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  text: {
    fontSize: 20,
    color: "#333333",
  },
});
