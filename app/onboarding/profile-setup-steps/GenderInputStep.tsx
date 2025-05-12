// GenderInputStep.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics"; // 1. expo-haptics 임포트

interface GenderInputStepProps {
  currentGender: string | null;
  currentVisibility: boolean;
  onGenderChange: (gender: string) => void;
  onVisibilityChange: (isVisible: boolean) => void;
}

const GENDERS = ["Man", "Woman", "Nonbinary", "Other"];

const GenderInputStep: React.FC<GenderInputStepProps> = ({
  currentGender,
  currentVisibility,
  onGenderChange,
  onVisibilityChange,
}) => {
  const handleGenderSelect = (gender: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // 2. 햅틱 피드백 추가
    onGenderChange(gender);
  };

  const toggleVisibility = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // 2. 햅틱 피드백 추가
    onVisibilityChange(!currentVisibility);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Which gender best describes you?</Text>

        <View style={styles.optionsContainer}>
          {GENDERS.map((gender) => {
            const isSelected = currentGender === gender;
            return (
              <TouchableOpacity
                key={gender}
                style={styles.optionButton}
                onPress={() => handleGenderSelect(gender)} // onPress에서 handleGenderSelect 호출
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.selectedOptionText,
                  ]}
                >
                  {gender}
                </Text>
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.selectedRadioOuter,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.visibilityToggle}
          onPress={toggleVisibility} // onPress에서 toggleVisibility 호출
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              currentVisibility && styles.selectedCheckboxBorder,
            ]}
          >
            {currentVisibility && <View style={styles.checkboxInner} />}
          </View>
          <Text style={styles.visibilityText}>Visible on profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f0f0", // 이미 요청하신 대로 설정되어 있습니다.
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingBottom: 20,
  },
  title: {
    fontFamily: "Literata",
    fontSize: 32,
    color: "#000000",
    fontWeight: "bold",
    marginBottom: 40,
    lineHeight: 40,
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  optionText: {
    fontFamily: "Literata",
    fontSize: 20,
    color: "#495057",
  },
  selectedOptionText: {
    fontWeight: "bold",
    color: "#000000",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#B0B0B0",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRadioOuter: {
    borderColor: "#000000",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#000000",
  },
  visibilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: "#B0B0B0",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheckboxBorder: {
    borderColor: "#000000",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: "#000000",
  },
  visibilityText: {
    fontFamily: "Literata",
    fontSize: 16,
    color: "#333333",
  },
});

export default GenderInputStep;
