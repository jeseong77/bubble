import React, { JSX, useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "@/styles/onboarding/inputFieldContainer.styles";
import { useLocationServices } from "@/hooks/useLocationServices";
import { Ionicons } from "@expo/vector-icons";

interface LocationInputStepProps {
  location: string | null;
  onLocationChange: (value: string) => void;
  onSkip: () => void;
}

const LocationInputStep = ({
  location,
  onLocationChange,
  onSkip,
}: LocationInputStepProps): JSX.Element => {
  const { colors } = useAppTheme();
  const { getCurrentLocation } = useLocationServices();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handleTextInputPress = async () => {
    if (isDetectingLocation) return;
    
    setIsDetectingLocation(true);
    
    try {
      const locationData = await getCurrentLocation();
      if (locationData && locationData.city) {
        onLocationChange(locationData.city);
      } else {
        // If location detection fails, user must press "Not Now" to proceed
        Alert.alert(
          "Location Denied",
          "You have denied permission for location services. You can change this later in your profile settings. For now, please press 'Not Now' to proceed.",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      // If location detection fails, user must press "Not Now" to proceed  
      Alert.alert(
        "Location Denied", 
        "You have denied permission for location services. You can change this later in your profile settings. For now, please press 'Not Now' to proceed.",
        [{ text: "OK" }]
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={[
          inputFieldContainerStyles.container,
          { backgroundColor: colors.white },
        ]}
      >
        <View style={styles.questionTextBox}>
          <Text style={[styles.questionText, { color: colors.black }]}>
            Current location?
          </Text>
        </View>

        <TouchableOpacity
          style={styles.inputContainer}
          onPress={handleTextInputPress}
          disabled={isDetectingLocation}
        >
          <View
            style={[
              styles.input,
              {
                backgroundColor: colors.lightGray,
              },
            ]}
          >
            <Text
              style={[
                styles.inputText,
                {
                  color: isDetectingLocation 
                    ? colors.primary 
                    : location 
                    ? colors.bubbleFont 
                    : colors.darkGray
                }
              ]}
            >
              {isDetectingLocation 
                ? 'Detecting location...' 
                : location || "What city do you live in?"
              }
            </Text>
            {isDetectingLocation && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={[styles.skipButtonText, { color: colors.navy }]}>
            Not Now
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  questionTextBox: {
    marginBottom: 40,
    alignItems: "center",
  },
  questionText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
    textAlign: "center",
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 20,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
  },
  loadingOverlay: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipButtonText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default LocationInputStep;