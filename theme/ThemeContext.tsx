// src/theme/ThemeContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  useColorScheme as useSystemColorScheme,
  Appearance,
} from "react-native";
import { Colors } from "@/constants/Colors";

// AppColorRoles 타입을 Colors.light (또는 Colors.dark) 기준으로 정의
// 라이트와 다크 모드의 색상 키(역할)는 동일해야 합니다.
export type AppColorRoles = typeof Colors.light;

// 사용자의 테마 선호도 타입
export type ColorPreference = "system" | "light" | "dark";

export interface ThemeContextData {
  colors: AppColorRoles; // 현재 적용된 색상 팔레트
  colorScheme: "light" | "dark"; // 현재 활성화된 색상 모드 ('light' 또는 'dark')
  isDark: boolean; // 현재 다크 모드인지 여부
  userPreference: ColorPreference; // 사용자의 테마 설정 선호도
  setColorPreference: (preference: ColorPreference) => void; // 사용자 선호도 변경 함수
}

// 컨텍스트 생성
// 기본값은 Provider 외부에서 접근 시 에러를 발생시키기 위해 undefined로 설정하거나,
// 실제 Provider에서 제공하는 값으로 초기화할 수 있습니다.
export const ThemeContext = createContext<ThemeContextData | undefined>(
  undefined
);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useSystemColorScheme(); // 시스템의 현재 색상 스킴 ('light', 'dark', or null/undefined)

  // 사용자의 테마 선호도 상태. 초기값은 'system'입니다.
  // 앱을 종료했다 다시 켜도 설정을 유지하려면 AsyncStorage 등에 이 값을 저장하고 불러와야 합니다.
  const [userPreference, setUserPreference] =
    useState<ColorPreference>("system");

  // 실제 앱에 적용될 색상 스킴 ('light' 또는 'dark')
  const [activeColorScheme, setActiveColorScheme] = useState<"light" | "dark">(
    () => {
      if (userPreference === "system") {
        return systemColorScheme === "dark" ? "dark" : "light";
      }
      return userPreference; // 'light' 또는 'dark'
    }
  );

  // 시스템 색상 스킴이 변경되거나 사용자의 선호도가 변경될 때 activeColorScheme을 업데이트합니다.
  useEffect(() => {
    let newSchemeToApply: "light" | "dark";
    if (userPreference === "system") {
      newSchemeToApply = systemColorScheme === "dark" ? "dark" : "light";
    } else {
      newSchemeToApply = userPreference; // 사용자가 'light' 또는 'dark'를 직접 선택한 경우
    }

    if (newSchemeToApply !== activeColorScheme) {
      console.log(
        `ThemeProvider: Updating activeColorScheme to '${newSchemeToApply}'. (User Preference: '${userPreference}', System Scheme: '${systemColorScheme}')`
      );
      setActiveColorScheme(newSchemeToApply);
    }
  }, [systemColorScheme, userPreference, activeColorScheme]);

  // 현재 활성화된 색상 스킴에 따라 Colors.ts에서 적절한 색상 팔레트를 선택합니다.
  const currentColors =
    activeColorScheme === "dark" ? Colors.dark : Colors.light;
  const isDark = activeColorScheme === "dark";

  // 사용자가 테마 선호도를 변경할 수 있는 함수
  const setColorPreference = useCallback((preference: ColorPreference) => {
    console.log("ThemeProvider: User color preference set to:", preference);
    setUserPreference(preference);
    // userPreference 상태가 변경되면 위의 useEffect가 activeColorScheme을 자동으로 업데이트합니다.
  }, []);

  const themeValue: ThemeContextData = {
    colors: currentColors,
    colorScheme: activeColorScheme,
    isDark: isDark,
    userPreference: userPreference,
    setColorPreference: setColorPreference,
  };

  return (
    <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
  );
};
