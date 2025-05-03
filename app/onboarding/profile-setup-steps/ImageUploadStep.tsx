import React, { JSX } from 'react';
import { View } from 'react-native';
import { ProfileImage } from '@/types/user/profile'; // ProfileImage 타입 import (경로 확인)

interface ImageUploadStepProps {
  value: ProfileImage[];
  onChange: (value: ProfileImage[]) => void;
}

const ImageUploadStep = ({ value, onChange }: ImageUploadStepProps): JSX.Element => {
  return (
    <View>
      {/* 이미지 업로드 UI 구현 */}
    </View>
  );
};

export default ImageUploadStep;