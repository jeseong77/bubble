// ./profile-setup-steps/ImageUploadStep.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

// Your defined ProfileImage type (ensure this is imported or defined if not in this file)
export interface ProfileImage {
  // Using your definition
  uri: string;
  // You could add width, height, fileName etc. here if needed later
}

interface ImageUploadStepProps {
  currentImages: (ProfileImage | null)[]; // Updated to use ProfileImage
  onImagesChange: (images: (ProfileImage | null)[]) => void; // Updated
  maxImages?: number;
}

const NUM_COLUMNS = 3;
const MAX_IMAGES_DEFAULT = 6;

const ImageUploadStep: React.FC<ImageUploadStepProps> = ({
  currentImages,
  onImagesChange,
  maxImages = MAX_IMAGES_DEFAULT,
}) => {
  const screenWidth = Dimensions.get("window").width;
  const contentPaddingHorizontal = 30;
  const itemGap = 10;
  const totalGapSpace = itemGap * (NUM_COLUMNS - 1);
  const itemSize =
    (screenWidth - contentPaddingHorizontal * 2 - totalGapSpace) / NUM_COLUMNS;

  const handlePickImage = async (index: number) => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Permission to access camera roll is required to upload images."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Transform ImagePickerAsset to your ProfileImage type
        const newProfileImage: ProfileImage = { uri: result.assets[0].uri };

        const updatedImages = [...currentImages];
        updatedImages[index] = newProfileImage; // Store the ProfileImage object
        onImagesChange(updatedImages);
      }
    } catch (error) {
      console.error("ImagePicker Error: ", error);
      Alert.alert("Image Error", "Could not select image. Please try again.");
    }
  };

  const handleRemoveImage = (index: number) => {
    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const updatedImages = [...currentImages];
          updatedImages[index] = null;
          onImagesChange(updatedImages);
        },
      },
    ]);
  };

  const renderSlot = (index: number) => {
    const imageAsset = currentImages[index]; // This will be ProfileImage | null
    const isRequired = index < 2;

    return (
      <View
        key={index}
        style={[styles.slotContainer, { width: itemSize, height: itemSize }]}
      >
        {isRequired && <Text style={styles.requiredText}>Required</Text>}
        <TouchableOpacity
          style={styles.slotButton}
          onPress={() =>
            imageAsset ? handleRemoveImage(index) : handlePickImage(index)
          }
          activeOpacity={0.7}
        >
          {imageAsset ? (
            // Image source URI comes directly from imageAsset.uri
            <Image
              source={{ uri: imageAsset.uri }}
              style={styles.imagePreview}
            />
          ) : (
            <>
              <Text style={styles.slotNumber}>{index + 1}.</Text>
              <View style={styles.plusIconContainer}>
                <Ionicons name="add-circle-outline" size={32} color="#B0B0B0" />
              </View>
            </>
          )}
        </TouchableOpacity>
        {imageAsset && (
          <TouchableOpacity
            onPress={() => handleRemoveImage(index)}
            style={styles.removeIconContainer}
          >
            <Ionicons name="close-circle" size={28} color="#FF6347" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Upload pictures</Text>
        <View style={styles.gridContainer}>
          {Array.from({ length: maxImages }).map((_, index) =>
            renderSlot(index)
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// Styles remain the same as before
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingBottom: 20,
  },
  title: {
    fontFamily: "Literata",
    fontSize: 32,
    color: "#000000",
    fontWeight: "bold",
    marginBottom: 40,
    lineHeight: 40,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  slotContainer: {
    marginBottom: 10,
    position: "relative",
  },
  requiredText: {
    position: "absolute",
    top: -18,
    left: 0,
    color: "orange",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    fontWeight: "500",
  },
  slotButton: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "stretch",
    borderWidth: 2,
    borderColor: "#D0D0D0",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 8,
    backgroundColor: "#FFFFFF",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  slotNumber: {
    position: "absolute",
    top: 5,
    left: 8,
    fontSize: 14,
    color: "#A0A0A0",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    fontWeight: "500",
  },
  plusIconContainer: {
    position: "absolute",
    bottom: 5,
    right: 5,
  },
  removeIconContainer: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    padding: 1,
  },
});

export default ImageUploadStep;
