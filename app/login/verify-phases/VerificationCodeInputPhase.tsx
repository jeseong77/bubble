import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export interface VerificationCodeInputProps {
  verificationCodeInput: string; // 예시 prop
  setVerificationCodeInput: (text: string) => void; // 예시 prop
}

const VerificationCodeInputPhase: React.FC<VerificationCodeInputProps> = ({
  verificationCodeInput, // 예시 prop 사용
  setVerificationCodeInput, // 예시 prop 사용
}) => {
  return (
    <View style={styles.inputSectionContainer}>
      {/* 실제 인증 코드 입력 UI 구현 필요 */}
      {/* 예시: 기본 TextInput */}
      <TextInput
        style={styles.codeInput}
        placeholder="Enter 5-digit code"
        placeholderTextColor="#7A7A7A"
        keyboardType="number-pad"
        value={verificationCodeInput}
        onChangeText={setVerificationCodeInput}
        maxLength={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputSectionContainer: {
    width: "100%",
    marginBottom: 46,
  },
  codeInput: {
    // 인증 코드 TextInput 스타일 예시
    width: "100%",
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#A9A9A9", // 약간 다른 밑줄 색 예시
    fontSize: 24,
    textAlign: "center",
    fontFamily: "LeagueSpartan-Regular",
    color: "#000000",
  },
});

export default VerificationCodeInputPhase;
