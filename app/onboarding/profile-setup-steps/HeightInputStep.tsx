import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";

interface HeightInputStepProps {
  onHeightChange: (heightInCm: number) => void;
  initialHeightCm?: number;
}

const CM_MIN = 120;
const CM_MAX = 220;
const DEFAULT_HEIGHT_CM = 170;

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
  const { colors } = useAppTheme();

  const [unit, setUnit] = useState<"FT" | "CM">("FT");

  const getInitialSnappedHeight = useCallback(() => {
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
    <View
      style={[
        inputFieldContainerStyles.container,
        styles.container,
        { backgroundColor: colors.white },
      ]}
    >
      <View style={styles.questionTextBox}>
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
          itemStyle={[
            styles.pickerItem,
            Platform.OS === "ios" ? { color: colors.black } : {},
          ]}
        >
          {pickerItems.map((item) => (
            <Picker.Item
              key={item.value}
              label={item.label}
              value={item.value}
            />
          ))}
        </Picker>
      </View>

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
              { color: colors.mediumGray },
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
              { color: colors.mediumGray },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  questionTextBox: {
    marginTop: 60,
    marginBottom: 40,
    alignSelf: "stretch",
  },
  questionText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
    textAlign: "center",
  },
  pickerContainer: {
    height: 200,
    width: "100%",
    justifyContent: "center",
    marginBottom: 30,
  },
  picker: {
    width: "100%",
    height: Platform.OS === "ios" ? 200 : 50,
  },
  pickerItem: {
    fontFamily: "Quicksand-Regular",
    fontSize: Platform.OS === "ios" ? 24 : 18,
    textAlign: "center",
    height: Platform.OS === "ios" ? 150 : undefined,
  },
  unitSelectorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 25,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  unitButtonSelected: {
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  unitButtonText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 16,
  },
  unitButtonTextSelected: {
    fontWeight: "bold",
  },
});

export default HeightInputStep;
