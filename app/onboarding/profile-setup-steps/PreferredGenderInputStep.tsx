import React, { JSX } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import * as Haptics from "expo-haptics";
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
    { label: "Man", value: "man" },
    { label: "Woman", value: "woman" },
    { label: "Nonbinary", value: "nonbinary" },
    { label: "Everyone", value: "everyone" },
  ];

  return (
    <View
      style={[
        inputFieldContainerStyles.container,
        { backgroundColor: colors.white },
      ]}
    >
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.black }]}>
          Who would you{"\n"}like to meet?
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {genderOptions.map((option) => {
          const isSelected = preferredGender === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={styles.optionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPreferredGenderChange(option.value);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isSelected ? colors.black : colors.darkGray },
                  isSelected && styles.selectedOptionText,
                ]}
              >
                {option.label}
              </Text>
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isSelected
                      ? colors.primary
                      : colors.mediumGray,
                    backgroundColor: isSelected
                      ? colors.primary
                      : "transparent",
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
    lineHeight: 40,
    textAlign: "center",
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
  },
  optionText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 22,
  },
  selectedOptionText: {
    fontFamily: "Quicksand-Bold",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
});

export default PreferredGenderInputStep;