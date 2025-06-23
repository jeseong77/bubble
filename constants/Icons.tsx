// constants/Icons.ts
import React, { JSX } from "react";
import { Ionicons, Entypo } from "@expo/vector-icons";

// Icon 컴포넌트가 받을 props 타입 정의
export type IconProps = {
  size: number;
  color: string;
  [key: string]: any;
};

// 벡터 아이콘의 정의만 남겨둡니다.
export const icons: { [key: string]: (props: IconProps) => JSX.Element } = {
  index: (props) => <Entypo name="heart" {...props} />,
  explore: (props) => <Entypo name="feather" {...props} />,
  profile: (props) => <Entypo name="fingerprint" {...props} />,
  message: (props) => <Entypo name="paper-plane" {...props} />,
  default: (props) => <Ionicons name="ellipse-outline" {...props} />,
};
