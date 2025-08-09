import React from "react";
import {
  View,
  StyleSheet,
  Text,
  StatusBar,
  SafeAreaView,
} from "react-native";

export default function LikesYouScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header with shadow */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Likes You</Text>
      </View>

      {/* Empty state message */}
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>
          No likes yet.{'\n'}Someone awesome will like you soon!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    width: '100%',
    height: 71,
    backgroundColor: 'white',
    shadowColor: '#A6A6AA',
    shadowOffset: {
      width: 0,
      height: 0.33,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
    justifyContent: 'flex-end',
    paddingBottom: 15,
    paddingLeft: 21,
  },
  headerTitle: {
    color: 'black',
    fontSize: 32,
    fontFamily: 'Quicksand',
    fontWeight: '600',
    lineHeight: 38.18,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  emptyStateText: {
    textAlign: 'center',
    color: 'black',
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '400',
    lineHeight: 20,
  },
});
