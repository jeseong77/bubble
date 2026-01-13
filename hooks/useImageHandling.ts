import { useState } from 'react';
import { Alert } from 'react-native';
import { ProfileImage } from '@/types/profile';
import { Session } from '@supabase/supabase-js';

interface UseImageHandlingParams {
  session: Session | null;
  currentImages: (ProfileImage | null)[];
  setCurrentImages: (images: (ProfileImage | null)[]) => void;
  pickAndUploadImage: (userId: string, source: 'camera' | 'library') => Promise<{ publicUrl: string } | null>;
}

interface UseImageHandlingReturn {
  selectedImageIndex: number | null;
  showImageOptionsModal: boolean;
  handleImageOptions: (index: number) => void;
  handleTakePhoto: () => Promise<void>;
  handlePickImage: () => Promise<void>;
  handleRemoveImage: () => void;
  closeImageOptionsModal: () => void;
}

export function useImageHandling({
  session,
  currentImages,
  setCurrentImages,
  pickAndUploadImage,
}: UseImageHandlingParams): UseImageHandlingReturn {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);

  const handleImageOptions = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageOptionsModal(true);
  };

  const closeImageOptionsModal = () => {
    setShowImageOptionsModal(false);
    setSelectedImageIndex(null);
  };

  const handleTakePhoto = async () => {
    console.log('[useImageHandling] handleTakePhoto started');
    setShowImageOptionsModal(false);

    if (!session?.user || selectedImageIndex === null) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    // Set loading state
    const loadingImages = [...currentImages];
    loadingImages[selectedImageIndex] = { isLoading: true };
    setCurrentImages(loadingImages);

    try {
      // Use unified upload hook for camera
      const result = await pickAndUploadImage(session.user.id, 'camera');

      if (result) {
        // Update with public URL
        const finalImages = [...currentImages];
        finalImages[selectedImageIndex] = { url: result.publicUrl };
        setCurrentImages(finalImages);
        console.log(
          `[useImageHandling] Camera image uploaded successfully at position ${selectedImageIndex}: ${result.publicUrl}`
        );
      } else {
        // Revert loading state if upload failed
        const revertedImages = [...currentImages];
        revertedImages[selectedImageIndex] = null;
        setCurrentImages(revertedImages);
      }
    } catch (error) {
      console.error('Camera image upload failed:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');

      // Revert loading state
      const revertedImages = [...currentImages];
      revertedImages[selectedImageIndex] = null;
      setCurrentImages(revertedImages);
    }

    setSelectedImageIndex(null);
  };

  const handlePickImage = async () => {
    console.log('[useImageHandling] handlePickImage started');
    setShowImageOptionsModal(false);

    if (!session?.user || selectedImageIndex === null) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    // Set loading state
    const loadingImages = [...currentImages];
    loadingImages[selectedImageIndex] = { isLoading: true };
    setCurrentImages(loadingImages);

    try {
      // Use unified upload hook for library
      const result = await pickAndUploadImage(session.user.id, 'library');

      if (result) {
        // Update with public URL
        const finalImages = [...currentImages];
        finalImages[selectedImageIndex] = { url: result.publicUrl };
        setCurrentImages(finalImages);
        console.log(
          `[useImageHandling] Library image uploaded successfully at position ${selectedImageIndex}: ${result.publicUrl}`
        );
      } else {
        // Revert loading state if upload failed
        const revertedImages = [...currentImages];
        revertedImages[selectedImageIndex] = null;
        setCurrentImages(revertedImages);
      }
    } catch (error) {
      console.error('Library image upload failed:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');

      // Revert loading state
      const revertedImages = [...currentImages];
      revertedImages[selectedImageIndex] = null;
      setCurrentImages(revertedImages);
    }

    setSelectedImageIndex(null);
  };

  const handleRemoveImage = () => {
    if (selectedImageIndex !== null) {
      const updatedImages = [...currentImages];
      updatedImages[selectedImageIndex] = null;
      setCurrentImages(updatedImages);
    }
    setShowImageOptionsModal(false);
    setSelectedImageIndex(null);
  };

  return {
    selectedImageIndex,
    showImageOptionsModal,
    handleImageOptions,
    handleTakePhoto,
    handlePickImage,
    handleRemoveImage,
    closeImageOptionsModal,
  };
}
