import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";

export interface MobileNumberInputProps {
  phoneNumber: string;
  setPhoneNumber: (text: string) => void;
  countryCode: string;
  onCountryCodePress: () => void;
}

const MobileNumberInputPhase = ({
  phoneNumber,
  setPhoneNumber,
  countryCode,
  onCountryCodePress,
}: MobileNumberInputProps) => {
  const { colors } = useAppTheme();

  return (
    // Main container now uses a row layout with a gap
    <View style={styles.inputSectionContainer}>
      {/* Country Code Picker Section */}
      <View style={styles.countryInputWrapper}>
        <Text style={[styles.inputLabel, { color: colors.darkGray }]}>
          Country
        </Text>
        <TouchableOpacity
          style={[styles.countryPickerBox]}
          onPress={onCountryCodePress}
        >
          <Text style={[styles.inputText, { color: colors.black }]}>
            {countryCode}
          </Text>
          <Ionicons name="chevron-down" size={22} color={colors.darkGray} />
        </TouchableOpacity>
      </View>

      {/* Phone Number Input Section */}
      <View style={styles.phoneInputWrapper}>
        <TextInput
          style={[
            styles.phoneInputBox,
            {
              backgroundColor: colors.lightGray || "#F4F4F4",
              color: colors.black,
            },
          ]}
          placeholder="Phone Number"
          placeholderTextColor={colors.mediumGray || "#A9A9A9"}
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          maxLength={15}
        />
      </View>
    </View>
  );
};

// Styles refactored to match the new design
const styles = StyleSheet.create({
  inputSectionContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end", // Aligns the bottom of the input boxes
    gap: 12, // Creates space between the two inputs
  },
  countryInputWrapper: {
    flex: 1,
    height: 64,
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  phoneInputWrapper: {
    flex: 3,
    justifyContent: "flex-end",
  },
  inputLabel: {
    fontFamily: "Quicksand-Regular",
    fontSize: 14,
    color: "#333",
    marginLeft: 4,
  },
  countryPickerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  phoneInputBox: {
    height: 64,
    paddingHorizontal: 26,
    borderRadius: 12,
    fontSize: 18,
    fontFamily: "Quicksand-Regular",
    fontWeight: "500",
  },
  inputText: {
    fontSize: 18,
    fontFamily: "Quicksand-Regular",
    fontWeight: "500",
  },
});

export default MobileNumberInputPhase;
