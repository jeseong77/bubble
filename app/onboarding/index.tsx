import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Image } from "react-native";
import { Stack, useRouter } from "expo-router";
import useAuthStore from "@/stores/authStore"; // 경로 확인
import CustomButton from "@/components/CustomButton"; // 경로 확인
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] 테마 훅 임포트 (경로 확인!)

const onboardingPhases = [
  {
    topText1: "Welcome to",
    topText2: "The Bubble!",
    bottomText: "The app\ndesigned for...",
    image: require("../../assets/images/ob_logo.png"), // 이미지 경로 확인
    buttonTitle: "Continue",
  },
  {
    title: "Meeting New\nPeople Safely,",
    body: "Meeting new people doesn't have to feel risky.\nGroup dating offers peace of mind with friends\naround to support and look out for you.",
    buttonTitle: "Continue",
  },
  {
    title: "Enjoyable\nDating.",
    body: "Dating should be enjoyable, not awkward.\nThat's why we make every interaction group\ncentric. With your friends by your side, every\nouting turns into a shared adventure.",
    buttonTitle: "Continue",
  },
  {
    title: "& Unforgettable\nMemories.",
    body: "Unforgettable moments happen when people\ncome together. The bubble creates experiences\nthat are worth sharing.",
    buttonTitle: "Sign up",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme(); // <--- [추가] 현재 테마의 색상 가져오기
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const [currentPhase, setCurrentPhase] = useState(0);

  const currentPhaseData = onboardingPhases[currentPhase];

  const handleNextPress = () => {
    if (currentPhase < onboardingPhases.length - 1) {
      setCurrentPhase((prev) => prev + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      completeOnboarding();
      console.log("Onboarding completed, navigating to profile setup...");
      router.replace("/onboarding/profile-setup");
    } catch (e) {
      console.error("Failed to complete onboarding or navigate", e);
    }
  };

  const renderPhaseContent = () => {
    if (currentPhase === 0) {
      return (
        <View style={styles.phaseContentContainer1}>
          <View style={styles.phaseTitleBox}>
            {/* phaseTitle1에 동적 텍스트 색상 적용 */}
            <Text style={[styles.phaseTitle1, { color: colors.onBackground }]}>
              {currentPhaseData.topText1}
            </Text>
            {/* phaseTitle2에 동적 텍스트 색상 적용 */}
            <Text
              style={[
                styles.phaseTitle2,
                { paddingLeft: 12, color: colors.onBackground },
              ]}
            >
              {currentPhaseData.topText2}
            </Text>
          </View>

          {currentPhaseData.image && (
            <Image
              source={currentPhaseData.image}
              style={[styles.phaseImage, { marginLeft: 64, marginBottom: 45 }]}
              resizeMode="contain"
            />
          )}
          <View style={styles.phase1BottomTextBox}>
            {/* phase1BottomText에 동적 텍스트 색상 적용 */}
            <Text
              style={[styles.phase1BottomText, { color: colors.onBackground }]}
            >
              {currentPhaseData.bottomText}
            </Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.phaseContentContainerRest}>
          {/* phaseTitle1 (Phase 2,3,4)에 동적 텍스트 색상 적용 */}
          <Text style={[styles.phaseTitle1, { color: colors.onBackground }]}>
            {currentPhaseData.title}
          </Text>
          {/* phaseBody에 동적 텍스트 색상 적용 */}
          <Text style={[styles.phaseBody, { color: colors.onSurfaceVariant }]}>
            {currentPhaseData.body}
          </Text>
        </View>
      );
    }
  };

  return (
    // screenContainer에 동적 배경색 적용
    <SafeAreaView
      style={[styles.screenContainer, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.contentContainer}>
        {renderPhaseContent()}
        <CustomButton
          title={currentPhaseData.buttonTitle}
          onPress={handleNextPress}
          // paddingBottom={32} // CustomButton 내부에서 패딩 관리 권장 또는 style prop으로 전달
          // paddingTop={32}  // CustomButton 내부에서 패딩 관리 권장 또는 style prop으로 전달
          width={"90%"}
          buttonColor={colors.primary} // <--- [변경] 테마의 primary 색상
          textColor={colors.onPrimary} // <--- [변경] 테마의 onPrimary 색상
          style={styles.continueButton} // borderRadius 등은 여기에 유지
        />
      </View>
    </SafeAreaView>
  );
}

// StyleSheet.create는 정적인 스타일만 포함
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    // backgroundColor: "#f0f0f0", // 제거됨 (동적 적용)
  },
  contentContainer: {
    flex: 1, // 내부 컨텐츠가 공간을 채우고 버튼을 하단에 위치시키도록
    justifyContent: "space-between", // 컨텐츠와 버튼을 위아래로 분산
    alignItems: "center", // 버튼 등을 중앙 정렬
  },
  phaseContentContainer1: {
    width: "100%",
    alignItems: "center", // 내부 이미지 등이 중앙에 오도록 (선택적)
  },
  phaseContentContainerRest: {
    // marginTop: 487, // 이 값은 고정값보다 flex 레이아웃으로 조절하는 것이 좋음
    flex: 1, // 남은 공간을 채우도록
    justifyContent: "center", // 내용을 중앙에
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20, // 좌우 여백
  },
  phaseImage: {
    width: 254,
    height: 254,
    // marginLeft, marginBottom은 인라인으로 유지됨
  },
  phaseTitleBox: {
    marginTop: 120, // 상단 여백 (화면 크기에 따라 조절 필요)
    // marginLeft: 16, // phaseContentContainer1에서 alignItem: 'center' 등을 사용하면 불필요할 수 있음
    marginBottom: 60,
    alignItems: "flex-start", // 텍스트를 왼쪽 정렬 (기본값)
    width: "90%", // 좌우 여백을 위해
  },
  phaseTitle1: {
    fontFamily: "Literata", // 폰트 로드 확인 필요
    textAlign: "center", // Phase 2,3,4는 중앙 정렬 유지
    fontSize: 38,
    lineHeight: 42, // 줄 간격
    // color: "#000000", // 제거됨 (동적 적용)
  },
  phaseTitle2: {
    fontFamily: "Literata", // 폰트 로드 확인 필요
    fontSize: 48,
    lineHeight: 50,
    // color: "#000000", // 제거됨 (동적 적용)
    // paddingLeft는 인라인으로 유지됨
  },
  phaseBody: {
    fontFamily: "Literata", // 폰트 로드 확인 필요
    fontSize: 16,
    textAlign: "center",
    // color: "#555555", // 제거됨 (동적 적용)
    lineHeight: 20,
    paddingHorizontal: 10, // 문단 좌우 내부 여백
    marginTop: 20,
  },
  phase1BottomText: {
    textAlign: "right",
    fontFamily: "Literata", // 폰트 로드 확인 필요
    fontSize: 40,
    // color: "#333333", // 제거됨 (동적 적용)
  },
  phase1BottomTextBox: {
    alignSelf: "stretch", // 부모 너비에 맞춤
    marginRight: 26, // 오른쪽 여백
    marginTop: 20, // 이미지와의 간격 (선택적)
  },
  continueButton: {
    // marginTop: "auto", // flex:1 과 justifyContent: 'space-between' 으로 인해 자동으로 하단에 위치
    alignSelf: "center", // contentContainer의 alignItems가 이미 center이므로 중복될 수 있음
    borderRadius: 5000, // 매우 큰 값으로 완전한 원형 캡슐 모양 버튼
  },
});
