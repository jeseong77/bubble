import React, { use } from 'react';
import { View, Text, SafeAreaView, StyleSheet } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

function message() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[,{color: colors.onBackground}]}>
        This is messanger
      </Text>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default message;