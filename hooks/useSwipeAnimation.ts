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

interface SwipeLimitInfo {
  can_swipe: boolean;
  daily_limit: number;
  reset_time: string;
}

interface SwipeResponse {
  status: 'matched' | 'liked' | 'passed' | 'limit_exceeded' | 'error';
  message?: string;
  chat_room_id?: string;
  swipe_info?: SwipeLimitInfo;
}

interface UseSwipeAnimationParams {
  isAnimating: boolean;
  setIsAnimating: (value: boolean) => void;
  currentGroupIndex: number;
  setCurrentGroupIndex: (value: number) => void;
  matchingGroupsLength: number;
  currentGroupId?: string;
  currentGroupName?: string;
  swipeLimitInfo: SwipeLimitInfo | null;
  likeGroup: (groupId: string) => Promise<SwipeResponse | undefined>;
  passGroup: (groupId: string) => Promise<SwipeResponse | undefined>;
  setRecentMatches: React.Dispatch<React.SetStateAction<string[]>>;
  onNavigateToChats: () => void;
  formatResetTime: (resetTimeISO: string) => string;
}

interface UseSwipeAnimationReturn {
  translateX: any;
  translateY: any;
  scale: any;
  opacity: any;
  animatedBubbleStyle: any;
  handleSwipe: (direction: 'left' | 'right') => Promise<void>;
  changeBubbleAndAnimateIn: (direction: 'left' | 'right') => void;
}

export function useSwipeAnimation({
  isAnimating,
  setIsAnimating,
  currentGroupIndex,
  setCurrentGroupIndex,
  matchingGroupsLength,
  currentGroupId,
  currentGroupName,
  swipeLimitInfo,
  likeGroup,
  passGroup,
  setRecentMatches,
  onNavigateToChats,
  formatResetTime,
}: UseSwipeAnimationParams): UseSwipeAnimationReturn {
  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animate and switch bubble data
  const changeBubbleAndAnimateIn = useCallback(
    (direction: 'left' | 'right') => {
      // Handle empty state when no more groups
      if (matchingGroupsLength === 0) {
        return;
      }

      // Reset to 0 if current index is out of bounds (after group removal)
      let nextIndex = currentGroupIndex;
      if (currentGroupIndex >= matchingGroupsLength) {
        nextIndex = 0;
      }

      setCurrentGroupIndex(nextIndex);

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
      matchingGroupsLength,
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

      // Check if swipes are available before attempting to swipe
      if (swipeLimitInfo && !swipeLimitInfo.can_swipe) {
        Alert.alert(
          'Daily Limit Reached 🚫',
          `You've used all ${swipeLimitInfo.daily_limit} swipes today. ${formatResetTime(swipeLimitInfo.reset_time)}.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Add haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setIsAnimating(true);

      try {
        if (direction === 'right') {
          // Like action
          console.log(`[useSwipeAnimation] Liking group: ${currentGroupName}`);

          const response = await likeGroup(currentGroupId);

          // Handle different response statuses
          if (response?.status === 'limit_exceeded') {
            Alert.alert(
              'Daily Limit Reached 🚫',
              `You've used all your swipes today. ${response.swipe_info?.reset_time ? formatResetTime(response.swipe_info.reset_time) : 'Resets at midnight EST'}.`,
              [{ text: 'OK', style: 'default' }]
            );
            setIsAnimating(false);
            return;
          } else if (response?.status === 'matched') {
            // Enhanced match notification with haptic feedback
            if (Platform.OS === 'ios') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            setRecentMatches((prev) => [...prev, currentGroupId]);
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
                    console.log('Navigate to matches/chats screen. Chat Room ID:', response.chat_room_id);
                    onNavigateToChats();
                  },
                },
              ]
            );
          } else if (response?.status === 'error') {
            Alert.alert('Error', response.message || 'Failed to like group');
            setIsAnimating(false);
            return;
          } else {
            // 'liked' status - normal like without match
            console.log(`[useSwipeAnimation] Liked ${currentGroupName} (no match yet)`);
          }
        } else {
          // Pass action
          console.log(`[useSwipeAnimation] Passing group: ${currentGroupName}`);

          const response = await passGroup(currentGroupId);

          // Handle different response statuses for pass
          if (response?.status === 'limit_exceeded') {
            Alert.alert(
              'Daily Limit Reached 🚫',
              `You've used all your swipes today. ${response.swipe_info?.reset_time ? formatResetTime(response.swipe_info.reset_time) : 'Resets at midnight EST'}.`,
              [{ text: 'OK', style: 'default' }]
            );
            setIsAnimating(false);
            return;
          } else if (response?.status === 'error') {
            Alert.alert('Error', response.message || 'Failed to pass group');
            setIsAnimating(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error in handleSwipe:', error);
        Alert.alert('Error', 'Something went wrong. Please try again.');
        setIsAnimating(false);
        return;
      }

      // Animate OUT (only if swipe was successful)
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
      swipeLimitInfo,
      formatResetTime,
      setIsAnimating,
      likeGroup,
      passGroup,
      setRecentMatches,
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
