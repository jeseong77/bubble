import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] 테마 훅 임포트 (경로 확인!)

interface HeightInputStepProps {
  onHeightChange: (heightInCm: number) => void;
  initialHeightCm?: number;
}

const CM_MIN = 120;
const CM_MAX = 220;
const DEFAULT_HEIGHT_CM = 170;

// generateFtItems, generateCmItems, ftPickerItems, cmPickerItems는 이전과 동일하게 유지
// (색상과 직접적인 관련이 없으므로 코드는 생략, 실제 파일에는 있어야 합니다)
const generateFtItems = () => {
  const items = [];
  const minFeet = 3;
  const maxFeet = 7;

  for (let ft = minFeet; ft <= maxFeet; ft++) {
    for (let inches = 0; inches <= 11; inches++) {
      const totalInches = ft * 12 + inches;
      const cmEquivalent = Math.round(totalInches * 2.54);
      if (cmEquivalent >= CM_MIN && cmEquivalent <= CM_MAX) {
        items.push({
          label: `${ft}' ${inches}"`,
          value: cmEquivalent,
        });
      }
    }
  }
  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.value, item])).values()
  );
  uniqueItems.sort((a, b) => a.value - b.value);
  return uniqueItems;
};

const generateCmItems = () => {
  const items = [];
  for (let cm = CM_MIN; cm <= CM_MAX; cm++) {
    items.push({ label: `${cm} cm`, value: cm });
  }
  return items;
};

const ftPickerItems = generateFtItems();
const cmPickerItems = generateCmItems();

