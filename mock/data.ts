// mock/data.ts
import type { ProfileFormData, ProfileImage } from "@/types/profile"; // 사용자 프로필 타입 경로 (실제 경로로 수정 필요!)
import type { Bubble, BubblePost } from "@/types/bubble"; // 버블 타입 경로 (실제 경로로 수정 필요!)

// --- 예시 프로필 데이터 ---
// 중요: 아래 ProfileFormData 예시에는 'userId' 필드가 포함되어 있습니다.
// 사용자님의 실제 ProfileFormData 타입 정의에도 이 필드가 있어야 합니다.

const profileAlice: ProfileFormData = {
  userId: "user_alice_001",
  firstName: "Alice",
  lastName: "Kim",
  age: 24,
  birthDay: "15",
  birthMonth: "07",
  birthYear: "2000",
  height: 165,
  mbti: "INFP",
  gender: "Woman",
  genderVisibleOnProfile: true,
  aboutMe: "사진 찍는 것과 새로운 장소 탐험을 좋아해요! 📸✨",
  images: [
    { uri: "https://picsum.photos/seed/alice1_profile/400/400" }, // <--- 변경: URL 사용
    { uri: "https://picsum.photos/seed/alice2_profile/400/400" },
    null,
    null,
    null,
    null,
  ],
};

const profileBella: ProfileFormData = {
  userId: "user_bella_002",
  firstName: "Bella",
  lastName: "Park",
  age: 23,
  birthDay: "10",
  birthMonth: "05",
  birthYear: "2001",
  height: 170,
  mbti: "ESFJ",
  gender: "Woman",
  genderVisibleOnProfile: true,
  aboutMe: "함께 맛있는 음식을 즐기고 이야기 나누는 것을 사랑합니다! 🍜🍰",
  images: [
    { uri: "https://picsum.photos/seed/bella_profile/400/400" }, // <--- 변경: URL 사용
    null,
    null,
    null,
    null,
    null,
  ],
};

