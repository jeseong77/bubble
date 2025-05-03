import React, { JSX } from 'react';
import { View } from 'react-native';

interface GenderInputStepProps {
  value: string;
  onChange: (value: string) => void;
}

const GenderInputStep = ({ value, onChange }: GenderInputStepProps): JSX.Element => {
  return (
    <View>
      {/* 성별 입력 UI 구현 */}
    </View>
  );
};

export default GenderInputStep;