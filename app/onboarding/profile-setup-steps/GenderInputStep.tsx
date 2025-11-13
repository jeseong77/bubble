import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";

interface GenderInputStepProps {
  currentGender: string | null;
  onGenderChange: (gender: string) => void;
}

const GENDERS = ["man", "woman", "nonbinary", "everyone"];

// Display mapping for UI (show capitalized labels but store lowercase values)
const GENDER_DISPLAY: Record<string, string> = {
  "man": "Man",
  "woman": "Woman", 
  "nonbinary": "Nonbinary",
  "everyone": "Everyone"
};

const GenderInputStep: React.FC<GenderInputStepProps> = ({
  currentGender,
  onGenderChange,
}) => {
  const { colors } = useAppTheme();

  const handleGenderSelect = (gender: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenderChange(gender);
  };


  return (
    <View
      style={[
        inputFieldContainerStyles.container,
        { backgroundColor: colors.white },
      ]}
    >
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.black }]}>
          Which gender best describes you?
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {GENDERS.map((gender) => {
          const isSelected = currentGender === gender;
          return (
            <TouchableOpacity
              key={gender}
              style={[styles.optionButton]}
              onPress={() => handleGenderSelect(gender)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isSelected ? colors.black : colors.darkGray },
                  isSelected && styles.selectedOptionText,
                ]}
              >
                {GENDER_DISPLAY[gender]}
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

export default GenderInputStep;
