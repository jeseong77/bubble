import React, { useState, useEffect, useRef, JSX } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Keyboard, // Keyboard import
  TouchableWithoutFeedback, // TouchableWithoutFeedback import
} from "react-native";

interface AgeInputStepProps {
  day: string;
  month: string;
  year: string;
  onDayChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
}

const AgeInputStep = ({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
}: AgeInputStepProps): JSX.Element => {
  const monthInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);

  const handleDayChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    onDayChange(numericText);
    if (numericText.length === 2) {
      monthInputRef.current?.focus();
    }
  };

  const handleMonthChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    onMonthChange(numericText);
    if (numericText.length === 2) {
      yearInputRef.current?.focus();
    }
  };

  const handleYearChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    onYearChange(numericText);
    if (numericText.length === 4) {
      Keyboard.dismiss(); // 마지막 입력 완료 시 키보드 내리기 (선택 사항)
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.questionTextBox}>
          <Text style={styles.questionText}>How old are you?</Text>
        </View>

        <View style={styles.inputBox}>
          <TextInput
            style={styles.inputText}
            placeholder="DD"
            placeholderTextColor="#7A7A7A"
            keyboardType="numeric"
            value={day}
            onChangeText={handleDayChange}
            maxLength={2}
            onSubmitEditing={() => monthInputRef.current?.focus()}
            blurOnSubmit={false}
            returnKeyType="next"
          />
          <TextInput
            ref={monthInputRef}
            style={styles.inputText}
            placeholder="MM"
            placeholderTextColor="#7A7A7A"
            keyboardType="numeric"
            value={month}
            onChangeText={handleMonthChange}
            maxLength={2}
            onSubmitEditing={() => yearInputRef.current?.focus()}
            blurOnSubmit={false}
            returnKeyType="next"
          />
          <TextInput
            ref={yearInputRef}
            style={[styles.inputText, styles.yearInput]} // 년도 입력칸은 너비가 다를 수 있음
            placeholder="YYYY"
            placeholderTextColor="#7A7A7A"
            keyboardType="numeric"
            value={year}
            onChangeText={handleYearChange}
            maxLength={4}
            returnKeyType="done" // 마지막 입력이므로 '완료' 표시
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // 부모에게서 flex: 1을 받으므로 유지하거나 필요에 맞게 조절
    backgroundColor: "#f0f0f0",
  },
  questionTextBox: {
    marginTop: 171,
    marginBottom: 68,
    marginLeft: 16,
  },
  questionText: {
    fontFamily: "Literata",
    fontSize: 32,
  },
  inputBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#A0A0A0", // 밑줄 색상 변경
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  inputText: {
    fontSize: 32,
    fontFamily: "Literata",
    color: "#000000",
    textAlign: "center",
    width: 60, // DD, MM 너비 (예시)
    marginHorizontal: 10, // 입력 필드 간 간격
  },
  yearInput: {
    width: 90, // YYYY 너비 (예시)
  },
});

export default AgeInputStep;
