import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native"; // Text는 현재 사용되지 않지만, 향후 확장 대비
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] 테마 훅 임포트 (경로 확인!)

export interface VerificationCodeInputProps {
  verificationCodeInput: string;
  setVerificationCodeInput: (text: string) => void;
}

const VerificationCodeInputPhase: React.FC<VerificationCodeInputProps> = ({
  verificationCodeInput,
  setVerificationCodeInput,
}) => {
  const { colors } = useAppTheme(); // <--- [추가] 현재 테마의 색상 가져오기

  return (
    <View style={styles.inputSectionContainer}>
      <TextInput
        // codeInput에 동적 스타일(테두리 하단 색상, 텍스트 색상) 적용
        style={[
          styles.codeInput,
          { borderBottomColor: colors.outline, color: colors.onSurface },
        ]}
        placeholder="Enter 5-digit code"
        // placeholderTextColor에 동적 색상 적용
        placeholderTextColor={colors.onSurfaceVariant}
        keyboardType="number-pad"
        value={verificationCodeInput}
        onChangeText={setVerificationCodeInput}
        maxLength={5} // 인증 코드 길이에 맞게 조절
      />
    </View>
  );
};

// StyleSheet.create는 정적 스타일만 포함
const styles = StyleSheet.create({
  inputSectionContainer: {
    width: "100%",
    marginBottom: 46, // 부모 컴포넌트와의 간격
  },
  codeInput: {
    width: "100%",
    height: 50, // 입력 필드 높이
    borderBottomWidth: 1,
    // borderBottomColor: "#A9A9A9", // 제거됨 (동적 적용)
    fontSize: 24,
    textAlign: "center", // 코드가 중앙에 오도록
    fontFamily: "LeagueSpartan-Regular", // 폰트 로드 확인 필요
    // color: "#000000", // 제거됨 (동적 적용)
  },
});

export default VerificationCodeInputPhase;
