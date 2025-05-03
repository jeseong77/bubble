import React, { JSX } from 'react';
import { View, StyleSheet } from 'react-native';

interface AboutMeInputStepProps {
  value: string;
  onChange: (value: string) => void;
}

const AboutMeInputStep = ({ value, onChange }: AboutMeInputStepProps): JSX.Element => {
  return <View style={styles.container}>{/* 나이 입력 UI 구현 */}</View>;
  };
  
  const styles = StyleSheet.create({
    questionTextBox: { marginTop: 171, marginBottom: 68 },
    questionText: {
      fontFamily: "Literata",
      fontSize: 32,
    },
    container: {
      flex: 1,
      backgroundColor: "#f0f0f0",
      paddingHorizontal: 16,
    },
  });
  
  export default AboutMeInputStep;