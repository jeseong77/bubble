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
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";

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
      <View
        style={[
          inputFieldContainerStyles.container,
          { backgroundColor: colors.white },
        ]}
      >
        <View style={styles.questionTextBox}>
          <Text style={[styles.questionText, { color: colors.black }]}>
            What's your name?
          </Text>
        </View>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.lightGray,
              color: colors.bubbleFont,
            },
          ]}
          placeholder="First Name"
          placeholderTextColor={colors.darkGray}
          value={firstName}
          onChangeText={onFirstNameChange}
          autoCapitalize="words"
          autoCorrect={false}
          selectionColor={colors.primary}
          returnKeyType="next"
          blurOnSubmit={false}
        />

        <TextInput
          style={[
            styles.input,
            {
              marginTop: 16,
              backgroundColor: colors.lightGray,
              color: colors.bubbleFont,
            },
          ]}
          placeholder="Last Name"
          placeholderTextColor={colors.darkGray}
          value={lastName}
          onChangeText={onLastNameChange}
          autoCapitalize="words"
          autoCorrect={false}
          selectionColor={colors.primary}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <Text style={[styles.tipText, { color: colors.darkGray }]}>
          Last name is only shared with matches.{" "}
          <Text style={{ color: colors.primary }}>Why?</Text>
        </Text>
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
    fontSize: 32,
    textAlign: "center",
  },
  input: {
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
  },
  tipText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 14,
    paddingTop: 12,
    textAlign: "center",
  },
});

export default NameInputStep;