import React, { JSX } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";

interface PreferredGenderInputStepProps {
  preferredGender: string;
  onPreferredGenderChange: (value: string) => void;
}

const PreferredGenderInputStep = ({
  preferredGender,
  onPreferredGenderChange,
}: PreferredGenderInputStepProps): JSX.Element => {
  const { colors } = useAppTheme();

  const genderOptions = [
    { label: "Man", value: "male" },
    { label: "Woman", value: "female" },
    { label: "Nonbinary", value: "nonbinary" },
    { label: "Everyone", value: "any" },
  ];

  return (
    <View
      style={[
        inputFieldContainerStyles.container,
        { backgroundColor: colors.white },
      ]}
    >
      <View style={styles.questionTextBox}>
        <Text style={[styles.questionText, { color: colors.black }]}>
          Who would you like to meet ?
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {genderOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.optionRow}
            onPress={() => onPreferredGenderChange(option.value)}
          >
            <Text style={[styles.optionText, { color: colors.darkGray }]}>
              {option.label}
            </Text>
            <View
              style={[
                styles.radioButton,
                {
                  backgroundColor:
                    preferredGender === option.value
                      ? colors.primary
                      : colors.lightGray,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
  optionsContainer: {
    flex: 1,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  optionText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 18,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});

export default PreferredGenderInputStep;