// src/types/bubble.ts
import type { ProfileFormData, ProfileImage } from "./profile";

// 버블 내 공유 게시물(사진/영상) 타입
export interface BubblePost {
  id: string; // 게시물의 고유 ID
  type: "image" | "video"; // 미디어 타입
  uri: string; // 미디어의 URI (로컬 또는 원격)
  uploaderUserId: string; // 이 게시물을 올린 멤버의 ProfileFormData.userId
  caption?: string; // 게시물 설명 (선택 사항)
  timestamp: string; // 게시 시간 (ISO 8601 형식의 문자열)
}

// 버블(친구 그룹) 타입
export interface Bubble {
  id: string; // 버블의 고유 ID
  name: string; // 버블의 이름
  members: ProfileFormData[]; // 버블에 속한 멤버들의 프로필 정보 배열 (ProfileFormData 임포트)
  posts: BubblePost[]; // 해당 버블에서 공유된 사진/영상 게시물 배열
  description?: string; // 버블에 대한 간단한 소개 (선택 사항)
  createdAt?: string; // 버블 생성일 (ISO 8601 형식의 문자열)
}