// --- 예시 버블 게시물 데이터 ---
const exampleBubblePosts: BubblePost[] = [
  {
    id: "post_bubble001_001",
    type: "image",
    uri: "https://picsum.photos/seed/sample_post_A1/600/800", // <--- 변경: URL 사용
    uploaderUserId: profileAlice.userId,
    caption: "오늘 친구들과 함께한 멋진 저녁! 🌅 #노을맛집 #우정스타그램",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post_bubble001_002",
    type: "image",
    uri: "https://picsum.photos/seed/sample_post_A2/600/800", // <--- 변경: URL 사용
    uploaderUserId: profileBella.userId,
    caption: "새로 발견한 동네 책방, 분위기 최고! 📚☕️ #책방투어 #힐링타임",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// --- 예시 버블 데이터 ---
export const exampleBubble: Bubble = {
  id: "bubble_group_alpha_789",
  name: "일상 공유 & 맛집 탐방",
  members: [profileAlice, profileBella],
  posts: exampleBubblePosts,
  description:
    "소소한 일상을 공유하고, 함께 맛있는 것을 찾아 떠나는 친구들입니다! 새로운 만남도 환영해요 😊",
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
};

// --- 새로운 프로필 (여성) ---
const profileChloe: ProfileFormData = {
  userId: "user_chloe_003",
  firstName: "Chloe",
  lastName: "Jung",
  age: 25,
  birthDay: "20",
  birthMonth: "03",
  birthYear: "1999",
  height: 162,
  mbti: "ENFP",
  gender: "Woman",
  genderVisibleOnProfile: true,
  aboutMe: "예술과 디자인에 관심 많아요. 같이 전시회 보러 갈 친구들 찾아요!",
  images: [
    { uri: "https://picsum.photos/seed/chloe_profile1/400/400" },
    { uri: "https://picsum.photos/seed/chloe_profile2/400/400" },
    null,
    null,
    null,
    null,
  ],
};

const profileDana: ProfileFormData = {
  userId: "user_dana_004",
  firstName: "Dana",
  lastName: "Lim",
  age: 26,
  birthDay: "05",
  birthMonth: "11",
  birthYear: "1998",
  height: 168,
  mbti: "ISTJ",
  gender: "Woman",
  genderVisibleOnProfile: false,
  aboutMe:
    "조용히 책 읽거나 영화 보는 거 좋아해요. 비슷한 취미 가진 분들과 소통하고 싶어요.",
  images: [
    { uri: "https://picsum.photos/seed/dana_profile/400/400" },
    null,
    null,
    null,
    null,
    null,
  ],
};

const profileElla: ProfileFormData = {
  userId: "user_ella_005",
  firstName: "Ella",
  lastName: "Bae",
  age: 22,
  birthDay: "30",
  birthMonth: "08",
  birthYear: "2002",
  height: 172,
  mbti: "ESFP",
  gender: "Woman",
  genderVisibleOnProfile: true,
  aboutMe: "활동적인 거라면 뭐든 좋아요! 주말마다 새로운 액티비티 도전 중!",
  images: [
    { uri: "https://picsum.photos/seed/ella_profile1/400/400" },
    { uri: "https://picsum.photos/seed/ella_profile2/400/400" },
    { uri: "https://picsum.photos/seed/ella_profile3/400/400" },
    null,
    null,
    null,
  ],
};

const profileFiona: ProfileFormData = {
  userId: "user_fiona_006",
  firstName: "Fiona",
  lastName: "Song",
  age: 27,
  birthDay: "12",
  birthMonth: "01",
  birthYear: "1997",
  height: 160,
  mbti: "INTJ",
  gender: "Woman",
  genderVisibleOnProfile: true,
  aboutMe:
    "음악과 고양이를 사랑하는 집순이. 하지만 가끔은 특별한 외출도 즐겨요.",
  images: [
    { uri: "https://picsum.photos/seed/fiona_profile/400/400" },
    null,
    null,
    null,
    null,
    null,
  ],
};

// --- 새로운 버블 1을 위한 게시물 ---
const artSoulmatesPosts: BubblePost[] = [
  {
    id: "post_bubble003_001",
    type: "image",
    uri: "https://picsum.photos/seed/artpost_AS1/600/800", // <--- 변경: URL 사용
    uploaderUserId: profileChloe.userId,
    caption:
      "오늘 다녀온 전시회, 색감이 너무 예뻤다 💖 #미술관 #주말나들이 #영감",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post_bubble003_002",
    type: "image",
    uri: "https://picsum.photos/seed/artpost_AS2/600/800", // <--- 변경: URL 사용
    uploaderUserId: profileDana.userId,
    caption:
      "직접 만든 도자기! 생각보다 어렵지만 재밌었음 😊 #도예공방 #취미생활",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// --- 새로운 버블 1 ("Art & Soulmates") ---
const bubbleArtSoulmates: Bubble = {
  id: "bubble_group_gamma_456",
  name: "Art & Soulmates 🎨",
  members: [profileChloe, profileDana],
  posts: artSoulmatesPosts,
  description:
    "예술을 사랑하는 사람들의 소소한 이야기와 작품 공유. 함께 영감을 나눠요!",
  createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
};

// --- 새로운 버블 2를 위한 게시물 ---
const cityAdventurersPosts: BubblePost[] = [
  {
    id: "post_bubble004_001",
    type: "image",
    uri: "https://picsum.photos/seed/citypost_CA1/600/800", // <--- 변경: URL 사용
    uploaderUserId: profileElla.userId,
    caption:
      "도심 속 숨겨진 루프탑 바에서 야경 감상! 🌃 #서울야경 #루프탑 #불금",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post_bubble004_002",
    type: "image",
    uri: "https://picsum.photos/seed/citypost_CA2/600/800", // <--- 변경: URL 사용
    uploaderUserId: profileFiona.userId,
    caption:
      "자전거 타고 공원 한 바퀴! 날씨가 다했다 🚲 #자전거라이딩 #공원산책",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// --- 새로운 버블 2 ("City Adventurers") ---
const bubbleCityAdventurers: Bubble = {
  id: "bubble_group_delta_789",
  name: "City Adventurers 🏙️🚴‍♀️",
  members: [profileElla, profileFiona],
  posts: cityAdventurersPosts,
  description: "도시의 새로운 매력을 발견하고 액티비티를 즐기는 모험가들!",
  createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
};

// --- 기존 Charlie 버블 ---
const profileCharlie: ProfileFormData = {
  // Charlie 프로필도 정의해주는 것이 좋음
  userId: "user_charlie_007",
  firstName: "Charlie",
  lastName: "Lee",
  age: 25,
  birthDay: "01",
  birthMonth: "01",
  birthYear: "1999",
  height: 178,
  mbti: "ENTP",
  gender: "Man",
  genderVisibleOnProfile: true,
  aboutMe: "전략적인 보드게임과 토론을 즐깁니다!",
  images: [
    { uri: "https://picsum.photos/seed/charlie7_profile/400/400" },
    null,
    null,
    null,
    null,
    null,
  ],
};

const charlieBubblePosts: BubblePost[] = [
  {
    id: "post_bubble002_001",
    type: "image",
    uri: "https://picsum.photos/seed/boardgame_CB1/600/800", // <--- 변경: URL 사용
    uploaderUserId: "user_charlie_007",
    caption: "오늘 보드게임 대승! 🏆 #보드게임 #주말순삭",
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

const bubbleBoardGames: Bubble = {
  // 변수 이름 명확화
  id: "bubble_group_beta_123",
  name: "주말엔 보드게임이지!",
  members: [profileCharlie], // Charlie 프로필 사용
  posts: charlieBubblePosts,
  description: "매주 모여서 다양한 보드게임을 즐기는 모임입니다. 초보도 환영!",
  createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
};

// Explore 화면에서 여러 버블을 보여주기 위한 목업 데이터 배열
export const mockBubbles: Bubble[] = [
  exampleBubble,
  bubbleBoardGames, // 이름 변경된 변수 사용
  bubbleArtSoulmates,
  bubbleCityAdventurers,
];
