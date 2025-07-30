import React, { useState, useEffect } from "react";
import {
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
import styled from "@emotion/native";
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
    try {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error("Error calculating age:", error);
      return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaContainer>
        <HeaderBar>
          <BackButton onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </BackButton>
          <HeaderTitle>Loading...</HeaderTitle>
        </HeaderBar>
        <LoadingContainer>
          <ActivityIndicator size="large" color="#8ec3ff" />
          <LoadingText>Loading user profile...</LoadingText>
        </LoadingContainer>
      </SafeAreaContainer>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaContainer>
        <HeaderBar>
          <BackButton onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </BackButton>
          <HeaderTitle>User Not Found</HeaderTitle>
        </HeaderBar>
        <Container>
          <ErrorText>{error || "User data not available"}</ErrorText>
        </Container>
      </SafeAreaContainer>
    );
  }

  const age = calculateAge(userData.birth_date);
  const mainImage = userData.images && userData.images.length > 0 ? userData.images[0].image_url : null;

  return (
    <SafeAreaContainer>
      <HeaderBar>
        <BackButton onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </BackButton>
        <HeaderTitle>
          {userData.first_name} {age || "N/A"}
        </HeaderTitle>
      </HeaderBar>

      <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 20, paddingHorizontal: 15 }}>
        {mainImage ? (
          <Image 
            source={{ uri: mainImage }} 
            style={{
              width: width - 30,
              height: width - 30,
              borderRadius: 12,
              marginTop: 20,
              backgroundColor: "#f0f0f0",
            }}
          />
        ) : (
          <NoImageContainer>
            <NoImageText>No profile image available</NoImageText>
          </NoImageContainer>
        )}

        <InfoRow>
          <InfoBox>
            <InfoText>{userData.height_cm ? `${userData.height_cm}cm` : "N/A"}</InfoText>
          </InfoBox>
          <InfoBox>
            <InfoText>{userData.mbti || "N/A"}</InfoText>
          </InfoBox>
          <InfoBox>
            <InfoText>{userData.location || "N/A"}</InfoText>
          </InfoBox>
        </InfoRow>

        {/* 두 번째 이미지 - 자기소개 위에 배치 */}
        {userData.images && userData.images.length > 1 && (
          <SecondImageContainer>
            <Image 
              source={{ uri: userData.images[1].image_url }} 
              style={{
                width: width - 30,
                height: width - 30,
                borderRadius: 12,
                marginTop: 20,
                backgroundColor: "#f0f0f0",
              }}
            />
          </SecondImageContainer>
        )}

        <BioContainer>
          <BioText>"{userData.bio || "No bio available"}"</BioText>
        </BioContainer>

        {/* 세 번째 이미지부터 - 자기소개 아래에 배치 */}
        {userData.images && userData.images.length > 2 && (
          <AdditionalImagesContainer>
            {userData.images.slice(2).map((image, index) => (
              <Image 
                key={image.id} 
                source={{ uri: image.image_url }} 
                style={{
                  width: width - 30,
                  height: width - 30,
                  borderRadius: 12,
                  marginTop: 20,
                  backgroundColor: "#f0f0f0",
                }}
              />
            ))}
          </AdditionalImagesContainer>
        )}
      </ScrollView>
    </SafeAreaContainer>
  );
}

// Styled Components
const SafeAreaContainer = styled.SafeAreaView`
  flex: 1;
  background-color: #fff;
  padding-top: ${Platform.OS === "android" ? 25 : 0}px;
`;

const HeaderBar = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 15px;
  padding-vertical: 10px;
  border-bottom-width: 1px;
  border-bottom-color: #eee;
`;

const BackButton = styled.TouchableOpacity`
  padding: 5px;
`;

const HeaderTitle = styled.Text`
  font-size: 18px;
  font-weight: 600;
  margin-left: 10px;
  color: #333;
`;

const Container = styled.View`
  align-items: center;
  padding-bottom: 20px;
  padding-horizontal: 15px;
`;

const InfoRow = styled.View`
  flex-direction: row;
  justify-content: center;
  width: 100%;
  margin-top: 20px;
  gap: 50px;
`;

const InfoBox = styled.View``;

const InfoText = styled.Text`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const BioContainer = styled.View`
  width: 100%;
  max-width: 600px;
  margin-top: 20px;
`;

const BioText = styled.Text`
  font-size: 15px;
  line-height: 22px;
  color: #555;
  text-align: center;
`;

const LoadingContainer = styled.View`
  justify-content: center;
  align-items: center;
  padding-vertical: 50px;
`;

const LoadingText = styled.Text`
  font-size: 16px;
  color: #888;
`;

const ErrorText = styled.Text`
  font-size: 16px;
  color: #ff6b6b;
  text-align: center;
  padding-vertical: 20px;
`;

const AdditionalImagesContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 16px;
  gap: 10px;
`;

const SecondImageContainer = styled.View``;

const NoImageContainer = styled.View`
  width: ${width - 30}px;
  height: ${width - 30}px;
  border-radius: 12px;
  margin-top: 20px;
  background-color: #f0f0f0;
  justify-content: center;
  align-items: center;
`;

const NoImageText = styled.Text`
  font-size: 14px;
  color: #888;
`;
