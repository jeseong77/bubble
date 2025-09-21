import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { decode } from 'base64-arraybuffer'
import { Alert } from 'react-native'

interface UploadResult {
  publicUrl: string
  path: string
}

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false)

  const uploadImage = async (
    userId: string,
    imageAsset: ImagePicker.ImagePickerAsset
  ): Promise<UploadResult | null> => {
    if (!imageAsset.base64) {
      console.error('No base64 data available')
      return null
    }

    try {
      setIsUploading(true)

      // 파일 경로 생성
      const fileExt = imageAsset.uri.split('.').pop()?.toLowerCase() ?? 'jpeg'
      const filePath = `${userId}/${Date.now()}.${fileExt}`
      const contentType = `image/${fileExt}`

      // Supabase Storage 업로드
      const { data, error } = await supabase.storage
        .from('user-images')
        .upload(filePath, decode(imageAsset.base64), { contentType })

      if (error) throw error

      // Public URL 생성
      const { data: { publicUrl } } = supabase.storage
        .from('user-images')
        .getPublicUrl(data.path)

      return {
        publicUrl,
        path: data.path
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      Alert.alert('Error', 'Failed to upload image')
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const pickAndUploadImage = async (
    userId: string,
    source: 'camera' | 'library' = 'library'
  ): Promise<UploadResult | null> => {
    try {
      // 권한 확인
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert('Permission required', `Please grant ${source} access`)
        return null
      }

      // 이미지 선택/촬영
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true
          })

      if (result.canceled || !result.assets?.[0]) {
        return null
      }

      // 업로드
      return await uploadImage(userId, result.assets[0])
    } catch (error) {
      console.error('Pick and upload failed:', error)
      return null
    }
  }

  return {
    uploadImage,
    pickAndUploadImage,
    isUploading
  }
}