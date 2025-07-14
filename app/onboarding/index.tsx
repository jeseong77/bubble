import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Image } from "react-native";
import { Stack, useRouter } from "expo-router";
import useAuthStore from "@/stores/authStore";
import CustomButton from "@/components/CustomButton";
import { useAppTheme } from "@/hooks/useAppTheme";

const onboardingPhases = [
  {
    topText1: "Welcome to",
    topText2: "The Bubble!",
    bottomText: "The app\ndesigned for...",
    image: require("../../assets/images/ob_logo.png"),
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
  const { colors } = useAppTheme();
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
            <Text style={[styles.phaseTitle1, { color: colors.black }]}>
              {currentPhaseData.topText1}
            </Text>
            <Text
              style={[
                styles.phaseTitle2,
                { paddingLeft: 12, color: colors.black },
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
            <Text style={[styles.phase1BottomText, { color: colors.black }]}>
              {currentPhaseData.bottomText}
            </Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.phaseContentContainerRest}>
          <Text style={[styles.phaseTitle1, { color: colors.black }]}>
            {currentPhaseData.title}
          </Text>
          <Text style={[styles.phaseBody, { color: colors.black }]}>
            {currentPhaseData.body}
          </Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.screenContainer, { backgroundColor: colors.white }]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.contentContainer}>
        {renderPhaseContent()}
        <CustomButton
          title={currentPhaseData.buttonTitle}
          onPress={handleNextPress}
          width={"90%"}
          buttonColor={colors.primary}
          textColor={colors.black}
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  phaseContentContainer1: {
    width: "100%",
    alignItems: "center",
  },
  phaseContentContainerRest: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  phaseImage: {
    width: 254,
    height: 254,
  },
  phaseTitleBox: {
    marginTop: 120,
    marginBottom: 60,
    alignItems: "flex-start",
    width: "90%",
  },
  phaseTitle1: {
    fontFamily: "Quicksand-Bold",
    textAlign: "center",
    fontSize: 38,
    lineHeight: 42,
  },
  phaseTitle2: {
    fontFamily: "Quicksand-Bold",
    fontSize: 48,
    lineHeight: 50,
  },
  phaseBody: {
    fontFamily: "Quicksand-Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
    marginTop: 20,
  },
  phase1BottomText: {
    textAlign: "right",
    fontFamily: "Quicksand-Regular",
    fontSize: 40,
  },
  phase1BottomTextBox: {
    alignSelf: "stretch",
    marginRight: 26,
    marginTop: 20,
  },
  continueButton: {
    alignSelf: "center",
    borderRadius: 5000,
  },
});
