/**
 * 이 파일은 앱에서 사용되는 색상을 정의합니다. 라이트 모드와 다크 모드 각각에 대해 색상이 정의되어 있습니다.
 * 이 파일은 Material Design 3 컬러 시스템을 기반으로 작성되었습니다.
 * 이번 버전은 사용자가 제공한 새 팔레트를 기반으로 하며, Primary 색상은 차분한 적갈색 계열입니다.
 * 각 색상 역할에 대한 설명은 주석을 참고하세요.
 */

export const Colors = {
  light: {
    // --- Primary Colors (주요 색상) ---
    primary: "#904A43", // 앱의 주요 브랜드 색상. 버튼, 활성 상태 표시 등.
    onPrimary: "#FFFFFF", // Primary 색상 위에 표시되는 텍스트/아이콘.
    primaryContainer: "#FFDAD6", // Primary 색상과 관련된, 덜 강조된 요소의 배경색.
    onPrimaryContainer: "#73332D", // Primary Container 색상 위에 표시되는 텍스트/아이콘.

    // --- Secondary Colors (보조 색상) ---
    secondary: "#775652", // 앱 내에서 부차적인 액션이나 요소를 강조할 때 사용되는 보조 색상.
    onSecondary: "#FFFFFF", // Secondary 색상 위에 표시되는 텍스트/아이콘.
    secondaryContainer: "#FFDAD6", // Secondary 색상과 관련된 요소의 배경색. (제공된 팔레트에서 PrimaryContainer와 동일)
    onSecondaryContainer: "#5D3F3C", // Secondary Container 색상 위에 표시되는 텍스트/아이콘.

    // --- Tertiary Colors (세 번째 강조 색상) ---
    tertiary: "#715B2E", // 보조적인 역할이나 특정 요소를 구분하거나 강조할 때 사용.
    onTertiary: "#FFFFFF", // Tertiary 색상 위에 표시되는 텍스트/아이콘.
    tertiaryContainer: "#FDDFA6", // Tertiary 색상과 관련된 요소의 배경색.
    onTertiaryContainer: "#584419", // Tertiary Container 색상 위에 표시되는 텍스트/아이콘.

    // --- Error Colors (오류 색상) ---
    error: "#BA1A1A", // 오류 상태를 나타내는 색상.
    onError: "#FFFFFF", // Error 색상 위에 표시되는 텍스트/아이콘.
    errorContainer: "#FFDAD6", // Error 관련 컨테이너 배경. (제공된 팔레트에서 PrimaryContainer와 동일)
    onErrorContainer: "#93000A", // Error Container 위에 표시되는 텍스트/아이콘. (제공된 값 사용)

    // --- Background & Surface Colors (배경 및 표면 색상) ---
    background: "#FFF8F7", // 앱 화면의 가장 기본이 되는 배경색. (매우 연한 핑크/베이지 톤)
    onBackground: "#231918", // Background 색상 위에 표시되는 기본 텍스트/아이콘. (어두운 갈색 톤)

    surface: "#FFF8F7", // 카드, 시트 등 UI 컴포넌트의 표면 색상. (Background와 동일)
    onSurface: "#231918", // Surface 색상 위에 표시되는 텍스트/아이콘. (onBackground와 동일)

    surfaceVariant: "#F5DDDA", // Surface 색상의 변형. (연한 핑크/베이지 톤)
    onSurfaceVariant: "#534341", // Surface Variant 위에 표시되는 텍스트/아이콘. (중간톤 갈색)

    // --- Outline Colors (외곽선 색상) ---
    outline: "#857371", // 컴포넌트의 외곽선, 구분선. (중간톤 회갈색)
    outlineVariant: "#D8C2BF", // 더 부드러운 외곽선. (연한 회갈색)

    // --- Utility Colors (유틸리티 색상) ---
    scrim: "#000000", // 다른 콘텐츠를 가리기 위한 반투명 레이어.
    shadow: "#000000", // 그림자 기본 색상.

    // --- Inverse Colors (반전 색상) ---
    inversePrimary: "#FFB4AB", // 어두운 배경(inverseSurface) 위에 사용될 Primary 색상. (연한 산호색/핑크)
    inverseSurface: "#392E2D", // 밝은 테마에서 어두운 배경의 컴포넌트.
    inverseOnSurface: "#FFEDEA", // Inverse Surface 위 텍스트/아이콘.

    surfaceTint: "#904A43", // Primary 색상과 동일. 표면 고도 표현 시 오버레이.
  },
  dark: {
    // --- Primary Colors (주요 색상) ---
    primary: "#FFB4AB", // 다크 모드용 Primary. (연한 산호색/핑크)
    onPrimary: "#561E19", // 다크 모드 Primary 위 텍스트/아이콘. (어두운 적갈색)
    primaryContainer: "#73332D", // 다크 모드 Primary Container. (중간톤 적갈색)
    onPrimaryContainer: "#FFDAD6", // 다크 모드 Primary Container 위 텍스트/아이콘. (매우 연한 핑크)

    // --- Secondary Colors (보조 색상) ---
    secondary: "#E7BDB8", // 다크 모드용 Secondary. (연한 핑크/베이지)
    onSecondary: "#442926",
    secondaryContainer: "#5D3F3C",
    onSecondaryContainer: "#FFDAD6", // (onPrimaryContainer와 동일)

    // --- Tertiary Colors (세 번째 강조 색상) ---
    tertiary: "#E0C38C", // 다크 모드용 Tertiary. (연한 금색/베이지)
    onTertiary: "#3F2E04",
    tertiaryContainer: "#584419",
    onTertiaryContainer: "#FDDFA6",

    // --- Error Colors (오류 색상) ---
    error: "#FFB4AB", // 다크 모드용 Error. (Primary와 동일)
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6", // (onPrimaryContainer와 동일)

    // --- Background & Surface Colors (배경 및 표면 색상) ---
    background: "#1A1110", // 다크 모드 앱 전체 배경. (매우 어두운 적갈색)
    onBackground: "#F1DEDC", // 다크 모드 Background 위 텍스트/아이콘. (매우 연한 핑크/베이지)

    surface: "#1A1110", // 다크 모드 표면 색상. (Background와 동일)
    onSurface: "#F1DEDC", // 다크 모드 Surface 위 텍스트/아이콘. (onBackground와 동일)

    surfaceVariant: "#534341", // 다크 모드 Surface Variant. (어두운 회갈색)
    onSurfaceVariant: "#D8C2BF", // 다크 모드 Surface Variant 위 텍스트/아이콘. (연한 회갈색)

    // --- Outline Colors (외곽선 색상) ---
    outline: "#A08C8A", // 다크 모드 외곽선. (중간톤 회갈색)
    outlineVariant: "#534341", // 다크 모드의 더 부드러운 외곽선. (Surface Variant와 동일)

    // --- Utility Colors (유틸리티 색상) ---
    scrim: "#000000",
    shadow: "#f0f0f0",

    // --- Inverse Colors (반전 색상) ---
    inversePrimary: "#904A43", // 밝은 배경(inverseSurface) 위에 사용될 Primary (라이트 모드의 Primary와 동일).
    inverseSurface: "#F1DEDC", // 어두운 테마에서 밝은 배경의 컴포넌트.
    inverseOnSurface: "#392E2D", // Inverse Surface 위 텍스트/아이콘.

    surfaceTint: "#FFB4AB", // 다크 모드의 Primary 색상과 동일. 표면 고도 표현에 사용.
  },
};
