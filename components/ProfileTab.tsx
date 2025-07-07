import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAppTheme } from "@/hooks/useAppTheme"; // 테마 훅 경로 확인

// 탭 정보 인터페이스
export interface TabInfo {
  id: string;
  title: string;
}

// ProfileTab 컴포넌트 Props 정의
interface ProfileTabProps {
  tabs: TabInfo[];
  activeTabId: string;
  onTabPress: (tabId: string, index: number) => void;
  // 필요하다면 추가적인 스타일 props 등을 받을 수 있습니다.
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// ProfileTab 컨테이너의 좌우 패딩 값, 부모 컴포넌트의 패딩과 일치시키거나 여기서 독립적으로 관리
const TAB_CONTAINER_HORIZONTAL_PADDING = 0; // ProfileScreen의 ScrollView가 패딩을 관리하므로 여기선 0으로 가정
// 만약 이 컴포넌트 자체에 패딩을 주려면 값을 설정

const ProfileTab: React.FC<ProfileTabProps> = ({
  tabs,
  activeTabId,
  onTabPress,
}) => {
  const { colors } = useAppTheme();

  // 각 탭의 너비를 계산합니다. (스크린 너비 - 컨테이너 패딩) / 탭 개수
  // 이 컴포넌트가 ScrollView 바로 아래 전체 너비를 차지한다고 가정합니다.
  // 만약 ProfileScreen의 ScrollView에 paddingHorizontal이 있다면, 그 값을 고려해야 합니다.
  // 여기서는 ProfileTab이 차지하는 유효 너비를 기준으로 계산합니다.
  const TABS_EFFECTIVE_WIDTH =
    SCREEN_WIDTH - TAB_CONTAINER_HORIZONTAL_PADDING * 2;
  const TAB_WIDTH = tabs.length > 0 ? TABS_EFFECTIVE_WIDTH / tabs.length : 0;

  const indicatorPositionX = useSharedValue(0);

  // activeTabId가 변경될 때 인디케이터 위치를 애니메이션으로 업데이트
  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (activeIndex !== -1 && TAB_WIDTH > 0) {
      indicatorPositionX.value = withTiming(activeIndex * TAB_WIDTH, {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }
  }, [activeTabId, tabs, TAB_WIDTH, indicatorPositionX]);

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorPositionX.value }],
    };
  });

  if (tabs.length === 0) {
    return null; // 탭이 없으면 아무것도 렌더링하지 않음
  }

  return (
    <View
      style={[
        styles.tabsContainer,
        {
          backgroundColor: colors.white, // 또는 colors.surfaceContainerLowest 등 테마에 맞는 배경색
          borderBottomColor: colors.mediumGray,
          paddingHorizontal: TAB_CONTAINER_HORIZONTAL_PADDING, // 컨테이너 좌우 패딩 적용
        },
      ]}
    >
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabItem, { width: TAB_WIDTH }]} // 각 탭 아이템에 계산된 너비 적용
          onPress={() => onTabPress(tab.id, index)}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTabId === tab.id ? colors.primary : colors.darkGray,
                fontFamily:
                  activeTabId === tab.id
                    ? "Quicksand-Bold"
                    : "Quicksand-Regular",
              },
            ]}
          >
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
      <Animated.View
        style={[
          styles.tabIndicator,
          { backgroundColor: colors.secondary, width: TAB_WIDTH },
          indicatorAnimatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    // justifyContent는 각 tabItem의 width로 조절되므로 'space-around' 불필요
    borderBottomWidth: 1,
    position: "relative", // 인디케이터의 absolute 포지셔닝 기준
  },
  tabItem: {
    // flex: 1 대신 width를 직접 할당하여 정확한 인디케이터 위치 계산
    paddingVertical: 14, // 탭 높이 조절
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 15, // 폰트 크기 조절 가능
    fontFamily: "Quicksand-Regular",
  },
  tabIndicator: {
    height: 3,
    position: "absolute",
    bottom: -1, // borderBottom위에 표시되도록 (또는 0으로 하여 겹치게)
    // width와 backgroundColor는 인라인 스타일로 적용
    // borderRadius: 1.5, // 필요시
  },
});

export default ProfileTab;
