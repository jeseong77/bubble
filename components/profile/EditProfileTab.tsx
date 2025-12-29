import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeProvider';
import { ProfileFormData, ProfileImage } from '@/types/profile';

const NUM_COLUMNS = 3;
const MAX_IMAGES_DEFAULT = 6;

interface EditProfileTabProps {
  editingProfile: ProfileFormData | null;
  onProfileChange: (profile: ProfileFormData) => void;
  currentImages: (ProfileImage | null)[];
  onImageSelect: (index: number) => void;
  onSavePress: () => void;
  saving: boolean;
}

export const EditProfileTab: React.FC<EditProfileTabProps> = ({
  editingProfile,
  onProfileChange,
  currentImages,
  onImageSelect,
  onSavePress,
  saving,
}) => {
  const { colors } = useAppTheme();

  // Calculate image grid layout
  const screenWidth = Dimensions.get('window').width;
  const contentPaddingHorizontal = 20; // From styles.editProfileTabContent.paddingHorizontal
  const itemGap = 10;
  const totalGapSpace = itemGap * (NUM_COLUMNS - 1);
  const itemSize =
    (screenWidth - contentPaddingHorizontal * 2 - totalGapSpace) / NUM_COLUMNS;

  // Render each image slot
  const renderImageSlot = (index: number) => {
    const imageAsset = currentImages[index];

    return (
      <View
        key={index}
        style={[
          styles.imageSlotContainer,
          { width: itemSize, height: itemSize },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.imageSlotButton,
            {
              backgroundColor: colors.lightGray,
            },
          ]}
          onPress={() => onImageSelect(index)}
          activeOpacity={0.7}
        >
          {imageAsset ? (
            imageAsset.isLoading ? (
              <View
                style={[
                  styles.imagePreview,
                  {
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.lightGray,
                  },
                ]}
              >
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <Image
                source={{ uri: imageAsset.url }}
                style={styles.imagePreview}
              />
            )
          ) : (
            <>
              <Text style={[styles.imageSlotNumber, { color: colors.black }]}>
                {index + 1}.
              </Text>
              <View style={styles.imagePlusIconContainer}>
                <Ionicons
                  name="add-circle-outline"
                  size={Math.min(itemSize * 0.3, 32)}
                  color={colors.darkGray}
                />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render profile details form
  const renderProfileDetails = () => (
    <View style={styles.profileDetailsContainer}>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          First name<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text
          style={[
            styles.detailValue,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
        >
          {editingProfile?.firstName || 'Not available'}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Last name<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text
          style={[
            styles.detailValue,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
        >
          {editingProfile?.lastName || 'Not available'}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Age<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text
          style={[
            styles.detailValue,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
        >
          {editingProfile?.age
            ? `${editingProfile.age} years old`
            : 'Not available'}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Height (cm)
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
          value={editingProfile?.height?.toString() || ''}
          onChangeText={(text) =>
            onProfileChange({
              ...editingProfile!,
              height: parseInt(text) || 0,
            })
          }
          placeholder="Enter height"
          placeholderTextColor={colors.darkGray}
          keyboardType="numeric"
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          MBTI
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
          value={editingProfile?.mbti || ''}
          onChangeText={(text) =>
            onProfileChange({ ...editingProfile!, mbti: text })
          }
          placeholder="Enter MBTI"
          placeholderTextColor={colors.darkGray}
          autoCapitalize="characters"
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Description
        </Text>
        <TextInput
          style={[
            styles.detailInput,
            {
              color: colors.black,
              borderBottomColor: colors.darkGray,
            },
          ]}
          value={editingProfile?.aboutMe || ''}
          onChangeText={(text) =>
            onProfileChange({ ...editingProfile!, aboutMe: text })
          }
          placeholder="Tell us about yourself"
          placeholderTextColor={colors.darkGray}
          textAlignVertical="top"
        />
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Gender<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text
          style={[
            styles.detailValue,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
        >
          {editingProfile?.gender
            ? editingProfile.gender.charAt(0).toUpperCase() +
              editingProfile.gender.slice(1)
            : 'Not specified'}
        </Text>
      </View>
      <View style={[styles.detailItem, { borderBottomColor: colors.darkGray }]}>
        <Text style={[styles.detailLabel, { color: colors.darkGray }]}>
          Preferred Gender<Text style={{ color: 'red', fontSize: 18 }}>*</Text>
        </Text>
        <Text
          style={[
            styles.detailValue,
            { color: colors.black, borderBottomColor: colors.darkGray },
          ]}
        >
          {editingProfile?.preferredGender
            ? editingProfile.preferredGender.charAt(0).toUpperCase() +
              editingProfile.preferredGender.slice(1)
            : 'Not specified'}
        </Text>
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={onSavePress}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={[styles.saveButtonText, { color: colors.white }]}>
            Save Changes
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.editProfileTabContent}>
      {/* Image input grid */}
      <View style={styles.imageGridContainer}>
        {Array.from({ length: MAX_IMAGES_DEFAULT }).map((_, index) =>
          renderImageSlot(index)
        )}
      </View>
      {/* Profile details (edit fields) */}
      {editingProfile && renderProfileDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  editProfileTabContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  imageGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  imageSlotContainer: {
    aspectRatio: 1,
  },
  imageSlotButton: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageSlotNumber: {
    position: 'absolute',
    top: 6,
    left: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlusIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileDetailsContainer: {
    marginTop: 8,
  },
  detailItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '400',
  },
  detailInput: {
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
