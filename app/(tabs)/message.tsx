import React from 'react';
import { StyleSheet, View, Text, Image, ScrollView, SafeAreaView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// 웹에 있는 제니님 이미지 URL 배열
const jennyImages = [
  'https://i.namu.wiki/i/R02RR-8aM60N_9b2d_2oT34a2n-y3l_u_2CHJ8v_2f2lqXlE2v8a-p-RKOiXv8n4XzE8m_w.webp',
  'https://talkimg.imbc.com/TVianUpload/tvian/TViews/image/2023/12/24/391394a2-1111-4828-9799-317588383215.jpg',
  'https://thumb.named.com/normal/resize/270/2020/01/17/20200117105018651_1.jpg'
];

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <Ionicons name="chevron-back" size={24} color="#333" />
        <Text style={styles.headerTitle}>Jenny 22</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* 첫 번째 사진 */}
        <Image
          source={{ uri: jennyImages[0] }}
          style={styles.profileImage}
        />

        {/* 키, MBTI, 사는 지역 정보 */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>5'5</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>INFP</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Brooklyn</Text>
          </View>
        </View>

        {/* 두 번째 사진 */}
        <Image
          source={{ uri: jennyImages[1] }}
          style={styles.profileImage}
        />

        {/* 자기소개 */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioText}>
            "Lover of coffee, good books, and spontaneous road trips."
          </Text>
        </View>

        {/* 세 번째 사진 */}
        <Image
          source={{ uri: jennyImages[2] }}
          style={styles.profileImage}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
  },
  container: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  profileImage: {
    width: width - 30,
    height: width - 30,
    borderRadius: 12,
    marginTop: 20,
    backgroundColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 20,
    gap: 50,
  },
  infoBox: {},
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  bioContainer: {
    width: '100%',
    maxWidth: 600,
    marginVertical: 20,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    textAlign: 'center',
  },
});