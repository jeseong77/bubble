import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function UserDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse user data from route params
  const userId = params.userId as string;
  const name = params.name as string;
  const age = params.age as string;
  const mbti = params.mbti as string;
  const height = params.height as string;
  const location = params.location as string;
  const bio = params.bio as string;
  const images = JSON.parse(params.images as string) as string[];

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {name} {age}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* First image */}
        <Image source={{ uri: images[0] }} style={styles.profileImage} />

        {/* Height, MBTI, Location info */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{height}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{mbti}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{location}</Text>
          </View>
        </View>

        {/* Second image */}
        <Image source={{ uri: images[1] }} style={styles.profileImage} />

        {/* Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioText}>"{bio}"</Text>
        </View>

        {/* Third image */}
        <Image source={{ uri: images[2] }} style={styles.profileImage} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
    color: "#333",
  },
  container: {
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  profileImage: {
    width: width - 30,
    height: width - 30,
    borderRadius: 12,
    marginTop: 20,
    backgroundColor: "#f0f0f0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginVertical: 20,
    gap: 50,
  },
  infoBox: {},
  infoText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  bioContainer: {
    width: "100%",
    maxWidth: 600,
    marginVertical: 20,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
    textAlign: "center",
  },
});
