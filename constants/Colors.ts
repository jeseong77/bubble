/**
 * 이 파일은 앱에서 사용되는 색상을 정의합니다. 라이트 모드와 다크 모드 각각에 대해 색상이 정의되어 있습니다.
 * 이 파일은 Material Design 3 컬러 시스템을 기반으로 작성되었습니다.
 * 각 색상 역할에 대한 설명은 주석을 참고하세요.
 */

export const Colors = {
  light: {
    // --- Primary Colors (주요 색상) ---
    primary: "#006978", // 앱의 주요 브랜드 색상. 버튼, 활성 상태 표시 등 가장 빈번하게 사용되는 인터랙티브 요소에 적용됩니다.
    onPrimary: "#FFFFFF", // Primary 색상 위에 표시되는 텍스트 및 아이콘 색상입니다. (예: Primary 버튼 내부의 텍스트)
    primaryContainer: "#A1EFFC", // Primary 색상보다 덜 강조되지만 관련된 요소의 배경색입니다. (예: 특정 섹션의 배경, 큰 버튼의 배경)
    onPrimaryContainer: "#001F25", // Primary Container 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.

    // --- Secondary Colors (보조 색상) ---
    secondary: "#4A6267", // 앱 내에서 부차적인 액션이나 요소를 강조할 때 사용되는 색상입니다. (예: 필터 칩, 덜 중요한 버튼)
    onSecondary: "#FFFFFF", // Secondary 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.
    secondaryContainer: "#CDE7EC", // Secondary 색상과 관련된 요소의 배경색입니다. Primary Container보다 덜 강조됩니다.
    onSecondaryContainer: "#051F23", // Secondary Container 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.

    // --- Tertiary Colors (세 번째 강조 색상) ---
    tertiary: "#5A5D7E", // 보조적인 역할이나 특정 요소를 구분하거나 강조할 때 사용되는 세 번째 액센트 색상입니다. (예: 프로그레스 바, 특정 아이콘)
    onTertiary: "#FFFFFF", // Tertiary 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.
    tertiaryContainer: "#E0E0FF", // Tertiary 색상과 관련된 요소의 배경색입니다.
    onTertiaryContainer: "#171A37", // Tertiary Container 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.

    // --- Error Colors (오류 색상) ---
    error: "#BA1A1A", // 오류 상태를 나타내는 색상입니다. (예: 오류 메시지, 잘못된 입력 필드 표시)
    onError: "#FFFFFF", // Error 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.
    errorContainer: "#FFDAD6", // Error 색상과 관련된 요소의 배경색입니다. (예: 오류 메시지 배경)
    onErrorContainer: "#410002", // Error Container 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.

    // --- Background & Surface Colors (배경 및 표면 색상) ---
    background: "#FBFCFD", // 앱 화면의 가장 기본이 되는 배경색입니다.
    onBackground: "#191C1D", // Background 색상 위에 표시되는 기본 텍스트 및 아이콘 색상입니다.

    surface: "#F8FAFB", // 카드, 시트, 메뉴 등 UI 컴포넌트의 표면 색상입니다. 일반적으로 Background와 유사하거나 약간의 톤 차이를 가집니다.
    onSurface: "#191C1D", // Surface 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.

    surfaceVariant: "#DAE4E7", // Surface 색상의 변형으로, 덜 중요한 표면이나 컴포넌트의 외곽선 등에 사용됩니다. (예: 입력 필드 배경, 구분선 영역)
    onSurfaceVariant: "#3F484A", // Surface Variant 색상 위에 표시되는 텍스트 및 아이콘 색상입니다. (주로 아이콘, 보조 텍스트, 비활성 요소에 적합)

    // --- Outline Colors (외곽선 색상) ---
    outline: "#6F797B", // 컴포넌트의 외곽선, 구분선 등 장식적인 경계선에 사용됩니다.
    outlineVariant: "#BFC8CB", // 더 부드럽거나 덜 강조된 외곽선에 사용됩니다.

    // --- Utility Colors (유틸리티 색상) ---
    scrim: "#000000", // 화면의 다른 부분을 가리기 위한 반투명 레이어 색상입니다. (예: 모달 뒷배경, Drawer 메뉴 뒤) 실제 사용 시 투명도(alpha) 값과 함께 사용됩니다.
    shadow: "#000000", // 그림자 효과에 사용되는 기본 색상입니다. 실제 사용 시 투명도 값과 함께 사용됩니다.

    // --- Inverse Colors (반전 색상 - 특정 상황에서 대비를 위해 사용) ---
    inversePrimary: "#86D2E1", // 어두운 배경(inverseSurface) 위에 주요 인터랙션을 표시할 때 사용되는 Primary 색상입니다.
    inverseSurface: "#2E3132", // 밝은 테마에서 어두운 배경의 컴포넌트를 표시할 때, 또는 그 반대의 경우 사용됩니다.
    inverseOnSurface: "#F0F1F1", // Inverse Surface 색상 위에 표시되는 텍스트 및 아이콘 색상입니다.

    surfaceTint: "#006978", // Primary 색상과 동일하며, Material 3에서 표면의 고도(elevation)를 나타내기 위해 표면 위에 미묘하게 오버레이되는 색상입니다.
  },
  dark: {
    // --- Primary Colors (주요 색상) ---
    primary: "#86D2E1", // 다크 모드에서의 주요 브랜드 색상. 일반적으로 라이트 모드보다 밝고 채도가 높을 수 있습니다.
    onPrimary: "#00363F", // 다크 모드의 Primary 색상 위에 표시되는 텍스트/아이콘 (충분한 대비 필요).
    primaryContainer: "#004F5A", // 다크 모드의 Primary Container 배경색.
    onPrimaryContainer: "#A1EFFC", // 다크 모드의 Primary Container 위에 표시되는 텍스트/아이콘.

    // --- Secondary Colors (보조 색상) ---
    secondary: "#B1CBD0", // 다크 모드의 보조 색상.
    onSecondary: "#1C3438",
    secondaryContainer: "#324B4F",
    onSecondaryContainer: "#CDE7EC",

    // --- Tertiary Colors (세 번째 강조 색상) ---
    tertiary: "#C3C3EB", // 다크 모드의 세 번째 강조 색상.
    onTertiary: "#2C2F4C",
    tertiaryContainer: "#424563",
    onTertiaryContainer: "#E0E0FF",

    // --- Error Colors (오류 색상) ---
    error: "#FFB4AB", // 다크 모드의 오류 색상.
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6",

    // --- Background & Surface Colors (배경 및 표면 색상) ---
    background: "#191C1D", // 다크 모드의 앱 전체 배경색.
    onBackground: "#E1E3E3", // 다크 모드의 Background 위에 표시되는 텍스트/아이콘.

    surface: "#242829", // 다크 모드의 카드, 시트 등 표면 색상. Background보다 약간 밝거나 다른 톤으로 구분감을 줍니다.
    onSurface: "#E1E3E3", // 다크 모드의 Surface 위에 표시되는 텍스트/아이콘.

    surfaceVariant: "#3F484A", // 다크 모드의 Surface Variant 색상.
    onSurfaceVariant: "#BFC8CB", // 다크 모드의 Surface Variant 위에 표시되는 텍스트/아이콘.

    // --- Outline Colors (외곽선 색상) ---
    outline: "#899295", // 다크 모드의 경계선, 구분선.
    outlineVariant: "#3F484A", // 다크 모드의 더 부드러운 경계선. (Surface Variant와 같을 수도 있음)

    // --- Utility Colors (유틸리티 색상) ---
    scrim: "#000000", // 동일하게 사용되나, 배경이 어두우므로 효과가 다르게 느껴질 수 있음.
    shadow: "#000000", // 그림자는 배경이 어두우면 잘 보이지 않으므로, 다크 모드에서는 고도 표현을 위해 surface 색상 변화를 더 활용함.

    // --- Inverse Colors (반전 색상) ---
    inversePrimary: "#006978", // 밝은 배경(inverseSurface) 위에 주요 인터랙션을 표시할 때 사용 (라이트 모드의 Primary와 동일).
    inverseSurface: "#E1E3E3", // 어두운 테마에서 밝은 배경의 컴포넌트를 표시할 때.
    inverseOnSurface: "#2E3132", // Inverse Surface 위에 표시되는 텍스트/아이콘.

    surfaceTint: "#86D2E1", // 다크 모드의 Primary 색상과 동일하며, 표면의 고도 표현에 사용.
  },
};
