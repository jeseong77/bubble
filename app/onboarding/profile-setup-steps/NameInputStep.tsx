import React, { JSX } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {/* [색상 변경] background -> white */}
      <View style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={styles.questionTextBox}>
          {/* [색상 변경] onBackground -> black */}
          <Text style={[styles.questionText, { color: colors.black }]}>
            What's your name?
          </Text>
        </View>

        <TextInput
          style={[
            styles.input,
            {
              // [색상 변경] outline -> mediumGray
              borderColor: colors.mediumGray,
              // [색상 변경] onSurface -> bubbleFont (입력된 텍스트 색상)
              color: colors.bubbleFont,
            },
          ]}
          placeholder="First name (required)"
          // [색상 변경] onSurfaceVariant -> darkGray
          placeholderTextColor={colors.darkGray}
          value={firstName}
          onChangeText={onFirstNameChange}
          autoCapitalize="words"
          autoCorrect={false}
          // [색상 변경] primary는 그대로 유지 (새 팔레트의 primary 사용)
          selectionColor={colors.primary}
          returnKeyType="next"
          blurOnSubmit={false}
        />

        <TextInput
          style={[
            styles.input,
            {
              marginTop: 55,
              // [색상 변경] outline -> mediumGray
              borderColor: colors.mediumGray,
              // [색상 변경] onSurface -> bubbleFont
              color: colors.bubbleFont,
            },
          ]}
          placeholder="Last name"
          // [색상 변경] onSurfaceVariant -> darkGray
          placeholderTextColor={colors.darkGray}
          value={lastName}
          onChangeText={onLastNameChange}
          autoCapitalize="words"
          autoCorrect={false}
          selectionColor={colors.primary}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        {/* [색상 변경] onSurfaceVariant -> darkGray */}
        <Text style={[styles.tipText, { color: colors.darkGray }]}>
          Last name is only shared with matches. Why?
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

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
