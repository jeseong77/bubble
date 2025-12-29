import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeProvider';
import { ProfileImage } from '@/types/profile';

interface ImageOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onRemoveImage: () => void;
  selectedImageIndex: number | null;
  currentImages: (ProfileImage | null)[];
}

export const ImageOptionsModal: React.FC<ImageOptionsModalProps> = ({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
  onRemoveImage,
  selectedImageIndex,
  currentImages,
}) => {
  const { colors } = useAppTheme();

  const hasImage = selectedImageIndex !== null && currentImages[selectedImageIndex];

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.imageOptionsModal, { backgroundColor: colors.white }]}>
          <Text style={[styles.modalTitle, { color: colors.black }]}>Image Options</Text>
          <TouchableOpacity style={styles.imageOptionButton} onPress={onTakePhoto}>
            <Ionicons name="camera" size={24} color={colors.primary} />
            <Text style={[styles.imageOptionText, { color: colors.black }]}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageOptionButton} onPress={onPickImage}>
            <Ionicons name="images" size={24} color={colors.primary} />
            <Text style={[styles.imageOptionText, { color: colors.black }]}>
              Select from Gallery
            </Text>
          </TouchableOpacity>
          {hasImage && (
            <TouchableOpacity style={styles.imageOptionButton} onPress={onRemoveImage}>
              <Ionicons name="trash" size={24} color={colors.error} />
              <Text style={[styles.imageOptionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.imageOptionButton, { marginTop: 20 }]} onPress={onClose}>
            <Text style={[styles.imageOptionText, { color: colors.darkGray }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOptionsModal: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Quicksand-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  imageOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    borderRadius: 10,
    marginVertical: 5,
  },
  imageOptionText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Regular',
    marginLeft: 15,
  },
});
