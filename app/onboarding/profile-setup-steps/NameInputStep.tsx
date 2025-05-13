import React, { JSX } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableWithoutFeedback, // <--- [추가] 키보드 외 영역 터치 감지용
  Keyboard, // <--- [추가] 키보드 제어용
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

// Props 인터페이스 (기존과 동일)
interface NameInputStepProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}

const NameInputStep = ({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: NameInputStepProps): JSX.Element => {
  const { colors } = useAppTheme();

  return (
    // TouchableWithoutFeedback으로 전체 화면 영역을 감싸 키보드 외 터치 시 키보드 숨김
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.questionTextBox}>
          <Text style={[styles.questionText, { color: colors.onBackground }]}>
            What's your name?
          </Text>
        </View>
        {/* First Name 입력 필드 */}
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.outline, color: colors.onSurface },
          ]}
          placeholder="First name (required)"
          placeholderTextColor={colors.onSurfaceVariant}
          value={firstName}
          onChangeText={onFirstNameChange}
          autoCapitalize="words"
          autoCorrect={false}
          selectionColor={colors.primary}
          returnKeyType="next" // 다음 입력 필드로 이동 또는 완료 (선택적)
          // onSubmitEditing={() => { /* lastNameInputRef.current.focus() 와 같이 다음 필드로 포커스 이동 로직 추가 가능 */ }}
          blurOnSubmit={false} // returnKeyType="next" 사용 시 현재 필드에서 blur되지 않도록
        />
        {/* Last Name 입력 필드 */}
        <TextInput
          // ref={lastNameInputRef} // 위에서 다음 필드 포커스 이동 시 필요
          style={[
            styles.input,
            {
              marginTop: 55, // 기존 마진 유지
              borderColor: colors.outline,
              color: colors.onSurface,
            },
          ]}
          placeholder="Last name"
          placeholderTextColor={colors.onSurfaceVariant}
          value={lastName}
          onChangeText={onLastNameChange}
          autoCapitalize="words"
          autoCorrect={false}
          selectionColor={colors.primary}
          returnKeyType="done" // 입력 완료
          onSubmitEditing={Keyboard.dismiss} // 완료 버튼 시 키보드 숨김 (선택적)
        />
        <Text style={[styles.tipText, { color: colors.onSurfaceVariant }]}>
          Last name is only shared with matches. Why?
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

// StyleSheet.create는 정적인 스타일만 포함 (기존과 동일)
const styles = StyleSheet.create({
  questionTextBox: {
    marginTop: 171,
    marginBottom: 68,
  },
  questionText: {
    fontFamily: "Literata",
    fontSize: 32,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  input: {
    borderBottomWidth: 1,
    padding: 10,
    fontSize: 18,
    fontFamily: "LeagueSpartan-Regular",
  },
  tipText: {
    fontFamily: "LeagueSpartan-Regular",
    fontSize: 12,
    paddingTop: 10,
  },
});

export default NameInputStep;
