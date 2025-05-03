import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

interface CustomAppBarProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  backIconName?: IconName;
  backIconSize?: number;
  backIconColor?: string;
  title?: string;
  titleTextStyle?: TextStyle;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
}

const CustomAppBar: React.FC<CustomAppBarProps> = ({
  showBackButton = true,
  onBackPress,
  backIconName = 'chevron-back',
  backIconSize = 24,
  backIconColor = '#000000',
  title,
  titleTextStyle,
  rightComponent,
  style,
}) => {
  const router = useRouter();

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const effectiveBackPress = onBackPress || handleGoBack;

  const renderLeft = () => (
    <View style={styles.buttonPlaceholder}>
      {showBackButton && (
        <TouchableOpacity onPress={effectiveBackPress} style={styles.backButton}>
          <Ionicons name={backIconName} size={backIconSize} color={backIconColor} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRight = () => (
    <View style={styles.buttonPlaceholder}>
      {rightComponent}
    </View>
  );

  return (
    <View style={[styles.appBar, style]}>
      {renderLeft()}
      {title && (
        <Text style={[styles.title, titleTextStyle]} numberOfLines={1}>
          {title}
        </Text>
      )}
      {renderRight()}
    </View>
  );
};

const styles = StyleSheet.create({
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 10,
  },
  buttonPlaceholder: {
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginHorizontal: 5,
  },
});

export default CustomAppBar;