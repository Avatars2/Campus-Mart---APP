import React, { useState, useCallback, useContext } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import { AuthContext } from '../../../context/AuthContext';
import styles from './styles';

export default function AdminHomeScreen() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

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
        <ActivityIndicator size="large" color="#007185" />
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

  const { stats, trends } = dashboardData;

  const renderStatCard = (title, value, trend, icon, iconBg, iconColor, trendColor, navTo, extraContent = null) => (
    <TouchableOpacity 
      style={styles.statCard} 
      onPress={() => navigation.navigate(navTo)}
      activeOpacity={0.8}
    >
      <View style={[styles.statIconWrapper, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value || 0}</Text>
      </View>
      <View style={styles.statTrendContainer}>
        <Ionicons name={trendColor === '#10B981' ? 'arrow-up' : trendColor === '#DC2626' ? 'arrow-down' : 'remove'} size={12} color={trendColor} />
        <Text style={[styles.statTrendText, { color: trendColor }]}>{trend || 'No change'}</Text>
      </View>
      {extraContent}
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={{ flex: 1, zIndex: 2 }}>
            <Text style={styles.heroGreeting}>Welcome back, {user?.full_name ? user.full_name.split(' ')[0] : 'Admin'} 👋</Text>
            <Text style={styles.heroSubtitle}>Here's what's happening on CampusMart today.</Text>
            <View style={styles.heroDateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroDateText}>{new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.heroAnalyticsButton}
            onPress={() => navigation.navigate('AdminAnalytics')}
            activeOpacity={0.85}
          >
            <View style={styles.heroLogoWrapper}>
              <Image
                source={require('../../../../assets/logo.png')}
                style={styles.heroLogoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.heroAnalyticsBadge}>
              <Ionicons name="stats-chart" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Ionicons name="desktop-outline" size={100} color="#3B82F6" style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.15 }} />
        </View>

        
        {/* Quick Management Shortcuts */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>Quick Management</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AdminCreateNotification')} activeOpacity={0.7}>
              <View style={[styles.quickIconWrap, { backgroundColor: '#E6F4F6' }]}>
                <Ionicons name="megaphone" size={20} color="#007185" />
              </View>
              <Text style={styles.quickBtnText}>Broadcast</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AdminCategories')} activeOpacity={0.7}>
              <View style={[styles.quickIconWrap, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="grid" size={20} color="#0F172A" />
              </View>
              <Text style={styles.quickBtnText}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AdminReports')} activeOpacity={0.7}>
              <View style={[styles.quickIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
              </View>
              <Text style={styles.quickBtnText}>Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AdminAnalytics')} activeOpacity={0.7}>
              <View style={[styles.quickIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="stats-chart" size={20} color="#0284C7" />
              </View>
              <Text style={styles.quickBtnText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard('Pending User Reports', stats?.pendingReports, stats?.pendingReports > 0 ? 'Needs attention' : 'All clear', 'alert-circle', '#FEE2E2', '#DC2626', stats?.pendingReports > 0 ? '#DC2626' : '#10B981', 'AdminReports')}
          {renderStatCard('Total Platform Users', stats?.totalUsers, trends?.users, 'people', '#E6F4F6', '#007185', '#10B981', 'AdminUsers')}
          {renderStatCard('Active Items', stats?.activeItems, trends?.items, 'pricetag', '#E0F2FE', '#0284C7', '#10B981', 'AdminItems')}
          {renderStatCard('Categories', stats?.totalCategories, trends?.categories, 'grid', '#F1F5F9', '#0F172A', '#10B981', 'AdminCategories')}
          {renderStatCard('Total Orders', stats?.totalOrders, trends?.orders, 'cart', '#ECFDF5', '#059669', '#10B981', 'AdminOrders')}
          {renderStatCard('Notifications', stats?.totalNotifications, 'Broadcasts & Alerts', 'notifications', '#FEF3C7', '#D97706', '#D97706', 'AdminNotifications')}
        </View>

      </ScrollView>
    </View>
  );
}
