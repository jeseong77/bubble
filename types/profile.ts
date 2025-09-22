// src/types/profile.ts

// 이미지 타입 정의 - 통합된 이미지 업로드 패턴을 위해 간소화
export interface ProfileImage {
  url?: string; // Supabase Storage public URL
  isLoading?: boolean; // 이미지 업로드 중인지 여부
}

// 프로필 데이터 전체 구조 정의 (고유 ID 필드 추가)
export interface ProfileFormData {
  userId: string; // ✨ [추가] 각 사용자를 위한 고유 식별자
  username: string; // ✨ [추가] 사용자 지정 사용자명/아이디
  firstName: string;
  lastName: string;
  username?: string; // 사용자 고유 이름
  age: number | null; // 생년월일로부터 계산될 수 있으므로, 저장 방식 고려
  birthDay: string; // 예: "01", "15"
  birthMonth: string; // 예: "01", "12"
  birthYear: string; // 예: "1990", "2003"
  height: number | null;
  mbti: string | null; // 예: "INFP" 또는 null
  gender: string; // 예: "male", "female", "nonbinary", "other" 또는 사용자 정의 값
  genderVisibleOnProfile: boolean; // 프로필에 성별 표시 여부
  location: string | null; // 사용자 거주 도시
  preferredGender: string; // 선호하는 성별: "male", "female", "nonbinary", "any"
  aboutMe: string; // 자기소개
  images: (ProfileImage | null)[];
}
