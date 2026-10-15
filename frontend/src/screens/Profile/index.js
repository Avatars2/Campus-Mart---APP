import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, RefreshControl, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import client from '../../api/client';
import styles from './styles';
import useScreenRefresh from '../../hooks/useScreenRefresh';

export default function ProfileScreen({ navigation }) {
  const { signOut, userRole } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const loadProfile = useCallback(async () => {
    const response = await client.get('/users/profile');
    return response.data.user;
  }, []);
  const saveProfile = useCallback((value) => setProfile(value), []);
  const { loading, refreshing, error, refresh, retry } = useScreenRefresh(loadProfile, saveProfile);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007185" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#6B7280', fontSize: 16, marginBottom: 20 }}>Error loading profile.</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={retry} activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
    : 'N/A';

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Pro<Text style={{ color: '#007185' }}>file</Text></Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#007185']} />}>
        {/* Profile Info */}
        <View style={styles.profileHeaderInfo}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setPhotoViewerVisible(true)}>
            <Image
              source={{ uri: profile.profile_photo_url || 'https://via.placeholder.com/150' }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.studentId}>ID: {profile.student_id}</Text>
        </View>

        {/* Stats Row */}
        {userRole !== 'admin' && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.department || 'N/A'}</Text>
              <Text style={styles.statLabel}>Department</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.year_semester || 'N/A'}</Text>
              <Text style={styles.statLabel}>Year</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{memberSince}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
          </View>
        )}

        {/* Account Info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="mail" size={20} color="#007185" />
              </View>
              <Text style={styles.menuText}>Email</Text>
              <Text style={styles.menuValue}>{profile.email}</Text>
            </View>
            <View style={[styles.menuItem, styles.menuItemLast]}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="call" size={20} color="#007185" />
              </View>
              <Text style={styles.menuText}>Phone</Text>
              <Text style={styles.menuValue}>{profile.phone || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {userRole !== 'admin' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Payments</Text>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => navigation.navigate('Payment', { profile })}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="card-outline" size={20} color="#007185" />
                </View>
                <Text style={styles.menuText}>Payment</Text>
                <Text style={styles.paymentStatus}>
                  {profile.razorpay_account_status === 'activated'
                    ? 'Ready'
                    : ['pending', 'under_review'].includes(profile.razorpay_account_status)
                      ? 'Pending'
                      : profile.razorpay_account_status === 'needs_clarification'
                        ? 'Action needed'
                      : 'Set up payouts'}
                </Text>
                <Ionicons
                  name={profile.razorpay_account_status === 'activated' ? 'checkmark-circle' : 'chevron-forward'}
                  size={18}
                  color={profile.razorpay_account_status === 'activated' ? '#10B981' : '#B0B7C3'}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SUPPORT & SAFETY */}
        {userRole !== 'admin' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Support & Safety</Text>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => navigation.navigate('MyReports')}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="shield-checkmark" size={20} color="#007185" />
                </View>
                <Text style={styles.menuText}>Reports</Text>
                <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Security */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => navigation.navigate('ChangePassword')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="lock-closed" size={20} color="#007185" />
              </View>
              <Text style={styles.menuText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => navigation.navigate('EditProfile', { profile })}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="create" size={20} color="#007185" />
              </View>
              <Text style={styles.menuText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={signOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    
      {/* Full Screen Photo Viewer */}
      <Modal visible={photoViewerVisible} transparent={true} animationType="fade">
        <View style={styles.photoViewerContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            <TouchableOpacity 
              style={styles.photoViewerCloseButton} 
              onPress={() => setPhotoViewerVisible(false)}
            >
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableWithoutFeedback onPress={() => setPhotoViewerVisible(false)}>
              <View style={styles.photoViewerContent}>
                <TouchableWithoutFeedback>
                  <Image
                    source={{ uri: profile.profile_photo_url || 'https://via.placeholder.com/150' }}
                    style={styles.photoViewerImage}
                    resizeMode="contain"
                  />
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
