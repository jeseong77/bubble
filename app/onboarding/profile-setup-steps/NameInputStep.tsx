// app/onboarding/profile-setup-steps/NameInputStep.tsx

import React, { JSX } from "react";
import { View, TextInput, StyleSheet, Text } from "react-native";

// Props 인터페이스 수정
interface NameInputStepProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void; // firstName 업데이트 함수
  onLastNameChange: (value: string) => void; // lastName 업데이트 함수
}

const NameInputStep = ({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: NameInputStepProps): JSX.Element => {
  return (
    <View style={styles.container}>
      <View style={styles.questionTextBox}>
        <Text style={styles.questionText}>What's your name?</Text>
      </View>
      {/* First Name 입력 필드 */}
      <TextInput
        style={styles.input}
        placeholder="First name (required)"
        value={firstName}
        onChangeText={onFirstNameChange} // firstName 변경 핸들러 연결
        autoCapitalize="words"
        autoCorrect={false}
      />
      {/* Last Name 입력 필드 */}
      <TextInput
        style={[styles.input, { marginTop: 55 }]} // 약간의 간격 추가 (예시)
        placeholder="Last name"
        value={lastName}
        onChangeText={onLastNameChange} // lastName 변경 핸들러 연결
        autoCapitalize="words"
        autoCorrect={false}
      />
      <Text style={styles.tipText}>
        Last name is only shared with matches. Why?
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  questionTextBox: { marginTop: 171, marginBottom: 68 },
  questionText: {
    fontFamily: "Literata",
    fontSize: 32,
  },
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: "#A0A0A0",
    padding: 10,
    fontSize: 18,
    fontFamily: "LeagueSpartan-Regular",
  },
  tipText: {
    fontFamily: "LeagueSpartan-Regular",
    fontSize: 12,
    paddingTop: 10,
    color: "#7A7A7A",
  },
});

export default NameInputStep;
