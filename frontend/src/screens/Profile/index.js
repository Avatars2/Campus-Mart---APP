import React, { useCallback, useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import client from '../../api/client';
import styles from './styles';
import useScreenRefresh from '../../hooks/useScreenRefresh';

export default function ProfileScreen({ navigation }) {
  const { signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const loadProfile = useCallback(async () => {
    const response = await client.get('/users/profile');
    return response.data.user;
  }, []);
  const saveProfile = useCallback((value) => setProfile(value), []);
  const { loading, refreshing, error, refresh, retry } = useScreenRefresh(loadProfile, saveProfile);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#697386', fontSize: 16, marginBottom: 20 }}>Error loading profile.</Text>
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
    : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#0052CC']} />}>
      {/* Blue Header */}
      <View style={styles.headerBg}>
        <Image
          source={{ uri: profile.profile_photo_url || 'https://via.placeholder.com/150' }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.studentId}>ID: {profile.student_id}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.department || '—'}</Text>
          <Text style={styles.statLabel}>Department</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.year_semester || '—'}</Text>
          <Text style={styles.statLabel}>Year</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{memberSince}</Text>
          <Text style={styles.statLabel}>Joined</Text>
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#F0F4FF' }]}>
              <Ionicons name="mail" size={20} color="#0052CC" />
            </View>
            <Text style={styles.menuText}>Email</Text>
            <Text style={styles.menuValue} numberOfLines={1}>{profile.email}</Text>
          </View>
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#F0FFF4' }]}>
              <Ionicons name="call" size={20} color="#16A34A" />
            </View>
            <Text style={styles.menuText}>Phone</Text>
            <Text style={styles.menuValue}>{profile.phone || '—'}</Text>
          </View>
        </View>
      </View>

      {/* Security */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => navigation.navigate('ChangePassword')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="lock-closed" size={20} color="#7C3AED" />
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
            <View style={[styles.menuIconContainer, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="create" size={20} color="#EA580C" />
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
  );
}
