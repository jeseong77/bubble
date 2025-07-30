import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

const { width } = Dimensions.get("window");

interface UserImage {
  id: number;
  image_url: string;
  position: number;
}

interface UserDetail {
  id: string;
  phone_number?: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  height_cm?: number;
  mbti?: string;
  gender?: string;
  preferred_gender?: string;
  bio?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  profile_setup_completed?: boolean;
  images: UserImage[];
}

export default function UserDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  
  const [userData, setUserData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔍 DEBUG: 전달된 userId 확인
  console.log("=== 👤 USER DETAIL DEBUG ===");
  console.log("userId:", userId);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        setError("No user ID provided");
        setLoading(false);
        return;
      }

      try {
        console.log("=== 🔍 FETCHING USER DATA WITH RPC ===");
        console.log("Fetching user with ID:", userId);
        
        const { data, error } = await supabase.rpc('fetch_user', {
          p_user_id: userId
        });

        if (error) {
          console.error("Error fetching user:", error);
          setError("Failed to fetch user data");
          setLoading(false);
          return;
        }

        console.log("=== ✅ USER DATA FETCHED ===");
        console.log("User data:", data);
        console.log("=== 📋 DETAILED USER DATA ANALYSIS ===");
        console.log("Raw RPC response:", JSON.stringify(data, null, 2));
        console.log("User ID:", data?.id);
        console.log("First Name:", data?.first_name);
        console.log("Last Name:", data?.last_name);
        console.log("Birth Date:", data?.birth_date);
        console.log("Height CM:", data?.height_cm);
        console.log("MBTI:", data?.mbti);
        console.log("Gender:", data?.gender);
        console.log("Bio:", data?.bio);
        console.log("Location:", data?.location);
        console.log("Images count:", data?.images?.length || 0);
        console.log("Images:", data?.images);
        console.log("Profile Setup Completed:", data?.profile_setup_completed);
        setUserData(data);
      } catch (err) {
        console.error("Exception fetching user:", err);
        setError("Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleBack = () => {
    router.back();
  };

  // 나이 계산 함수
  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#8ec3ff" />
          <Text style={styles.loadingText}>Loading user profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Not Found</Text>
        </View>
        <View style={styles.container}>
          <Text style={styles.errorText}>{error || "User data not available"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(userData.birth_date);
  const mainImage = userData.images && userData.images.length > 0 ? userData.images[0].image_url : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {userData.first_name} {age}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {mainImage && (
          <Image source={{ uri: mainImage }} style={styles.profileImage} />
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{userData.height_cm ? `${userData.height_cm}cm` : "N/A"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{userData.mbti || "N/A"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{userData.location || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.bioContainer}>
          <Text style={styles.bioText}>"{userData.bio || "No bio available"}"</Text>
        </View>

        {/* 추가 이미지들 */}
        {userData.images && userData.images.length > 1 && (
          <View style={styles.additionalImagesContainer}>
            {userData.images.slice(1).map((image, index) => (
              <Image 
                key={image.id} 
                source={{ uri: image.image_url }} 
                style={styles.additionalImage} 
              />
            ))}
          </View>
        )}
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
  },
  errorText: {
    fontSize: 16,
    color: "#ff6b6b",
    textAlign: "center",
    paddingVertical: 20,
  },
  additionalImagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
    gap: 10,
  },
  additionalImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
});
