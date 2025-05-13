import React, { useRef, JSX } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] 테마 훅 임포트 (경로 확인!)

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
  const { colors } = useAppTheme(); // <--- [추가] 현재 테마의 색상 가져오기

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
      Keyboard.dismiss();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {/* container에 동적 배경색 적용 */}
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.questionTextBox}>
          {/* questionText에 동적 텍스트 색상 적용 */}
          <Text style={[styles.questionText, { color: colors.onBackground }]}>
            How old are you?
          </Text>
        </View>

        {/* inputBox에 동적 테두리 하단 색상 적용 */}
        <View style={[styles.inputBox, { borderBottomColor: colors.outline }]}>
          <TextInput
            // inputText에 동적 텍스트 색상 적용
            style={[styles.inputText, { color: colors.onSurface }]}
            placeholder="DD"
            placeholderTextColor={colors.onSurfaceVariant} // 동적 플레이스홀더 색상
            keyboardType="numeric"
            value={day}
            onChangeText={handleDayChange}
            maxLength={2}
            onSubmitEditing={() => monthInputRef.current?.focus()}
            blurOnSubmit={false}
            returnKeyType="next"
            selectionColor={colors.primary} // 동적 커서/선택 색상
          />
          <TextInput
            ref={monthInputRef}
            // inputText에 동적 텍스트 색상 적용
            style={[styles.inputText, { color: colors.onSurface }]}
            placeholder="MM"
            placeholderTextColor={colors.onSurfaceVariant} // 동적 플레이스홀더 색상
            keyboardType="numeric"
            value={month}
            onChangeText={handleMonthChange}
            maxLength={2}
            onSubmitEditing={() => yearInputRef.current?.focus()}
            blurOnSubmit={false}
            returnKeyType="next"
            selectionColor={colors.primary} // 동적 커서/선택 색상
          />
          <TextInput
            ref={yearInputRef}
            // inputText 및 yearInput 스타일에 동적 텍스트 색상 적용
            style={[
              styles.inputText,
              styles.yearInput,
              { color: colors.onSurface },
            ]}
            placeholder="YYYY"
            placeholderTextColor={colors.onSurfaceVariant} // 동적 플레이스홀더 색상
            keyboardType="numeric"
            value={year}
            onChangeText={handleYearChange}
            maxLength={4}
            returnKeyType="done"
            selectionColor={colors.primary} // 동적 커서/선택 색상
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

// StyleSheet.create는 레이아웃 등 정적 스타일을 유지하고, 색상 관련 속성만 제거/수정
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#f0f0f0", // 제거됨 (동적 적용)
  },
  questionTextBox: {
    marginTop: 171,
    marginBottom: 68,
    marginLeft: 16, // 기존 값 유지
  },
  questionText: {
    fontFamily: "Literata", // 기존 값 유지
    fontSize: 32, // 기존 값 유지
    // color는 동적으로 적용 (기본값 사용 또는 명시적으로 설정)
  },
  inputBox: {
    flexDirection: "row",
    justifyContent: "space-between", // 기존 값 유지
    // borderBottomColor: "#A0A0A0", // 제거됨 (동적 적용)
    borderBottomWidth: 1, // 기존 값 유지
    marginHorizontal: 16, // 기존 값 유지
  },
  inputText: {
    fontSize: 32, // 기존 값 유지
    fontFamily: "Literata", // 기존 값 유지
    // color: "#000000",          // 제거됨 (동적 적용)
    textAlign: "center", // 기존 값 유지
    width: 60, // 기존 값 유지
    marginHorizontal: 10, // <--- 기존 값 "유지" (중요)
  },
  yearInput: {
    width: 90, // 기존 값 유지
  },
});

export default AgeInputStep;
