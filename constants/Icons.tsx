// constants/Icons.ts
import React, { JSX } from "react";
import { Ionicons, Entypo, EvilIcons } from "@expo/vector-icons"; // Or your icon library

type IconProps = { size: number; color: string; [key: string]: any };

// It's better to type icons more strictly if you know all the keys
// e.g., export const icons: Record<'index' | 'explore' | 'profile', (props: IconProps) => JSX.Element> & { default?: ... } = {
export const icons: { [key: string]: (props: IconProps) => JSX.Element } = {
  index: (props) => <Entypo name="heart" {...props} />,
  explore: (props) => <Entypo name="feather" {...props} />,
  profile: (props) => <Entypo name="fingerprint" {...props} />,
  default: (props) => <Ionicons name="ellipse-outline" {...props} />,
  message: (props) => <Entypo name="paper-plane" {...props} />,
};
