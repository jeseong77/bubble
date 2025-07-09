import React, { useRef, JSX } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "./inputFieldContainer.styles"; // 공통 컨테이너 스타일 import

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
  const { colors } = useAppTheme();

  const dayInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);

  const handleMonthChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    onMonthChange(numericText);
    if (numericText.length === 2) {
      dayInputRef.current?.focus();
    }
  };

  const handleDayChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    onDayChange(numericText);
    if (numericText.length === 2) {
      yearInputRef.current?.focus();
    }
  };

  const handleYearChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    onYearChange(numericText);
    if (numericText.length === 4) {
      Keyboard.dismiss();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={[
          inputFieldContainerStyles.container,
          { backgroundColor: colors.white },
        ]}
      >
        <View style={styles.questionTextBox}>
          <Text style={[styles.questionText, { color: colors.black }]}>
            How old are you?
          </Text>
        </View>

        <View style={styles.inputBox}>
          {/* Month Input */}
          <TextInput
            style={[
              styles.input,
              styles.monthAndDayInput,
              {
                backgroundColor: colors.lightGray,
                color: colors.bubbleFont,
              },
            ]}
            placeholder="MM"
            placeholderTextColor={colors.darkGray}
            keyboardType="numeric"
            value={month}
            onChangeText={handleMonthChange}
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={() => dayInputRef.current?.focus()}
            blurOnSubmit={false}
            selectionColor={colors.primary}
            textAlign="center"
          />

          {/* Day Input */}
          <TextInput
            ref={dayInputRef}
            style={[
              styles.input,
              styles.monthAndDayInput,
              {
                backgroundColor: colors.lightGray,
                color: colors.bubbleFont,
              },
            ]}
            placeholder="DD"
            placeholderTextColor={colors.darkGray}
            keyboardType="numeric"
            value={day}
            onChangeText={handleDayChange}
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={() => yearInputRef.current?.focus()}
            blurOnSubmit={false}
            selectionColor={colors.primary}
            textAlign="center"
          />

          {/* Year Input */}
          <TextInput
            ref={yearInputRef}
            style={[
              styles.input,
              styles.yearInput,
              {
                backgroundColor: colors.lightGray,
                color: colors.bubbleFont,
              },
            ]}
            placeholder="YYYY"
            placeholderTextColor={colors.darkGray}
            keyboardType="numeric"
            value={year}
            onChangeText={handleYearChange}
            maxLength={4}
            returnKeyType="done"
            selectionColor={colors.primary}
            textAlign="center"
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  questionTextBox: {
    marginBottom: 40,
    alignItems: "center",
  },
  questionText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32, // ✅ Locofy 코드 참고하여 28 -> 32로 수정
    textAlign: "center",
  },
  inputBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  input: {
    borderRadius: 12,
    height: 56,
    fontSize: 24, // ✅ Locofy 코드 참고하여 18 -> 24로 수정
    fontFamily: "Quicksand-Regular",
  },
  monthAndDayInput: {
    width: "28%",
  },
  yearInput: {
    width: "38%",
  },
});

export default AgeInputStep;