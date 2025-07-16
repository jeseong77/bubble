// src/types/profile.ts

// 이미지 타입 정의 (기존과 동일하거나, 사용자님의 정의를 따릅니다)
export interface ProfileImage {
  uri?: string; // 로컬 이미지의 경우 require()의 결과, 원격 이미지의 경우 URL
  url?: string; // Supabase Storage에서 업로드된 이미지의 URL
  path?: string; // 영구 파일 경로 (Supabase Storage 내부 경로)
  base64?: string; // base64 인코딩된 이미지 데이터
  isLoading?: boolean; // 이미지 업로드 중인지 여부
}

// 프로필 데이터 전체 구조 정의 (고유 ID 필드 추가)
export interface ProfileFormData {
  userId: string; // ✨ [추가] 각 사용자를 위한 고유 식별자
  firstName: string;
  lastName: string;
  age: number | null; // 생년월일로부터 계산될 수 있으므로, 저장 방식 고려
  birthDay: string; // 예: "01", "15"
  birthMonth: string; // 예: "01", "12"
  birthYear: string; // 예: "1990", "2003"
  height: number | null;
  mbti: string | null; // 예: "INFP" 또는 null
  gender: string; // 예: "Man", "Woman", "Nonbinary", "Other" 또는 사용자 정의 값
  genderVisibleOnProfile: boolean; // 프로필에 성별 표시 여부
  aboutMe: string; // 자기소개
  images: (ProfileImage | null)[];
}
