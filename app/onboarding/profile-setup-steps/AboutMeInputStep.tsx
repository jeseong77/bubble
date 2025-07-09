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
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] 테마 훅 임포트 (경로 확인!)
import { inputFieldContainerStyles } from "./inputFieldContainer.styles";

interface AboutMeInputStepProps {
  currentAboutMe: string;
  onAboutMeChange: (text: string) => void;
}

const AboutMeInputStep: React.FC<AboutMeInputStepProps> = ({
  currentAboutMe,
  onAboutMeChange,
}) => {
  const { colors } = useAppTheme(); // <--- [추가] 현재 테마의 색상 가져오기

  return (
    // safeArea에 동적 배경색 적용
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={inputFieldContainerStyles.container}>
          {/* title에 동적 텍스트 색상 적용 */}
          <Text style={[styles.title, { color: colors.onBackground }]}>
            About me
          </Text>

          <TextInput
            // textInput에 동적 스타일(텍스트 색상, 배경색, 테두리 색상, 그림자 색상) 적용
            style={[
              styles.textInput,
              {
                color: colors.onSurface,
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
              },
            ]}
            multiline
            placeholder="A brief introduction about yourself."
            placeholderTextColor={colors.darkGray}
            value={currentAboutMe}
            onChangeText={onAboutMeChange}
            maxLength={500}
            scrollEnabled={true}
            textAlignVertical="top"
            selectionColor={colors.primary} // <--- [추가] 커서/선택 색상
          />
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
  },
  textInput: {
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif", // 기존 값 유지
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
  // charCounter: { // 주석 처리된 부분도 필요시 테마 적용 가능
  //   textAlign: 'right',
  //   marginTop: 5,
  //   fontSize: 12,
  //   // color: '#666666', // 제거됨 (동적 적용)
  // },
});

export default AboutMeInputStep;
