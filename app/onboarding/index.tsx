import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Image } from "react-native";
import { Stack, useRouter } from "expo-router";
import useAuthStore from "@/stores/authStore";
import CustomButton from "@/components/CustomButton";

const onboardingPhases = [
  {
    topText1: "Welcome to", // Phase 1 상단 텍스트
    topText2: "The Bubble!", // Phase 1 상단 텍스트
    bottomText: "The app\ndesigned for...", // Phase 1 하단 텍스트
    image: require("../../assets/images/ob_logo.png"),
    buttonTitle: "Continue",
  },
  {
    title: "Meeting New\nPeople Safely,", // Phase 2, 3, 4용 제목
    body: "Meeting new people doesn't have to feel risky.\nGroup dating offers peace of mind with friends\naround to support and look out for you.", // Phase 2, 3, 4용 본문
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
      completeOnboarding(); // Zustand 상태 업데이트 (onboarding 완료)
      console.log("Onboarding completed, navigating to profile setup..."); // 로그 메시지 변경
      router.replace("/onboarding/profile-setup"); // <<< 이동 경로 수정!
    } catch (e) {
      console.error("Failed to complete onboarding or navigate", e);
    }
  };

  // --- renderPhaseContent 함수 수정 ---
  const renderPhaseContent = () => {
    if (currentPhase === 0) {
      // --- Phase 1 (index 0) 렌더링 ---
      return (
        <View style={styles.phaseContentContainer1}>
          <View style={styles.phaseTitleBox}>
            <Text style={styles.phaseTitle1}>{currentPhaseData.topText1}</Text>
            <Text style={[styles.phaseTitle2, { paddingLeft: 12 }]}>
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
          {/* Phase 1 하단 텍스트를 위한 스타일 추가 또는 기존 스타일 활용 */}
          <View style={styles.phase1BottomTextBox}>
            <Text style={styles.phase1BottomText}>
              {currentPhaseData.bottomText}
            </Text>
          </View>
        </View>
      );
    } else {
      // --- Phase 2, 3, 4 렌더링 ---
      return (
        <View style={styles.phaseContentContainerRest}>
          <Text style={styles.phaseTitle1}>{currentPhaseData.title}</Text>
          <Text style={styles.phaseBody}>{currentPhaseData.body}</Text>
        </View>
      );
    }
  };
  // --- -------------------------- ---

  return (
    <SafeAreaView style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.contentContainer}>
        {renderPhaseContent()}
        <CustomButton
          title={currentPhaseData.buttonTitle}
          onPress={handleNextPress}
          paddingBottom={32}
          paddingTop={32}
          width={"90%"}
          buttonColor="#6363D3"
          textColor="#FFFFFF"
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  contentContainer: {
    flex: 1,
  },
  phaseContentContainer1: {
    width: "100%",
  },
  phaseContentContainerRest: {
    marginTop: 487,
    alignItems: "center",

    width: "100%",
  },
  phaseImage: {
    width: 254,
    height: 254,
  },
  phaseTitleBox: {
    marginTop: 120,
    marginLeft: 16,
    marginBottom: 60,
  },
  phaseTitle1: {
    fontFamily: "Literata",
    textAlign: "center",
    fontSize: 38,
    lineHeight: 42,
    color: "#000000",
  },
  phaseTitle2: {
    fontFamily: "Literata",
    fontSize: 48,
    lineHeight: 50,
    color: "#000000",
  },
  phaseBody: {
    fontFamily: "Literata",
    fontSize: 16,
    textAlign: "center",
    color: "#555555",
    lineHeight: 20,
    paddingHorizontal: 10,
    marginTop: 20,
  },
  phase1BottomText: {
    textAlign: "right",
    fontFamily: "Literata",
    fontSize: 40,
    color: "#333333",
  },
  phase1BottomTextBox: {
    marginRight: 26,
  },
  continueButton: {
    marginTop: "auto",
    borderRadius: 5000,
  },
});
