import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

interface SkeletonCircleProps {
  size: number;
  style?: ViewStyle;
}

interface SkeletonTextProps {
  width?: number | string;
  style?: ViewStyle;
}

interface SkeletonAvatarProps {
  size?: number;
  style?: ViewStyle;
}

const SkeletonBox: React.FC<SkeletonBoxProps> = ({ width = "100%", height = 20, style }) => {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.lightGray,
          width: typeof width === "number" ? width : width,
          height,
        },
        style,
      ]}
    />
  );
};

const SkeletonCircle: React.FC<SkeletonCircleProps> = ({ size, style }) => {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.lightGray,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  );
};

const SkeletonText: React.FC<SkeletonTextProps> = ({ width = "80%", style }) => {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.lightGray,
          width: typeof width === "number" ? width : width,
          height: 16,
          borderRadius: 4,
        },
        style,
      ]}
    />
  );
};

const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({ size = 50, style }) => {
  return <SkeletonCircle size={size} style={style} />;
};

export const Skeleton = {
  Box: SkeletonBox,
  Circle: SkeletonCircle,
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
};

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 8,
    overflow: "hidden",
  },
});
