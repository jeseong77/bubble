import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// .env 파일에 변수가 제대로 설정되었는지 확인합니다.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase URL 또는 Anon Key가 .env 파일에 설정되지 않았습니다. 변수 이름이 EXPO_PUBLIC_으로 시작하는지 확인해주세요."
  );
  console.warn("Using fallback values for development...");
}

// Supabase 클라이언트를 생성합니다.
export const supabase = createClient(
  supabaseUrl || "https://your-project.supabase.co", // Fallback URL
  supabaseAnonKey || "your-anon-key", // Fallback key
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // 토큰 갱신 관련 추가 설정
      flowType: "pkce",
      debug: false, // 개발 모드에서도 디버그 비활성화
    },
  }
);
