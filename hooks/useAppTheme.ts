import { useContext } from "react";
import { ThemeContext, ThemeContextData } from "../theme/ThemeContext";

/**
 * ThemeContext에 쉽게 접근하기 위한 커스텀 훅입니다.
 * 이 훅은 반드시 ThemeProvider 하위의 컴포넌트에서 사용되어야 합니다.
 * 사용 시 현재 테마의 색상(colors), 활성 색상 스킴(colorScheme),
 * 다크 모드 여부(isDark), 사용자 테마 선호도(userPreference),
 * 그리고 사용자 선호도 변경 함수(setColorPreference)를 반환합니다.
 * @returns {ThemeContextData} 현재 테마 컨텍스트 데이터
 * @throws {Error} ThemeProvider 외부에서 사용 시 에러 발생
 */
export function useAppTheme(): ThemeContextData {
  const context = useContext(ThemeContext);

  // ThemeProvider로 감싸져 있지 않은 곳에서 이 훅을 호출하면 context가 undefined일 수 있습니다.
  // 이 경우 에러를 발생시켜 개발자가 문제를 인지하도록 합니다.
  if (context === undefined) {
    throw new Error(
      "useAppTheme must be used within a ThemeProvider. Make sure your component is a descendant of <ThemeProvider />."
    );
  }

  return context;
}
