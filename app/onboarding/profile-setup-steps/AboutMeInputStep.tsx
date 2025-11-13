import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";

interface AboutMeInputStepProps {
  currentAboutMe: string;
  onAboutMeChange: (text: string) => void;
  onSkip: () => void;
}

const AboutMeInputStep: React.FC<AboutMeInputStepProps> = ({
  currentAboutMe,
  onAboutMeChange,
  onSkip,
}) => {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={inputFieldContainerStyles.container}>
          <Text style={[styles.title, { color: colors.onBackground }]}>
            About me
          </Text>

          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.onSurface,
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}
            multiline
            placeholder="Who are you? 🤔"
            placeholderTextColor={colors.darkGray}
            value={currentAboutMe}
            onChangeText={onAboutMeChange}
            maxLength={500}
            scrollEnabled={true}
            textAlignVertical="top"
            selectionColor={colors.primary}
          />

          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={[styles.skipButtonText, { color: colors.navy }]}>
              Not Now
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

// StyleSheet.create는 정적인 스타일만 포함 (레이아웃, 폰트 등)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  title: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
    lineHeight: 40,
    textAlign: "center",
  },
  textInput: {
    fontFamily: "Quicksand-Regular",
    fontSize: 16, // 기존 값 유지
    // color: '#333333', // 제거됨 (동적 적용)
    // backgroundColor: '#FFFFFF', // 제거됨 (동적 적용)
    borderWidth: 1, // 기존 값 유지
    // borderColor: '#DDDDDD', // 제거됨 (동적 적용)
    borderRadius: 12, // 기존 값 유지
    paddingHorizontal: 15, // 기존 값 유지
    paddingTop: 15, // 기존 값 유지
    paddingBottom: 15, // 기존 값 유지
    minHeight: 150, // 기존 값 유지
    maxHeight: 250, // 기존 값 유지
    // shadowColor: "#000", // 제거됨 (동적 적용)
    // 그림자 관련 나머지 속성은 정적으로 유지 (색상만 동적으로 변경)
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.0,
    elevation: 3, // Android 그림자
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 20,
  },
  skipButtonText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 14,
    fontWeight: "700",
  },
  // charCounter: { // 주석 처리된 부분도 필요시 테마 적용 가능
  //   textAlign: 'right',
  //   marginTop: 5,
  //   fontSize: 12,
  //   // color: '#666666', // 제거됨 (동적 적용)
  // },
});

export default AboutMeInputStep;
