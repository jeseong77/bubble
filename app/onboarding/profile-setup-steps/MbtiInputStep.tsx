// app/onboarding/profile-setup-steps/MbtiInputStep.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";

interface MbtiInputStepProps {
  currentMbti: string | null;
  onMbtiChange: (mbti: string | null) => void;
}

type LetterEorI = "E" | "I";
type LetterSorN = "S" | "N";
type LetterTorF = "T" | "F";
type LetterJorP = "J" | "P";

const MbtiInputStep: React.FC<MbtiInputStepProps> = ({
  currentMbti,
  onMbtiChange,
}) => {
  const { colors } = useAppTheme();

  const [val1, setVal1] = useState<LetterEorI | null>(null);
  const [val2, setVal2] = useState<LetterSorN | null>(null);
  const [val3, setVal3] = useState<LetterTorF | null>(null);
  const [val4, setVal4] = useState<LetterJorP | null>(null);

  const [isUnknown, setIsUnknown] = useState(() => currentMbti === null);

  const animatedIsUnknownValue = useRef(
    new Animated.Value(isUnknown ? 1 : 0)
  ).current;

  useEffect(() => {
    const newIsUnknownBasedOnProp = currentMbti === null;
    if (isUnknown !== newIsUnknownBasedOnProp) {
      setIsUnknown(newIsUnknownBasedOnProp);
    }

    if (newIsUnknownBasedOnProp) {
      setVal1(null);
      setVal2(null);
      setVal3(null);
      setVal4(null);
    } else if (typeof currentMbti === "string" && currentMbti.length === 4) {
      if (!newIsUnknownBasedOnProp) {
        setVal1(currentMbti[0] as LetterEorI);
        setVal2(currentMbti[1] as LetterSorN);
        setVal3(currentMbti[2] as LetterTorF);
        setVal4(currentMbti[3] as LetterJorP);
      }
    } else {
      if (!newIsUnknownBasedOnProp) {
        setIsUnknown(false);
        setVal1(null);
        setVal2(null);
        setVal3(null);
        setVal4(null);
      }
    }
  }, [currentMbti]);

  useEffect(() => {
    Animated.timing(animatedIsUnknownValue, {
      toValue: isUnknown ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isUnknown, animatedIsUnknownValue]);

  useEffect(() => {
    if (isUnknown) {
      onMbtiChange(null);
    } else {
      if (val1 && val2 && val3 && val4) {
        onMbtiChange(`${val1}${val2}${val3}${val4}`);
      }
    }
  }, [val1, val2, val3, val4, isUnknown, onMbtiChange]);

  const handleMbtiPartSelection = (
    dichotomyIndex: 0 | 1 | 2 | 3,
    selectedValue: string
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isUnknown) {
      setIsUnknown(false);
    }
    switch (dichotomyIndex) {
      case 0:
        setVal1(selectedValue as LetterEorI);
        break;
      case 1:
        setVal2(selectedValue as LetterSorN);
        break;
      case 2:
        setVal3(selectedValue as LetterTorF);
        break;
      case 3:
        setVal4(selectedValue as LetterJorP);
        break;
    }
  };

  const toggleUnknown = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newIsUnknown = !isUnknown;
    setIsUnknown(newIsUnknown);
    if (newIsUnknown) {
      setVal1(null);
      setVal2(null);
      setVal3(null);
      setVal4(null);
    }
  };

  const DichotomyRow: React.FC<{
    val: string | null;
    option1: string;
    option2: string;
    onSelect: (optionValue: string) => void;
    animatedValue: Animated.Value;
  }> = ({ val, option1, option2, onSelect, animatedValue }) => {
    const createAnimatedLetter = (optionValue: string) => {
      const isSelected = val === optionValue && !isUnknown;

      const letterColorSelected = colors.primary;
      const letterColorUnselected = colors.mediumGray;
      const letterColorDisabled = colors.mediumGray;

      const activeColor = isSelected
        ? letterColorSelected
        : letterColorUnselected;

      const textColor = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [activeColor, letterColorDisabled],
      });

      return (
        <TouchableOpacity
          style={styles.letterContainer}
          onPress={() => onSelect(optionValue)}
        >
          <Animated.Text
            style={[
              styles.optionLetterText,
              { color: textColor },
              isSelected && styles.selectedOptionFont,
            ]}
          >
            {optionValue}
          </Animated.Text>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.dichotomyRow}>
        {createAnimatedLetter(option1)}
        <View
          style={[styles.lineConnector, { backgroundColor: colors.mediumGray }]}
        />
        {createAnimatedLetter(option2)}
      </View>
    );
  };

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
          What's your MBTI?
        </Text>
      </View>

      <View style={styles.mbtiSelectorContainer}>
        <DichotomyRow
          val={val1}
          option1="E"
          option2="I"
          onSelect={(opt) => handleMbtiPartSelection(0, opt)}
          animatedValue={animatedIsUnknownValue}
        />
        <DichotomyRow
          val={val2}
          option1="S"
          option2="N"
          onSelect={(opt) => handleMbtiPartSelection(1, opt)}
          animatedValue={animatedIsUnknownValue}
        />
        <DichotomyRow
          val={val3}
          option1="T"
          option2="F"
          onSelect={(opt) => handleMbtiPartSelection(2, opt)}
          animatedValue={animatedIsUnknownValue}
        />
        <DichotomyRow
          val={val4}
          option1="J"
          option2="P"
          onSelect={(opt) => handleMbtiPartSelection(3, opt)}
          animatedValue={animatedIsUnknownValue}
        />
      </View>

      <TouchableOpacity
        style={styles.unknownOptionContainer}
        onPress={toggleUnknown}
      >
        <Text style={[styles.checkboxText, { color: colors.black }]}>
          I don't know.
        </Text>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: colors.mediumGray,
              backgroundColor: isUnknown ? colors.primary : colors.white,
            },
          ]}
        >
          {isUnknown && (
            <Ionicons name="checkmark" size={18} color={colors.white} />
          )}
        </View>
      </TouchableOpacity>
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
    marginBottom: 50,
    alignSelf: "stretch",
  },
  questionText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
    textAlign: "center",
  },
  mbtiSelectorContainer: {
    width: "80%",
    maxWidth: 300,
    marginBottom: 40,
  },
  dichotomyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15,
    width: "100%",
  },
  letterContainer: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 30,
    textAlign: "center",
  },
  selectedOptionFont: {
    fontFamily: "Quicksand-Bold",
  },
  lineConnector: {
    flex: 1,
    height: 1.5,
    marginHorizontal: 10,
  },
  unknownOptionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  checkboxText: {
    fontFamily: "Quicksand-Regular",
    fontSize: 16,
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default MbtiInputStep;
