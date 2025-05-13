import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme"; // <--- [추가] 테마 훅 임포트 (경로 확인!)

export interface MobileNumberInputProps {
  phoneNumber: string;
  setPhoneNumber: (text: string) => void;
  countryCode: string;
  onCountryCodePress: () => void;
}

const MobileNumberInputPhase: React.FC<MobileNumberInputProps> = ({
  phoneNumber,
  setPhoneNumber,
  countryCode,
  onCountryCodePress,
}) => {
  const { colors } = useAppTheme(); // <--- [추가] 현재 테마의 색상 가져오기

  return (
    <View style={styles.inputSectionContainer}>
      {/* inputLabel에 동적 텍스트 색상 적용 */}
      <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant }]}>
        Select Region
      </Text>
      <View style={styles.inputRow}>
        <TouchableOpacity
          // countryCodeTouchable에 동적 테두리 하단 색상 적용
          style={[
            styles.countryCodeTouchable,
            { borderBottomColor: colors.outline },
          ]}
          onPress={onCountryCodePress}
        >
          {/* countryCodeText에 동적 텍스트 색상 적용 */}
          <Text style={[styles.countryCodeText, { color: colors.onSurface }]}>
            {countryCode}
          </Text>
          {/* Ionicons에 동적 아이콘 색상 적용 */}
          <Ionicons
            name="chevron-down-outline"
            size={24}
            color={colors.onSurfaceVariant}
          />
        </TouchableOpacity>
        <View style={styles.inputSpacer} />
        <TextInput
          // phoneInput에 동적 스타일(테두리 하단 색상, 텍스트 색상) 적용
          style={[
            styles.phoneInput,
            { borderBottomColor: colors.outline, color: colors.onSurface },
          ]}
          placeholder="Mobile Number"
          // placeholderTextColor에 동적 색상 적용
          placeholderTextColor={colors.onSurfaceVariant}
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          maxLength={15} // 필요에 따라 조절
        />
      </View>
    </View>
  );
};

// StyleSheet.create는 정적 스타일만 포함
const styles = StyleSheet.create({
  inputSectionContainer: {
    width: "100%",
    marginBottom: 46,
  },
  inputLabel: {
    fontFamily: "LeagueSpartan-Regular", // 폰트 로드 확인 필요
    fontSize: 18,
    // color: "#7A7A7A", // 제거됨 (동적 적용)
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end", // TextInput과 TouchableOpacity 높이 맞추기 위함
    // height: 40, // 필요하다면 행 전체에 고정 높이를 줄 수 있음
  },
  countryCodeTouchable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // 내부 요소 수직 중앙 정렬
    width: 99,
    paddingBottom: 4, // TextInput의 paddingBottom과 유사하게 맞춤
    borderBottomWidth: 1,
    // borderBottomColor: "#000000", // 제거됨 (동적 적용)
    // height: '100%', // 부모(inputRow)의 높이가 명확해야 효과적
  },
  countryCodeText: {
    paddingLeft: 10,
    fontFamily: "LeagueSpartan-Regular", // 폰트 로드 확인 필요
    fontSize: 24,
    // color: "#7A7A7A", // 제거됨 (동적 적용)
  },
  inputSpacer: {
    width: 37,
  },
  phoneInput: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 4, // 밑줄과의 간격
    borderBottomWidth: 1,
    // borderBottomColor: "#000000", // 제거됨 (동적 적용)
    fontFamily: "LeagueSpartan-Regular", // 폰트 로드 확인 필요
    fontSize: 24,
    // color: "#000000", // 제거됨 (동적 적용)
    // height: '100%', // 부모(inputRow)의 높이가 명확해야 효과적
  },
});

export default MobileNumberInputPhase;
