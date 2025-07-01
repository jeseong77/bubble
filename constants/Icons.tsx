// constants/Icons.ts
import React, { JSX } from "react";
import { Ionicons, Entypo, Feather } from "@expo/vector-icons";

// Icon 컴포넌트가 받을 props 타입 정의
export type IconProps = {
  size: number;
  color: string;
  [key: string]: any;
};

// 벡터 아이콘의 정의만 남겨둡니다.
export const icons: { [key: string]: (props: IconProps) => JSX.Element } = {
  index: (props) => <Feather name="heart" {...props} />,
  search: (props) => <Feather name="search" {...props} />,
  profile: (props) => <Feather name="user" {...props} />,
  message: (props) => <Feather name="message-square" {...props} />,
  default: (props) => <Ionicons name="ellipse-outline" {...props} />,
};