const HeightInputStep: React.FC<HeightInputStepProps> = ({
  onHeightChange,
  initialHeightCm,
}) => {
  const { colors } = useAppTheme(); // <--- [추가] 현재 테마의 색상 가져오기

  const [unit, setUnit] = useState<"FT" | "CM">("FT");

  const getInitialSnappedHeight = useCallback(() => {
    // ... (이전 로직과 동일)
    const targetHeight = initialHeightCm ?? DEFAULT_HEIGHT_CM;
    const items = unit === "FT" ? ftPickerItems : cmPickerItems;
    if (!items.length) return targetHeight;
    let closestItem = items[0];
    for (const item of items) {
      if (
        Math.abs(item.value - targetHeight) <
        Math.abs(closestItem.value - targetHeight)
      ) {
        closestItem = item;
      }
    }
    if (items.some((item) => item.value === targetHeight)) {
      return targetHeight;
    }
    return closestItem.value;
  }, [initialHeightCm, unit]);

  const [internalHeightCm, setInternalHeightCm] = useState<number>(
    getInitialSnappedHeight()
  );

  useEffect(() => {
    setInternalHeightCm(getInitialSnappedHeight());
  }, [initialHeightCm, getInitialSnappedHeight]);

  useEffect(() => {
    onHeightChange(internalHeightCm);
  }, [internalHeightCm, onHeightChange]);

  const handleUnitChange = (newUnit: "FT" | "CM") => {
    // ... (이전 로직과 동일)
    if (unit === newUnit) return;
    setUnit(newUnit);
    const newItems = newUnit === "FT" ? ftPickerItems : cmPickerItems;
    if (!newItems.length) return;
    let closestItem = newItems[0];
    for (const item of newItems) {
      if (
        Math.abs(item.value - internalHeightCm) <
        Math.abs(closestItem.value - internalHeightCm)
      ) {
        closestItem = item;
      }
    }
    if (
      !newItems.some((item) => item.value === internalHeightCm) ||
      newItems.find((item) => item.value === internalHeightCm)?.value !==
        internalHeightCm
    ) {
      if (closestItem.value !== internalHeightCm) {
        setInternalHeightCm(closestItem.value);
      }
    }
  };

  const pickerItems = useMemo(() => {
    return unit === "FT" ? ftPickerItems : cmPickerItems;
  }, [unit]);

  return (
    // container에 동적 배경색 적용
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <View style={styles.questionTextBox}>
        {/* questionText에 동적 텍스트 색상 적용 */}
        <Text style={[styles.questionText, { color: colors.black }]}>
          How tall are you?
        </Text>
      </View>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={internalHeightCm}
          onValueChange={(itemValue) => {
            if (itemValue !== null) {
              setInternalHeightCm(Number(itemValue));
            }
          }}
          style={styles.picker}
          // pickerItem 스타일에 동적 텍스트 색상 적용 (itemStyle은 iOS 전용)
          itemStyle={[
            styles.pickerItem,
            Platform.OS === "ios" ? { color: colors.black } : {},
          ]}
          // Android의 경우 Picker 내부 아이템 색상은 dropdownIconColor나 부모 Text의 color를 따를 수 있으며,
          // 완벽한 제어가 어려울 수 있습니다. 필요시 커스텀 Picker 구현 고려.
          // Android에서 Picker 아이템 색상을 명시적으로 지정하려면, Picker.Item의 color prop을 사용해야 할 수 있습니다.
          // (단, @react-native-picker/picker의 Picker.Item은 style prop만 받음)
        >
          {pickerItems.map((item) => (
            <Picker.Item
              key={item.value}
              label={item.label}
              value={item.value}
              // Android에서 각 아이템의 색상을 지정하려면 여기에 color prop을 시도해볼 수 있으나,
              // @react-native-picker/picker의 Item은 style prop을 주로 사용합니다.
              // style={Platform.OS === 'android' ? { color: colors.onSurface } : undefined} // 이 방식은 잘 안될 수 있음
            />
          ))}
        </Picker>
      </View>

      {/* unitSelectorContainer에 동적 배경색 적용 */}
      <View
        style={[
          styles.unitSelectorContainer,
          { backgroundColor: colors.white },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.unitButton,
            unit === "FT" && [
              styles.unitButtonSelected,
              { backgroundColor: colors.lightGray, shadowColor: colors.white },
            ],
          ]}
          onPress={() => handleUnitChange("FT")}
        >
          <Text
            style={[
              styles.unitButtonText,
              // unitButtonText (비활성 시) 동적 색상 적용
              { color: colors.mediumGray },
              // unitButtonTextSelected (활성 시) 동적 색상 적용
              unit === "FT" && [
                styles.unitButtonTextSelected,
                { color: colors.primary },
              ],
            ]}
          >
            FT
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.unitButton,
            unit === "CM" && [
              styles.unitButtonSelected,
              { backgroundColor: colors.lightGray, shadowColor: colors.white },
            ],
          ]}
          onPress={() => handleUnitChange("CM")}
        >
          <Text
            style={[
              styles.unitButtonText,
              // unitButtonText (비활성 시) 동적 색상 적용
              { color: colors.mediumGray },
              // unitButtonTextSelected (활성 시) 동적 색상 적용
              unit === "CM" && [
                styles.unitButtonTextSelected,
                { color: colors.primary },
              ],
            ]}
          >
            CM
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// StyleSheet.create는 정적인 스타일만 포함
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#f0f0f0", // 제거됨 (동적 적용)
    alignItems: "center",
    paddingHorizontal: 16, // 기존 값 유지
  },
  questionTextBox: {
    marginTop: 60, // 기존 값 유지
    marginBottom: 40, // 기존 값 유지
    alignSelf: "stretch",
    // marginLeft은 제거되거나 0으로 설정됨 (부모의 alignItems: 'center' 및 alignSelf: 'stretch'와 연관)
  },
  questionText: {
    fontFamily: "Literata", // 폰트 로드 확인
    fontSize: 32,
    // color: "#000000", // 제거됨 (동적 적용)
    textAlign: "center", // 기존 값 유지
  },
  pickerContainer: {
    height: 200,
    width: "100%",
    justifyContent: "center",
    marginBottom: 30, // 기존 값 유지
  },
  picker: {
    width: "100%",
    height: Platform.OS === "ios" ? 200 : 50, // Android는 드롭다운 스타일이므로 높이가 다름
  },
  pickerItem: {
    // iOS 전용 스타일
    fontSize: Platform.OS === "ios" ? 24 : 18, // Android는 이 스타일이 직접 적용 안 될 수 있음
    textAlign: "center",
    fontFamily: "Literata", // 폰트 로드 확인
    // color: "#000000", // 제거됨 (동적 적용)
    height: Platform.OS === "ios" ? 150 : undefined,
  },
  unitSelectorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "#f0f0f0", // 제거됨 (동적 적용)
    borderRadius: 8,
    padding: 4, // 기존 값 유지
    marginBottom: 20, // 기존 값 유지
  },
  unitButton: {
    paddingVertical: 8, // 기존 값 유지
    paddingHorizontal: 25, // 기존 값 유지
    borderRadius: 6, // 기존 값 유지
    marginHorizontal: 4, // 기존 값 유지
  },
  unitButtonSelected: {
    // 선택된 버튼의 배경색 외 스타일
    // backgroundColor: "#ffffff", // 제거됨 (동적 적용)
    // shadowColor: "#000", // 제거됨 (동적 적용)
    // 나머지 그림자 속성은 유지 (색상만 동적으로)
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  unitButtonText: {
    fontFamily: "Literata", // 폰트 로드 확인
    fontSize: 16,
    // color: "#555555", // 제거됨 (동적 적용)
  },
  unitButtonTextSelected: {
    // 선택된 버튼 텍스트의 색상 외 스타일
    // color: "#000000", // 제거됨 (동적 적용)
    fontWeight: "bold",
  },
});

export default HeightInputStep;
