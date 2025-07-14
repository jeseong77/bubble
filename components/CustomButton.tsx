import React, { JSX } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  DimensionValue,
} from "react-native";

interface CustomButtonProps {
  onPress: () => void;
  title: string;
  buttonColor?: string;
  buttonColorDisabled?: string;
  textColor?: string;
  textColorDisabled?: string;
  horizontalMargin?: number;
  disabled?: boolean;
  activeOpacity?: number;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  paddingVertical?: number;
  width?: DimensionValue;
}

const CustomButton = ({
  onPress,
  title,
  buttonColor = "#007AFF",
  buttonColorDisabled = "#A9A9A9",
  textColor = "#FFFFFF",
  textColorDisabled = "#E0E0E0",
  horizontalMargin = 0,
  disabled = false,
  activeOpacity = 0.7,
  loading = false,
  style,
  textStyle,
  paddingVertical = 16,
  width = "80%",
}: CustomButtonProps): JSX.Element => {
  const currentButtonColor =
    disabled || loading ? buttonColorDisabled : buttonColor;
  const currentTextColor = disabled || loading ? textColorDisabled : textColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
      style={[
        styles.container,
        {
          backgroundColor: currentButtonColor,
          marginHorizontal: horizontalMargin,
          paddingVertical: paddingVertical,
          width: width,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentTextColor} />
      ) : (
        <Text style={[styles.text, { color: currentTextColor }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 30,
    alignSelf: "center",
  },
  text: {
    fontFamily: "Quicksand-SemiBold",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default CustomButton;
