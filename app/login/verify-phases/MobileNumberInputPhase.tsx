import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface MobileNumberInputProps {
  phoneNumber: string;
  setPhoneNumber: (text: string) => void;
  countryCode: string;
  onCountryCodePress: () => void;
}

const MobileNumberInputPhase: React.FC<MobileNumberInputProps> = ({
  phoneNumber,
  setPhoneNumber,
  countryCode,
  onCountryCodePress,
}) => {
  return (
    <View style={styles.inputSectionContainer}>
      <Text style={styles.inputLabel}>Select Region</Text>
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.countryCodeTouchable}
          onPress={onCountryCodePress}
        >
          <Text style={styles.countryCodeText}>{countryCode}</Text>
          <Ionicons name="chevron-down-outline" size={24} color="#7A7A7A" />
        </TouchableOpacity>
        <View style={styles.inputSpacer} />
        <TextInput
          style={styles.phoneInput}
          placeholder="Mobile Number"
          placeholderTextColor="#7A7A7A"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          maxLength={15}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputSectionContainer: {
    width: "100%",
    marginBottom: 46,
  },
  inputLabel: {
    fontFamily: "LeagueSpartan-Regular",
    fontSize: 18,
    color: "#7A7A7A",
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  countryCodeTouchable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: 99,
    height: "100%", // inputRow 높이에 맞춤
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  countryCodeText: {
    paddingLeft: 10,
    fontFamily: "LeagueSpartan-Regular",
    fontSize: 24,
    color: "#7A7A7A",
  },
  inputSpacer: {
    width: 37,
  },
  phoneInput: {
    flex: 1,
    height: "100%", // inputRow 높이에 맞춤
    paddingLeft: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    fontFamily: "LeagueSpartan-Regular",
    fontSize: 24,
    color: "#000000",
  },
});

export default MobileNumberInputPhase;
