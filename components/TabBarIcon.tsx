// components/navigation/TabBarIcon.tsx
import React from "react";
import { Image, View } from "react-native";
import { icons } from "@/constants/Icons";

interface TabBarIconProps {
  routeName: string;
  isFocused: boolean;
  color: string;
  size: number;
}

/**
 * routeName과 isFocused 상태에 따라 올바른 아이콘을 렌더링하는 컴포넌트.
 * 아이콘 렌더링에 대한 모든 로직을 이 컴포넌트가 책임집니다.
 */
const TabBarIcon: React.FC<TabBarIconProps> = ({
  routeName,
  isFocused,
  color,
  size,
}) => {
  // 1. 'bubble' 라우트인 경우 이미지 아이콘을 렌더링합니다.
  if (routeName === "bubble") {
    const imageSource = isFocused
      ? require("@/assets/images/vector-blank.png") // 활성
      : require("@/assets/images/vector.png"); // 비활성

    return (
      <Image
        source={imageSource}
        style={{
          width: size,
          height: size,
          tintColor: color, // 이미지 아이콘도 색상 prop을 적용
        }}
        resizeMode="contain"
      />
    );
  }

  // 2. 그 외의 경우, Icons.ts에서 벡터 아이콘을 찾아 렌더링합니다.
  const IconComponent = icons[routeName] || icons.default;

  if (!IconComponent) {
    // 아이콘이 없는 경우를 대비한 플레이스홀더
    return <View style={{ width: size, height: size }} />;
  }

  return <IconComponent size={size} color={color} />;
};

export default TabBarIcon;
