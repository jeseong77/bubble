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
import { useAppTheme } from "@/hooks/useAppTheme";
import { inputFieldContainerStyles } from "./inputFieldContainer.styles";

export interface ProfileImage {
  uri?: string;
  url?: string;
  isLoading?: boolean;
}

interface ImageUploadStepProps {
  currentImages: (ProfileImage | null)[];
  onImagesChange: (images: (ProfileImage | null)[]) => void;
  onUploadImage?: (index: number) => Promise<void>;
  maxImages?: number;
}

const NUM_COLUMNS = 3;
const MAX_IMAGES_DEFAULT = 6;

const ImageUploadStep: React.FC<ImageUploadStepProps> = ({
  currentImages,
  onImagesChange,
  onUploadImage,
  maxImages = MAX_IMAGES_DEFAULT,
}) => {
  const { colors } = useAppTheme();

  const screenWidth = Dimensions.get("window").width;
  const contentPaddingHorizontal = 30;
  const itemGap = 10;
  const totalGapSpace = itemGap * (NUM_COLUMNS - 1);
  const itemSize =
    (screenWidth - contentPaddingHorizontal * 2 - totalGapSpace) / NUM_COLUMNS;

  const handlePickImage = async (index: number) => {
    if (onUploadImage) {
      // 서버 업로드가 가능한 경우
      await onUploadImage(index);
    } else {
      // 기존 로컬 방식
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
          const newProfileImage: ProfileImage = { uri: result.assets[0].uri };
          const updatedImages = [...currentImages];
          updatedImages[index] = newProfileImage;
          onImagesChange(updatedImages);
        }
      } catch (error) {
        console.error("ImagePicker Error: ", error);
        Alert.alert("Image Error", "Could not select image. Please try again.");
      }
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
    const imageAsset = currentImages[index];
    const isRequired = index < 2;

    return (
      <View
        key={index}
        style={[styles.slotContainer, { width: itemSize, height: itemSize }]}
      >
        {isRequired && (
          <Text style={[styles.requiredText, { color: colors.primary }]}>
            Required
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.slotButton,
            {
              backgroundColor: colors.lightGray,
            },
          ]}
          onPress={() =>
            imageAsset ? handleRemoveImage(index) : handlePickImage(index)
          }
          activeOpacity={0.7}
        >
          {imageAsset ? (
            <Image
              source={{ uri: imageAsset.url || imageAsset.uri }}
              style={styles.imagePreview}
            />
          ) : (
            <>
              <Text
                style={[styles.slotNumber, { color: colors.onSurfaceVariant }]}
              >
                {index + 1}.
              </Text>
              <View style={styles.plusIconContainer}>
                <Ionicons
                  name="add-circle-outline"
                  size={32}
                  color={colors.darkGray}
                />
              </View>
            </>
          )}
        </TouchableOpacity>
        {imageAsset && (
          <TouchableOpacity
            onPress={() => handleRemoveImage(index)}
            style={[
              styles.removeIconContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <Ionicons name="close-circle" size={28} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    // safeArea에 동적 배경색 적용
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.white }]}>
      <View style={inputFieldContainerStyles.container}>
        {/* title에 동적 텍스트 색상 적용 */}
        <Text style={[styles.title, { color: colors.black }]}>
          Upload pictures
        </Text>
        <View style={styles.gridContainer}>
          {Array.from({ length: maxImages }).map((_, index) =>
            renderSlot(index)
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// StyleSheet.create는 정적인 스타일만 포함
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: "#f0f0f0", // 제거됨 (동적 적용)
  },
  container: {
    // inputFieldContainer.styles가 모든 레이아웃을 담당하므로 여기서는 제거
  },
  title: {
    fontFamily: "Quicksand-Bold",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 40,
    lineHeight: 40,
  },
  gridContainer: {
    flexDirection: "row", // 기존 값 유지
    flexWrap: "wrap", // 기존 값 유지
    justifyContent: "space-between", // 기존 값 유지
  },
  slotContainer: {
    marginBottom: 10, // 기존 값 유지
    position: "relative", // 기존 값 유지
  },
  requiredText: {
    position: "absolute", // 기존 값 유지
    top: -18, // 기존 값 유지
    left: 0, // 기존 값 유지
    // color: "orange",   // 제거됨 (동적 적용)
    fontSize: 12, // 기존 값 유지
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium", // 기존 값 유지
    fontWeight: "500", // 기존 값 유지
  },
  slotButton: {
    flex: 1,
    justifyContent: "space-between", // 기존 값 유지
    alignItems: "stretch",
    borderRadius: 8,
  },
  imagePreview: {
    width: "100%", // 기존 값 유지
    height: "100%", // 기존 값 유지
    borderRadius: 10, // 기존 값 유지
  },
  slotNumber: {
    position: "absolute", // 기존 값 유지
    top: 5, // 기존 값 유지
    left: 8, // 기존 값 유지
    fontSize: 14, // 기존 값 유지
    // color: "#A0A0A0",   // 제거됨 (동적 적용)
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium", // 기존 값 유지
    fontWeight: "500", // 기존 값 유지
  },
  plusIconContainer: {
    position: "absolute", // 기존 값 유지
    bottom: 5, // 기존 값 유지
    right: 5, // 기존 값 유지
  },
  removeIconContainer: {
    position: "absolute", // 기존 값 유지
    top: -8, // 기존 값 유지
    right: -8, // 기존 값 유지
    // backgroundColor: "#f0f0f0", // 제거됨 (동적 적용)
    borderRadius: 15, // 기존 값 유지
    padding: 1, // 기존 값 유지 (아이콘과 배경 사이 약간의 여백 효과)
  },
});

export default ImageUploadStep;
