import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

export default function AdminHomeScreen() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation();

  const fetchDashboardData = async () => {
    try {
      const response = await client.get('/admin/dashboard');
      setDashboardData(response.data);
      setErrorMsg('');
    } catch (error) {
      console.error('Failed to fetch admin dashboard:', error);
      setErrorMsg(error.response?.data?.error || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  if (errorMsg && !dashboardData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchDashboardData(); }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greetingText}>Admin Dashboard</Text>
        <Text style={styles.headerTitle}>Overview 📊</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />
        }
      >
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          {/* Total Users */}
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={() => navigation.navigate('AdminUsers')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="people" size={20} color="#4338CA" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.stats?.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </TouchableOpacity>

          {/* Active Items */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="pricetags" size={20} color="#15803D" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.stats?.activeItems || 0}</Text>
            <Text style={styles.statLabel}>Active Items</Text>
          </View>

          {/* Sold Items */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEF9C3' }]}>
              <Ionicons name="bag-check" size={20} color="#A16207" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.stats?.soldItems || 0}</Text>
            <Text style={styles.statLabel}>Sold Items</Text>
          </View>

          {/* Total Orders */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="cart" size={20} color="#7E22CE" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.stats?.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Recently Joined Users</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminUsers')} style={{ marginRight: 20 }}>
            <Text style={{ color: '#0052CC', fontWeight: '600' }}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.recentCard}>
          {dashboardData?.recentUsers?.map((user, index) => (
            <View 
              key={user._id || index} 
              style={[styles.recentUserRow, index === dashboardData.recentUsers.length - 1 && styles.recentUserRowLast]}
            >
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{user.full_name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={[styles.roleBadge, user.role === 'admin' && styles.roleBadgeAdmin]}>
                <Text style={[styles.roleText, user.role === 'admin' && styles.roleTextAdmin]}>
                  {user.role === 'admin' ? 'Admin' : 'Student'}
                </Text>
              </View>
            </View>
          ))}
          {(!dashboardData?.recentUsers || dashboardData.recentUsers.length === 0) && (
            <Text style={{ color: '#697386', textAlign: 'center', paddingVertical: 10 }}>No recent users.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
