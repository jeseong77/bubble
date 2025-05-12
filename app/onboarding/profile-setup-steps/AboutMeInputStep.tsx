// ./profile-setup-steps/AboutMeInputStep.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

interface AboutMeInputStepProps {
  currentAboutMe: string;
  onAboutMeChange: (text: string) => void;
}

const AboutMeInputStep: React.FC<AboutMeInputStepProps> = ({
  currentAboutMe,
  onAboutMeChange,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>About me</Text>

          <TextInput
            style={styles.textInput}
            multiline
            placeholder="A brief introduction about yourself."
            placeholderTextColor="#a9a9a9" // Slightly lighter placeholder
            value={currentAboutMe}
            onChangeText={onAboutMeChange}
            maxLength={500} // Optional: set a max length
            scrollEnabled={true} // Ensure scrolling for longer text
            textAlignVertical="top" // Align text to the top for multiline
          />
          {/* Optional: Character counter */}
          {/* <Text style={styles.charCounter}>{currentAboutMe.length} / 500</Text> */}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Consistent background
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 20,
  },
  title: {
    fontFamily: "Literata",
    fontSize: 32,
    color: "#000000",
    fontWeight: 'bold',
    marginBottom: 30, // Spacing between title and text input
    lineHeight: 40,
  },
  textInput: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Standard sans-serif for input
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD', // Light border color
    borderRadius: 12,        // Rounded corners
    paddingHorizontal: 15,
    paddingTop: 15,          // Padding for multiline
    paddingBottom: 15,
    minHeight: 150,          // Minimum height for the text input
    maxHeight: 250,          // Max height before scrolling
    shadowColor: "#000",     // Subtle shadow like the screenshot
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.0,
    elevation: 3,            // Android shadow
  },
  // charCounter: { // Optional character counter style
  //   textAlign: 'right',
  //   marginTop: 5,
  //   fontSize: 12,
  //   color: '#666666',
  // },
});

export default AboutMeInputStep;