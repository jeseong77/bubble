// 이미지 타입 정의 (예: Expo ImagePicker 결과 등 활용)
export interface ProfileImage {
  uri: string;
}

// 프로필 데이터 전체 구조 정의
export interface ProfileFormData {
  firstName: string;
  lastName: string; 
  age: number | null;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  height: number | null;
  mbti: string;
  gender: string;
  aboutMe: string;
  images: ProfileImage[];
}
