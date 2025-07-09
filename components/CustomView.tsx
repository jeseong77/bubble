// components/CustomView.tsx
import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/useAppTheme";

interface CustomViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  useSafeAreaTop?: boolean;
}

const CustomView: React.FC<CustomViewProps> = ({
  children,
  style,
  useSafeAreaTop = false,
}) => {
  const { colors } = useAppTheme();

  const RootElement = useSafeAreaTop ? SafeAreaView : View;
  const rootElementProps = useSafeAreaTop
    ? { edges: ["top"] as ReadonlyArray<Edge> }
    : {};

  return (
    <RootElement
      style={[styles.rootView, { backgroundColor: colors.white }, style]}
      {...rootElementProps}
    >
      <View style={styles.contentWrapper}>{children}</View>
    </RootElement>
  );
};

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
});

export default CustomView;
