import { useCallback } from 'react';
import { Platform, Alert, Dimensions, ViewStyle } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

interface SwipeResponse {
  status: 'matched' | 'liked' | 'passed' | 'error';
  message?: string;
  chat_room_id?: string;
}

interface UseLikesYouAnimationParams {
  isAnimating: boolean;
  setIsAnimating: (value: boolean) => void;
  currentGroupIndex: number;
  setCurrentGroupIndex: (value: number) => void;
  incomingLikesLength: number;
  currentGroupId?: string;
  currentGroupName?: string;
  likeBack: (groupId: string) => Promise<SwipeResponse | undefined>;
  pass: (groupId: string) => Promise<SwipeResponse | undefined>;
  onNavigateToChats: () => void;
}

interface UseLikesYouAnimationReturn {
  translateX: any;
  translateY: any;
  scale: any;
  opacity: any;
  animatedBubbleStyle: any;
  handleSwipe: (direction: 'left' | 'right') => Promise<void>;
  changeBubbleAndAnimateIn: (direction: 'left' | 'right') => void;
}

export function useLikesYouAnimation({
  isAnimating,
  setIsAnimating,
  currentGroupIndex,
  setCurrentGroupIndex,
  incomingLikesLength,
  currentGroupId,
  currentGroupName,
  likeBack,
  pass,
  onNavigateToChats,
}: UseLikesYouAnimationParams): UseLikesYouAnimationReturn {
  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animate and switch bubble data
  const changeBubbleAndAnimateIn = useCallback(
    (direction: 'left' | 'right') => {
      // Handle real data cycling
      const nextIndex = (currentGroupIndex + 1) % incomingLikesLength;
      setCurrentGroupIndex(nextIndex);

      // Handle empty state when no more groups
      if (incomingLikesLength === 0) {
        return;
      }

      // Array bounds check
      if (nextIndex >= incomingLikesLength) {
        setCurrentGroupIndex(0);
        return;
      }

      // Optimized animation timing for real data
      const animationDuration = 350; // Slightly faster for better UX
      const entryX = direction === 'left' ? screenWidth * 0.5 : -screenWidth * 0.5;
      translateX.value = entryX;
      translateY.value = -screenHeight * 0.3;
      scale.value = 0.6;

      // Animate IN to the center with optimized timing
      translateX.value = withTiming(0, { duration: animationDuration });
      translateY.value = withTiming(0, { duration: animationDuration });
      scale.value = withTiming(1, { duration: animationDuration });
      opacity.value = withTiming(1, { duration: animationDuration }, (finished) => {
        if (finished) {
          runOnJS(setIsAnimating)(false);
        }
      });
    },
    [
      incomingLikesLength,
      currentGroupIndex,
      setCurrentGroupIndex,
      setIsAnimating,
      translateX,
      translateY,
      scale,
      opacity,
    ]
  );

  // Handler for X and Heart swipes
  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (isAnimating || !currentGroupId) return;

      // Add haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setIsAnimating(true);

      try {
        if (direction === 'right') {
          // Like back action
          const response = await likeBack(currentGroupId);

          if (response?.status === 'matched') {
            // Enhanced match notification with haptic feedback
            if (Platform.OS === 'ios') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert(
              "It's a Match! 🎉",
              `You and ${currentGroupName} liked each other!`,
              [
                {
                  text: 'Continue Swiping',
                  style: 'default',
                },
                {
                  text: 'View Matches',
                  style: 'default',
                  onPress: () => {
                    onNavigateToChats();
                  },
                },
              ]
            );
          }
        } else {
          // Pass action
          await pass(currentGroupId);
        }
      } catch (error) {
        console.error('Error in handleSwipe:', error);
        setIsAnimating(false);
        return;
      }

      // Animate OUT
      const targetX = direction === 'left' ? -screenWidth * 0.5 : screenWidth * 0.5;
      translateX.value = withTiming(targetX, { duration: 400 });
      translateY.value = withTiming(screenHeight * 0.3, { duration: 400 });
      scale.value = withTiming(0.6, { duration: 400 });
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(changeBubbleAndAnimateIn)(direction);
        }
      });
    },
    [
      isAnimating,
      currentGroupId,
      currentGroupName,
      setIsAnimating,
      likeBack,
      pass,
      onNavigateToChats,
      translateX,
      translateY,
      scale,
      opacity,
      changeBubbleAndAnimateIn,
    ]
  );

  // Unified animated style for the center bubble
  const animatedBubbleStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    } as ViewStyle;
  });

  return {
    translateX,
    translateY,
    scale,
    opacity,
    animatedBubbleStyle,
    handleSwipe,
    changeBubbleAndAnimateIn,
  };
}
