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
        
        <TouchableOpacity 
          style={[styles.statCard, { width: '100%', alignSelf: 'center', backgroundColor: '#FEF2F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, marginBottom: 15, borderColor: '#FCA5A5', borderWidth: 1 }]}
          onPress={() => navigation.navigate('AdminReports')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2', marginBottom: 0, marginRight: 16, width: 52, height: 52, borderRadius: 16 }]}>
              <Ionicons name="warning" size={26} color="#DC2626" />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: '#991B1B', fontWeight: '700' }]}>Pending User Reports</Text>
              <Text style={[styles.statValue, { fontSize: 32, marginBottom: 0, color: '#7F1D1D' }]}>{dashboardData?.stats?.pendingReports || 0}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#DC2626', fontWeight: '600', marginRight: 4 }}>Review</Text>
            <Ionicons name="chevron-forward" size={20} color="#DC2626" />
          </View>
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          {/* Total Users */}
          <TouchableOpacity 
            style={[styles.statCard, { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 }]} 
            onPress={() => navigation.navigate('AdminUsers')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.statIconContainer, { backgroundColor: '#E0E7FF', marginBottom: 0, marginRight: 16, width: 52, height: 52, borderRadius: 16 }]}>
                <Ionicons name="people" size={26} color="#4338CA" />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Platform Users</Text>
                <Text style={[styles.statValue, { fontSize: 32, marginBottom: 0 }]}>{dashboardData?.stats?.totalUsers || 0}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#C1C7D0" />
          </TouchableOpacity>

          {/* Active Items */}
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('AdminItems')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="pricetags" size={20} color="#15803D" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.stats?.activeItems || 0}</Text>
            <Text style={styles.statLabel}>Active Items</Text>
          </TouchableOpacity>

          {/* Sold Items */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEF9C3' }]}>
              <Ionicons name="bag-check" size={20} color="#A16207" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.stats?.soldItems || 0}</Text>
            <Text style={styles.statLabel}>Sold Items</Text>
          </View>

          {/* Categories */}
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('AdminCategories')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="grid" size={20} color="#7E22CE" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.stats?.totalCategories || 0}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </TouchableOpacity>

          {/* Total Orders */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="cart" size={20} color="#0369A1" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.stats?.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Recently Joined Users</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminUsers')} style={{ marginRight: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: '#0052CC', fontWeight: '600', marginRight: 4 }}>View All</Text><Ionicons name="arrow-forward" size={16} color="#0052CC" /></View>
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
