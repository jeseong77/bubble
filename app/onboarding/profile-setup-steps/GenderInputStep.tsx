import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] 테마 훅 임포트 (경로 확인!)

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
  const { colors } = useAppTheme(); // <--- [추가] 현재 테마의 색상 가져오기

  const handleGenderSelect = (gender: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenderChange(gender);
  };

  const toggleVisibility = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onVisibilityChange(!currentVisibility);
  };

  return (
    // safeArea에 동적 배경색 적용
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        {/* title에 동적 텍스트 색상 적용 */}
        <Text style={[styles.title, { color: colors.onBackground }]}>
          Which gender best describes you?
        </Text>

        <View style={styles.optionsContainer}>
          {GENDERS.map((gender) => {
            const isSelected = currentGender === gender;
            return (
              <TouchableOpacity
                key={gender}
                // optionButton에 동적 테두리 하단 색상 적용
                style={[
                  styles.optionButton,
                  { borderBottomColor: colors.outlineVariant },
                ]}
                onPress={() => handleGenderSelect(gender)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    // optionText (비활성 시) 동적 색상 적용
                    { color: colors.onSurface },
                    // selectedOptionText (활성 시) 동적 색상 적용
                    isSelected && [
                      styles.selectedOptionText,
                      { color: colors.primary },
                    ],
                  ]}
                >
                  {gender}
                </Text>
                <View
                  style={[
                    styles.radioOuter,
                    // radioOuter (비활성 시) 동적 테두리 색상 적용
                    { borderColor: colors.outline },
                    // selectedRadioOuter (활성 시) 동적 테두리 색상 적용
                    isSelected && [
                      styles.selectedRadioOuter,
                      { borderColor: colors.primary },
                    ],
                  ]}
                >
                  {/* radioInner (활성 시) 동적 배경색 적용 */}
                  {isSelected && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  )}
                </View>
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
              // checkbox (비활성 시) 동적 테두리 색상 적용
              { borderColor: colors.outline },
              // selectedCheckboxBorder (활성 시) 동적 테두리 색상 적용
              currentVisibility && [
                styles.selectedCheckboxBorder,
                { borderColor: colors.primary },
              ],
            ]}
          >
            {/* checkboxInner (활성 시) 동적 배경색 적용 */}
            {currentVisibility && (
              <View
                style={[
                  styles.checkboxInner,
                  { backgroundColor: colors.primary },
                ]}
              />
            )}
          </View>
          {/* visibilityText에 동적 텍스트 색상 적용 */}
          <Text style={[styles.visibilityText, { color: colors.onBackground }]}>
            Visible on profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// StyleSheet.create는 정적인 스타일만 포함 (레이아웃, 폰트 등)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: "#f0f0f0", // 제거됨 (동적 적용)
  },
  container: {
    flex: 1,
    paddingHorizontal: 30, // 기존 값 유지
    paddingTop: Platform.OS === "android" ? 40 : 60, // 기존 값 유지
    paddingBottom: 20, // 기존 값 유지
  },
  title: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32, // 기존 값 유지
    // color: "#000000", // 제거됨 (동적 적용)
    fontWeight: "bold", // 기존 값 유지
    marginBottom: 40, // 기존 값 유지
    lineHeight: 40, // 기존 값 유지
  },
  optionsContainer: {
    marginBottom: 30, // 기존 값 유지
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18, // 기존 값 유지
    borderBottomWidth: 1, // 기존 값 유지
    // borderBottomColor: "#e9ecef", // 제거됨 (동적 적용)
  },
  optionText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 20, // 기존 값 유지
    // color: "#495057", // 제거됨 (동적 적용)
  },
  selectedOptionText: {
    // 선택 시 fontWeight만 여기서 관리, color는 동적으로
    fontWeight: "bold", // 기존 값 유지
    // color: "#000000", // 제거됨 (동적 적용)
  },
  radioOuter: {
    width: 24, // 기존 값 유지
    height: 24, // 기존 값 유지
    borderRadius: 12, // 기존 값 유지
    borderWidth: 2, // 기존 값 유지
    // borderColor: "#B0B0B0", // 제거됨 (동적 적용)
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRadioOuter: {
    // 선택 시 borderColor만 동적으로 적용되므로, 이 스타일은 비워두거나 다른 정적 스타일 추가 가능
    // borderColor: "#000000", // 제거됨 (동적 적용)
  },
  radioInner: {
    width: 12, // 기존 값 유지
    height: 12, // 기존 값 유지
    borderRadius: 6, // 기존 값 유지
    // backgroundColor: "#000000", // 제거됨 (동적 적용)
  },
  visibilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20, // 기존 값 유지
    marginBottom: 20, // 기존 값 유지
    alignSelf: "flex-start", // 기존 값 유지
  },
  checkbox: {
    width: 22, // 기존 값 유지
    height: 22, // 기존 값 유지
    borderWidth: 1.5, // 기존 값 유지
    // borderColor: "#B0B0B0", // 제거됨 (동적 적용)
    borderRadius: 4, // 기존 값 유지
    marginRight: 12, // 기존 값 유지
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheckboxBorder: {
    // 선택 시 borderColor만 동적으로 적용되므로, 이 스타일은 비워두거나 다른 정적 스타일 추가 가능
    // borderColor: "#000000", // 제거됨 (동적 적용)
  },
  checkboxInner: {
    width: 12, // 기존 값 유지
    height: 12, // 기존 값 유지
    // backgroundColor: "#000000", // 제거됨 (동적 적용)
  },
  visibilityText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 16,
  },
});

export default GenderInputStep;
