import React, { JSX } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";

interface LocationInputStepProps {
  location: string | null;
  onLocationChange: (value: string) => void;
  onSkip: () => void;
}

const LocationInputStep = ({
  location,
  onLocationChange,
  onSkip,
}: LocationInputStepProps): JSX.Element => {
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
            Current location?
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
          placeholder="What city do you live in?"
          placeholderTextColor={colors.darkGray}
          value={location || ""}
          onChangeText={onLocationChange}
          autoCapitalize="words"
          autoCorrect={false}
          selectionColor={colors.primary}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={[styles.skipButtonText, { color: colors.navy }]}>
            Not Now
          </Text>
        </TouchableOpacity>
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
    marginBottom: 20,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipButtonText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default LocationInputStep;