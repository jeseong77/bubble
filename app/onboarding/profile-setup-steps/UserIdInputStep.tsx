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

interface UserIdInputStepProps {
  username: string;
  onUsernameChange: (value: string) => void;
}

const UserIdInputStep = ({
  username,
  onUsernameChange,
}: UserIdInputStepProps): JSX.Element => {
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
            Set Your User ID
          </Text>
        </View>

        <View style={styles.descriptionBox}>
          <Text style={[styles.descriptionText, { color: colors.darkGray }]}>
            This will help others find and connect with you easily.
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
          placeholder="Enter your user ID"
          placeholderTextColor={colors.darkGray}
          value={username}
          onChangeText={onUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={colors.primary}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  questionTextBox: {
    marginBottom: 16,
    alignItems: "center",
  },
  questionText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
    textAlign: "center",
  },
  descriptionBox: {
    marginBottom: 40,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  descriptionText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
  },
});

export default UserIdInputStep;