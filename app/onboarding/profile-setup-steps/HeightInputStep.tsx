import React, { JSX } from "react";
import { View } from "react-native";

interface HeightInputStepProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

const HeightInputStep = ({
  value,
  onChange,
}: HeightInputStepProps): JSX.Element => {
  return <View>{/* 키 입력 UI 구현 */}</View>;
};

export default HeightInputStep;
