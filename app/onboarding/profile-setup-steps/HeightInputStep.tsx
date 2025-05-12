import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

interface HeightInputStepProps {
  onHeightChange: (heightInCm: number) => void;
  initialHeightCm?: number;
}

const CM_MIN = 120; // Approx 3'11"
const CM_MAX = 220; // Approx 7'2.5"
const DEFAULT_HEIGHT_CM = 170; // Approx 5'7"

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
  // Ensure unique values and sort by value for consistency
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
    // If targetHeight is exactly between two items, prefer the one closer to targetHeight or lower.
    // This logic can be refined if specific snapping behavior is needed for ties.
    if (items.some((item) => item.value === targetHeight)) {
      return targetHeight;
    }
    return closestItem.value;
  }, [initialHeightCm, unit]);

  const [internalHeightCm, setInternalHeightCm] = useState<number>(
    getInitialSnappedHeight()
  );

  useEffect(() => {
    // Snap initial height when component mounts or initialHeightCm changes
    setInternalHeightCm(getInitialSnappedHeight());
  }, [initialHeightCm, getInitialSnappedHeight]);

  useEffect(() => {
    onHeightChange(internalHeightCm);
  }, [internalHeightCm, onHeightChange]);

  const handleUnitChange = (newUnit: "FT" | "CM") => {
    if (unit === newUnit) return;

    setUnit(newUnit);
    // When unit changes, snap current internalHeightCm to the closest value in the new unit's scale
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
    // If internalHeightCm is already a valid value in newItems, no need to change it
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
    <View style={styles.container}>
      <View style={styles.questionTextBox}>
        <Text style={styles.questionText}>How tall are you?</Text>
      </View>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={internalHeightCm}
          onValueChange={(itemValue) => {
            if (itemValue !== null) {
              // Picker can return null if no item is selected
              setInternalHeightCm(Number(itemValue));
            }
          }}
          style={styles.picker}
          itemStyle={styles.pickerItem} // Note: itemStyle is iOS only
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

      <View style={styles.unitSelectorContainer}>
        <TouchableOpacity
          style={[
            styles.unitButton,
            unit === "FT" && styles.unitButtonSelected,
          ]}
          onPress={() => handleUnitChange("FT")}
        >
          <Text
            style={[
              styles.unitButtonText,
              unit === "FT" && styles.unitButtonTextSelected,
            ]}
          >
            FT
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.unitButton,
            unit === "CM" && styles.unitButtonSelected,
          ]}
          onPress={() => handleUnitChange("CM")}
        >
          <Text
            style={[
              styles.unitButtonText,
              unit === "CM" && styles.unitButtonTextSelected,
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
    backgroundColor: "#f0f0f0",
    alignItems: "center", // Center content horizontally
    paddingHorizontal: 16,
  },
  questionTextBox: {
    // Similar to AgeInputStep, adjust as needed
    marginTop: 60, // Adjusted margin
    marginBottom: 40, // Adjusted margin
    alignSelf: "stretch", // Make it stretch
    marginLeft: 0, // Reset from original if centering
  },
  questionText: {
    fontFamily: "Literata", // Make sure this font is linked in your project
    fontSize: 32,
    color: "#000000",
    textAlign: "center", // Center question text
  },
  pickerContainer: {
    height: 200, // Fixed height for the picker area
    width: "100%", // Make picker take full width
    justifyContent: "center",
    marginBottom: 30,
  },
  picker: {
    width: "100%",
    height: Platform.OS === "ios" ? 200 : 50, // iOS picker is taller by nature
  },
  pickerItem: {
    // This style is for iOS only.
    // To match the image (large centered text), a custom FlatList picker might be needed.
    fontSize: Platform.OS === "ios" ? 24 : 18,
    textAlign: "center",
    fontFamily: "Literata",
    color: "#000000", // Text color for picker items
    height: Platform.OS === "ios" ? 150 : undefined, // Height for each item on iOS
  },
  unitSelectorContainer: {
    flexDirection: "row",
    justifyContent: "center", // Center buttons
    alignItems: "center",
    backgroundColor: "#f0f0f0", // Background for the selector bar
    borderRadius: 8,
    padding: 4, // Padding inside the selector bar
    marginBottom: 20,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 25, // Increased padding for wider buttons
    borderRadius: 6, // Slightly rounded corners for inner buttons
    marginHorizontal: 4, // Space between buttons
  },
  unitButtonSelected: {
    backgroundColor: "#ffffff", // White background for selected button
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  unitButtonText: {
    fontFamily: "Literata",
    fontSize: 16,
    color: "#555555", // Default text color for unit
  },
  unitButtonTextSelected: {
    color: "#000000", // Black text for selected unit
    fontWeight: "bold",
  },
});

export default HeightInputStep;
