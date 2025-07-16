import React, { useState, useEffect } from "react"; // useEffect 추가
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { supabase } from "@/lib/supabase"; // supabase 클라이언트 추가

export default function BubbleFormScreen() {
  const router = useRouter();

  // 이전 화면에서 전달된 파라미터 가져오기
  const {
    groupId, // groupId를 받음
    bubbleSize: bubbleSizeParam,
    creatorId,
    creatorFirstName,
    creatorImagePath, // 이미지 경로를 받음
  } = useLocalSearchParams<{
    groupId: string;
    bubbleSize: string;
    creatorId: string;
    creatorFirstName: string;
    creatorImagePath?: string;
  }>();

  // 버블 이름은 이 화면에서 관리
  const [bubbleName, setBubbleName] = useState("");
  const [creatorSignedUrl, setCreatorSignedUrl] = useState<string | null>(null); // 이미지 URL 상태 추가

  // 전달받은 버블 크기 파라미터를 숫자로 변환
  const bubbleMemberCount = parseInt(bubbleSizeParam || "2", 10);

  // 이미지 경로를 받아 새로운 Signed URL을 생성하는 로직
  useEffect(() => {
    if (creatorImagePath) {
      const getSignedUrl = async () => {
        const { data, error } = await supabase.storage
          .from("user-images")
          .createSignedUrl(creatorImagePath, 60); // 60초 유효한 새 URL 생성

        if (error) {
          console.error("Error creating signed URL for creator image:", error);
        } else {
          setCreatorSignedUrl(data.signedUrl);
        }
      };
      getSignedUrl();
    }
  }, [creatorImagePath]);

  // ... (기존 bubbleSize 계산 로직)
  const screenWidth = Dimensions.get("window").width;
  const totalBubblesWidth = screenWidth * 0.9;
  const overlapRatio = 0.18;
  const bubbleSize =
    totalBubblesWidth /
    (bubbleMemberCount - (bubbleMemberCount - 1) * overlapRatio);
  const overlapOffset = bubbleSize * (1 - overlapRatio);

  const handleInviteFriend = async () => {
    if (!bubbleName.trim()) {
      alert("버블 이름을 입력해주세요.");
      return;
    }

    try {
      // 버블 이름을 서버에 업데이트
      const { error } = await supabase
        .from("groups")
        .update({ name: bubbleName })
        .eq("id", groupId);

      if (error) throw error;

      // TODO: 실제 친구 초대 화면 경로로 수정 필요
      router.push({
        pathname: "/bubble/form",
        params: {
          groupId,
          bubbleName,
          bubbleSize: bubbleSizeParam,
          creatorId,
        },
      });
    } catch (error) {
      console.error("Error updating bubble name:", error);
      alert("버블 이름 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "android" ? -100 : 0}
      >
        <View style={styles.topSection}>
          <TextInput
            style={styles.titleInput}
            placeholder="Name your bubble"
            value={bubbleName}
            onChangeText={setBubbleName}
            placeholderTextColor="#999"
            autoFocus={true}
          />
        </View>

        <View
          style={{
            width: totalBubblesWidth,
            height: bubbleSize * 1.2,
            alignSelf: "center",
            marginBottom: 40,
            position: "relative",
          }}
        >
          <View
            style={[
              styles.bubbleContainer,
              {
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: 2,
                alignItems: "center",
              },
            ]}
          >
            {creatorSignedUrl ? (
              <Image
                source={{ uri: creatorSignedUrl }}
                style={[
                  styles.bubbleImage,
                  {
                    width: bubbleSize,
                    height: bubbleSize,
                    borderRadius: bubbleSize / 2,
                    marginBottom: 0,
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.bubbleImage,
                  {
                    width: bubbleSize,
                    height: bubbleSize,
                    borderRadius: bubbleSize / 2,
                    marginBottom: 0,
                    backgroundColor: "#e0e0e0",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Feather name="user" size={bubbleSize * 0.4} color="#999" />
              </View>
            )}
            <Text style={[styles.nameText, { marginTop: 12 }]}>
              {creatorFirstName || "Me"}
            </Text>
          </View>

          {/* 친구 초대 슬롯 (동적 생성) */}
          {Array.from({ length: bubbleMemberCount - 1 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.bubbleContainer,
                {
                  position: "absolute",
                  left: (index + 1) * overlapOffset,
                  top: 0,
                  zIndex: 1 - index, // zIndex를 다르게 주어 겹치게 함
                  alignItems: "center",
                },
              ]}
            >
              <View
                style={[
                  styles.emptyBubble,
                  {
                    width: bubbleSize,
                    height: bubbleSize,
                    borderRadius: bubbleSize / 2,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Feather name="plus" size={32} color="#999" />
              </View>
              <Text style={[styles.nameText, { marginTop: 12, color: "#999" }]}>
                Invite Friend
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.inviteButton}
          onPress={handleInviteFriend}
          activeOpacity={0.7}
        >
          <Text style={styles.inviteButtonText}>Invite Friend</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>✕</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  topSection: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 32,
    width: "90%",
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#5A99E5",
    paddingVertical: 8,
    width: "100%",
  },
  bubbleContainer: {
    alignItems: "center",
  },
  bubbleImage: {
    borderWidth: 2,
    borderColor: "#eee",
  },
  nameText: {
    fontSize: 20,
    color: "#222",
    marginTop: 4,
  },
  emptyBubble: {
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  inviteButton: {
    backgroundColor: "#5A99E5",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    position: "absolute",
    left: 32,
    bottom: 48,
    backgroundColor: "#8ec3ff",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    lineHeight: 40,
  },
});
