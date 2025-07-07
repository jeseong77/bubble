import * as React from "react";
import { View, TextInput, Pressable, StyleSheet, Platform } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

export interface VerificationCodeInputProps {
  verificationCodeInput: string;
  setVerificationCodeInput: (text: string) => void;
}

const CODE_LENGTH = 5;

const VerificationCodeInputPhase = ({
  verificationCodeInput,
  setVerificationCodeInput,
}: VerificationCodeInputProps) => {
  const { colors } = useAppTheme();
  const inputRef = React.useRef<TextInput>(null);

  // Split code into array of chars, pad with empty strings
  const codeDigits = Array(CODE_LENGTH)
    .fill("")
    .map((_, i) => verificationCodeInput[i] || "");

  // Focus input when any box is pressed
  const handleBoxPress = () => {
    inputRef.current?.focus();
  };

  // Only allow numeric input, max length 5
  const handleChangeText = (text: string) => {
    setVerificationCodeInput(text.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH));
  };

  return (
    <View style={styles.inputSectionContainer}>
      <Pressable style={styles.codeRow} onPress={handleBoxPress}>
        {codeDigits.map((digit, idx) => (
          <View
            key={idx}
            style={[
              styles.codeBox,
              { backgroundColor: colors.lightGray || "#f4f4f4" },
            ]}
          >
            <TextInput
              style={styles.codeDigit}
              value={digit}
              editable={false}
              pointerEvents="none"
            />
          </View>
        ))}
        {/* Hidden input for actual typing */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={verificationCodeInput}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus={false}
          caretHidden
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  inputSectionContainer: {
    width: "100%",
    marginBottom: 46,
  },
  codeRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    flex: 1,
    minHeight: 72,
  },
  codeBox: {
    flex: 1,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
    justifyContent: "center",
    alignItems: "center",
  },
  codeDigit: {
    fontSize: 32,
    color: "#333",
    textAlign: "center",
    fontFamily: "Quicksand-Regular",
    fontWeight: "500",
    width: "100%",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
});

export default VerificationCodeInputPhase;
