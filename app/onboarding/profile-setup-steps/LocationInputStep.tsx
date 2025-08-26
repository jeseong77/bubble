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
  const { isLoading, getCurrentLocation, requestLocationPermission, error } = useLocationServices();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handleUseCurrentLocation = async () => {
    setIsDetectingLocation(true);
    
    try {
      const locationData = await getCurrentLocation();
      if (locationData && locationData.city) {
        onLocationChange(locationData.city);
      } else if (error) {
        Alert.alert(
          "Location Error",
          "Unable to detect your location. Please enter your city manually.",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      Alert.alert(
        "Location Error",
        "Unable to detect your location. Please enter your city manually.",
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

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.lightGray,
                color: colors.bubbleFont,
              },
            ]}
            placeholder="What city do you live in?"
            placeholderTextColor={colors.darkGray}
            value={location || ""}
            onChangeText={onLocationChange}
            autoCapitalize="words"
            autoCorrect={false}
            selectionColor={colors.primary}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <TouchableOpacity 
          style={[
            styles.locationButton,
            { backgroundColor: colors.primary }
          ]} 
          onPress={handleUseCurrentLocation}
          disabled={isDetectingLocation}
        >
          {isDetectingLocation ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="location" size={20} color={colors.white} />
          )}
          <Text style={[
            styles.locationButtonText, 
            { color: colors.white }
          ]}>
            {isDetectingLocation ? 'Detecting...' : 'Use Current Location'}
          </Text>
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
    marginBottom: 16,
  },
  input: {
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: "Quicksand-Regular",
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  locationButtonText: {
    fontFamily: "Quicksand-Bold",
    fontSize: 16,
    fontWeight: "700",
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