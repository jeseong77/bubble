import React from "react";
import { View } from "react-native";

interface SkeletonCircleProps {
  size: number;
  style?: any;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({ size, style }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#f0f0f0",
      },
      style,
    ]}
  />
);

interface SkeletonTextProps {
  width: number;
  height: number;
  style?: any;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ width, height, style }) => (
  <View
    style={[
      {
        width,
        height,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
      },
      style,
    ]}
  />
);
