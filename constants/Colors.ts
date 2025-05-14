/**
 * 이 파일은 앱에서 사용되는 색상을 정의합니다. 라이트 모드와 다크 모드 각각에 대해 색상이 정의되어 있습니다.
 * 이 파일은 Material Design 3 컬러 시스템을 기반으로 작성되었습니다.
 * Primary 색상은 사용자가 제공한 #585992 (보라색 계열)을 사용합니다.
 * 각 색상 역할에 대한 설명은 주석을 참고하세요.
 */

export const Colors = {
  light: {
    // --- Primary Colors (주요 색상) ---
    primary: "#585992", // 앱의 주요 브랜드 색상.
    onPrimary: "#FFFFFF", // Primary 색상 위에 표시되는 텍스트/아이콘.
    primaryContainer: "#E2DFFF", // Primary 색상과 관련된, 덜 강조된 요소의 배경색.
    onPrimaryContainer: "#14134A", // Primary Container 색상 위에 표시되는 텍스트/아이콘. (제공된 팔레트의 onPrimaryFixed 사용, #414178도 가능)

    // --- Secondary Colors (보조 색상) ---
    secondary: "#5D5C72", // 앱 내에서 부차적인 액션이나 요소를 강조.
    onSecondary: "#FFFFFF", // Secondary 색상 위에 표시되는 텍스트/아이콘.
    secondaryContainer: "#E2E0F9", // Secondary 색상과 관련된 요소의 배경색.
    onSecondaryContainer: "#1A1A2C", // Secondary Container 색상 위에 표시되는 텍스트/아이콘. (제공된 팔레트의 onSecondaryFixed 사용, #454559도 가능)

    // --- Tertiary Colors (세 번째 강조 색상) ---
    tertiary: "#795369", // 보조적인 역할이나 특정 요소를 구분하거나 강조.
    onTertiary: "#FFFFFF", // Tertiary 색상 위에 표시되는 텍스트/아이콘.
    tertiaryContainer: "#FFD8EB", // Tertiary 색상과 관련된 요소의 배경색.
    onTertiaryContainer: "#2F1124", // Tertiary Container 색상 위에 표시되는 텍스트/아이콘. (제공된 팔레트의 onTertiaryFixed 사용, #5F3C51도 가능)

    // --- Error Colors (오류 색상) ---
    error: "#BA1A1A", // 오류 상태를 나타내는 색상.
    onError: "#FFFFFF", // Error 색상 위에 표시되는 텍스트/아이콘.
    errorContainer: "#FFDAD6", // Error 관련 컨테이너 배경.
    onErrorContainer: "#410002", // Error Container 위에 표시되는 텍스트/아이콘. (제공된 팔레트의 #93000A는 너무 어두울 수 있어 조정)

    // --- Background & Surface Colors (배경 및 표면 색상) ---
    background: "#FCF8FF", // 앱 화면의 가장 기본이 되는 배경색.
    onBackground: "#1B1B21", // Background 색상 위에 표시되는 기본 텍스트/아이콘.

    surface: "#FCF8FF", // 카드, 시트 등 UI 컴포넌트의 표면 색상. (Background와 동일)
    onSurface: "#1B1B21", // Surface 색상 위에 표시되는 텍스트/아이콘.

    surfaceVariant: "#E4E1EC", // Surface 색상의 변형. (탭바 배경 등으로 사용 가능)
    onSurfaceVariant: "#47464F", // Surface Variant 위에 표시되는 텍스트/아이콘.

    // --- Outline Colors (외곽선 색상) ---
    outline: "#777680", // 컴포넌트의 외곽선, 구분선.
    outlineVariant: "#C8C5D0", // 더 부드러운 외곽선.

    // --- Utility Colors (유틸리티 색상) ---
    scrim: "#000000", // 다른 콘텐츠를 가리기 위한 반투명 레이어.
    shadow: "#000000", // 그림자 기본 색상.

    // --- Inverse Colors (반전 색상) ---
    inversePrimary: "#C1C1FF", // 어두운 배경(inverseSurface) 위에 사용될 Primary 색상.
    inverseSurface: "#303036", // 밝은 테마에서 어두운 배경의 컴포넌트.
    inverseOnSurface: "#F3EFF7", // Inverse Surface 위 텍스트/아이콘.

    surfaceTint: "#585992", // Primary 색상과 동일. 표면 고도 표현 시 오버레이.

    // --- 추가된 Material 3 Surface Container 역할 (필요시 사용) ---
    // 이 색상들은 UI의 계층 구조를 더 세밀하게 표현하는 데 사용됩니다.
    // 예를 들어 CustomTabBar의 배경으로 surfaceContainerLow 또는 surfaceContainer를 사용할 수 있습니다.
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#F6F2FA", // background보다 약간 더 톤이 있는 표면
    surfaceContainer: "#F0ECF4", // 기본 표면 컨테이너
    surfaceContainerHigh: "#EAE7EF", // 더 높은 고도의 표면
    surfaceContainerHighest: "#E4E1E9", // 가장 높은 고도의 표면 (surfaceVariant와 유사)
  },
  dark: {
    // --- Primary Colors (주요 색상) ---
    primary: "#C1C1FF", // 다크 모드용 Primary.
    onPrimary: "#2A2A60", // 다크 모드 Primary 위 텍스트/아이콘.
    primaryContainer: "#414178", // 다크 모드 Primary Container.
    onPrimaryContainer: "#E2DFFF", // 다크 모드 Primary Container 위 텍스트/아이콘.

    // --- Secondary Colors (보조 색상) ---
    secondary: "#C6C4DD", // 다크 모드용 Secondary.
    onSecondary: "#2F2F42",
    secondaryContainer: "#454559",
    onSecondaryContainer: "#E2E0F9",

    // --- Tertiary Colors (세 번째 강조 색상) ---
    tertiary: "#E9B9D2", // 다크 모드용 Tertiary.
    onTertiary: "#46263A",
    tertiaryContainer: "#5F3C51",
    onTertiaryContainer: "#FFD8EB",

    // --- Error Colors (오류 색상) ---
    error: "#FFB4AB", // 다크 모드용 Error.
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6",

    // --- Background & Surface Colors (배경 및 표면 색상) ---
    background: "#131318", // 다크 모드 앱 전체 배경.
    onBackground: "#E4E1E9", // 다크 모드 Background 위 텍스트/아이콘.

    surface: "#131318", // 다크 모드 표면 색상. (Background와 동일)
    onSurface: "#E4E1E9", // 다크 모드 Surface 위 텍스트/아이콘.

    surfaceVariant: "#47464F", // 다크 모드 Surface Variant.
    onSurfaceVariant: "#C8C5D0", // 다크 모드 Surface Variant 위 텍스트/아이콘.

    // --- Outline Colors (외곽선 색상) ---
    outline: "#918F9A", // 다크 모드 외곽선.
    outlineVariant: "#47464F", // 다크 모드의 더 부드러운 외곽선. (Surface Variant와 동일)

    // --- Utility Colors (유틸리티 색상) ---
    scrim: "#000000",
    shadow: "#000000", // 다크 모드 그림자도 어둡게 (투명도로 조절)

    // --- Inverse Colors (반전 색상) ---
    inversePrimary: "#585992", // 밝은 배경(inverseSurface) 위에 사용될 Primary (라이트 모드의 Primary와 동일).
    inverseSurface: "#E4E1E9", // 어두운 테마에서 밝은 배경의 컴포넌트.
    inverseOnSurface: "#303036", // Inverse Surface 위 텍스트/아이콘.

    surfaceTint: "#C1C1FF", // 다크 모드의 Primary 색상과 동일.

    // --- 추가된 Material 3 Surface Container 역할 (필요시 사용) ---
    surfaceContainerLowest: "#0E0E13",
    surfaceContainerLow: "#1B1B21", // background보다 약간 더 밝거나 톤이 있는 표면
    surfaceContainer: "#1F1F25", // 기본 표면 컨테이너
    surfaceContainerHigh: "#2A292F", // 더 높은 고도의 표면
    surfaceContainerHighest: "#35343A", // 가장 높은 고도의 표면
  },
};
