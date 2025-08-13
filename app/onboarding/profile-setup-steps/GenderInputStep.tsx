import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";

interface GenderInputStepProps {
  currentGender: string | null;
  currentVisibility: boolean;
  onGenderChange: (gender: string) => void;
  onVisibilityChange: (isVisible: boolean) => void;
}

const GENDERS = ["male", "female", "nonbinary", "other"];

// Display mapping for UI (show capitalized labels but store lowercase values)
const GENDER_DISPLAY: Record<string, string> = {
  "male": "Male",
  "female": "Female", 
  "nonbinary": "Nonbinary",
  "other": "Other"
};

const GenderInputStep: React.FC<GenderInputStepProps> = ({
  currentGender,
  currentVisibility,
  onGenderChange,
  onVisibilityChange,
}) => {
  const { colors } = useAppTheme();

  const handleGenderSelect = (gender: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenderChange(gender);
  };

  const toggleVisibility = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onVisibilityChange(!currentVisibility);
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

      <TouchableOpacity
        style={styles.visibilityToggle}
        onPress={toggleVisibility}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: colors.mediumGray,
              backgroundColor: currentVisibility
                ? colors.primary
                : "transparent",
            },
          ]}
        >
          {currentVisibility && (
            <Ionicons name="checkmark" size={16} color={colors.white} />
          )}
        </View>
        <Text style={[styles.visibilityText, { color: colors.darkGray }]}>
          Visible on profile
        </Text>
      </TouchableOpacity>
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
  visibilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    alignSelf: "flex-start",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  visibilityText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 14,
  },
});

export default GenderInputStep;
