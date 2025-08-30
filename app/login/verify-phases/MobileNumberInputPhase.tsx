import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
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

  // Format phone number for US display (XXX) XXX-XXXX
  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 10 digits for US numbers
    const truncated = cleaned.substring(0, 10);
    
    // Apply formatting based on length
    if (truncated.length >= 6) {
      return `(${truncated.substring(0, 3)}) ${truncated.substring(3, 6)}-${truncated.substring(6)}`;
    } else if (truncated.length >= 3) {
      return `(${truncated.substring(0, 3)}) ${truncated.substring(3)}`;
    } else if (truncated.length > 0) {
      return `(${truncated}`;
    } else {
      return '';
    }
  };

  const handlePhoneNumberChange = (text: string) => {
    // Store only the digits for processing
    const digits = text.replace(/\D/g, '');
    setPhoneNumber(digits);
  };

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
          placeholder="(555) 123-4567"
          placeholderTextColor={colors.mediumGray || "#A9A9A9"}
          keyboardType="phone-pad"
          value={formatPhoneNumber(phoneNumber)}
          onChangeText={handlePhoneNumberChange}
          maxLength={14} // Max length for formatted display
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
    alignItems: "flex-end",
    gap: 12,
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
