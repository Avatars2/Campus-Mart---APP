import React, { useState, useCallback, useContext } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Dimensions, Image } from 'react-native';
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
  const [timeRange, setTimeRange] = useState('7d');
  const [timeRangeModalVisible, setTimeRangeModalVisible] = useState(false);
  
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const fetchDashboardData = async (range = timeRange) => {
    try {
      const response = await client.get(`/admin/dashboard?range=${range}`);
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
        <ActivityIndicator size="large" color="#1E3A8A" />
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

  const { stats, trends, activityData, distributionData, recentUsers } = dashboardData;

  // Calculate max value for bar chart scaling
  const allActivityValues = [
    ...(activityData?.newUsers || []),
    ...(activityData?.newItems || [])
  ];
  const maxActivityValue = Math.max(...allActivityValues, 4);

  // Calculate total items for donut chart
  const totalDistItems = distributionData?.reduce((sum, d) => sum + d.count, 0) || 0;

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

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return { bg: '#FCE7F3', text: '#DB2777' };
      case 'student': return { bg: '#DBEAFE', text: '#2563EB' };
      default: return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };


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
            <Text style={styles.heroGreeting}>Welcome back,</Text>
            <Text style={styles.heroSubtitle}>Here's what's happening on CampusMart today.</Text>
            <View style={styles.heroDateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroDateText}>{new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>
          <Ionicons name="desktop-outline" size={100} color="#3B82F6" style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.3 }} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard('Pending User Reports', stats?.pendingReports, stats?.pendingReports > 0 ? 'Needs attention' : 'All clear', 'alert-circle', '#FEE2E2', '#DC2626', stats?.pendingReports > 0 ? '#DC2626' : '#10B981', 'AdminReports')}
          {renderStatCard('Total Platform Users', stats?.totalUsers, trends?.users, 'people', '#E0E7FF', '#4338CA', '#10B981', 'AdminUsers')}
          {renderStatCard('Active Items', stats?.activeItems, trends?.items, 'pricetag', '#FCE7F3', '#DB2777', '#10B981', 'AdminItems')}
          {renderStatCard('Categories', stats?.totalCategories, trends?.categories, 'grid', '#F3E8FF', '#7E22CE', '#10B981', 'AdminCategories')}
          {renderStatCard('Total Orders', stats?.totalOrders, trends?.orders, 'cart', '#E0F2FE', '#0284C7', '#10B981', 'AdminOrders')}
        </View>

        {/* Charts Row */}
        <View style={styles.chartsRow}>
          {/* Platform Activity Bar Chart */}
          <View style={[styles.chartCard, { marginRight: Dimensions.get('window').width < 768 ? 0 : 16 }]}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <Ionicons name="stats-chart" size={18} color="#4B5563" />
                <Text style={styles.chartTitle}>Platform Activity</Text>
              </View>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setTimeRangeModalVisible(true)} activeOpacity={0.7}>
                <Text style={styles.dropdownText}>{timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'Last Year'}</Text>
                <Ionicons name="chevron-down" size={12} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {/* Legend */}
            <View style={{ flexDirection: 'row', marginBottom: 12, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#3B82F6', marginRight: 6 }} />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>New Users</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#A855F7', marginRight: 6 }} />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>New Items</Text>
              </View>
            </View>
            {activityData && activityData.labels.length > 0 ? (
              <View style={{ flex: 1, minHeight: 200 }}>
                {/* Y-axis grid lines */}
                <View style={{ flex: 1, position: 'relative' }}>
                  {[0, 1, 2, 3, 4].map(i => {
                    const val = Math.round((maxActivityValue / 4) * (4 - i));
                    return (
                      <View key={i} style={{ position: 'absolute', top: `${i * 25}%`, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ width: 24, fontSize: 10, color: '#9CA3AF', textAlign: 'right', marginRight: 8 }}>{val}</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#F3F4F6' }} />
                      </View>
                    );
                  })}
                  {/* Bars */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', position: 'absolute', bottom: 0, left: 32, right: 0, top: 0, paddingTop: 4 }}>
                    {activityData.labels.map((label, idx) => {
                      const uHeight = maxActivityValue > 0 ? (activityData.newUsers[idx] / maxActivityValue) * 100 : 0;
                      const iHeight = maxActivityValue > 0 ? (activityData.newItems[idx] / maxActivityValue) * 100 : 0;
                      const numLabels = activityData.labels.length;
                      const barWidth = numLabels > 20 ? 3 : (numLabels > 10 ? 6 : 12);
                      const barGap = numLabels > 20 ? 1 : 3;
                      
                      return (
                        <View key={idx} style={{ alignItems: 'center', flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: '85%', gap: barGap }}>
                            <View style={{ width: barWidth, backgroundColor: '#3B82F6', borderRadius: barWidth / 2, height: `${Math.max(uHeight, 3)}%`, minHeight: 3 }} />
                            <View style={{ width: barWidth, backgroundColor: '#A855F7', borderRadius: barWidth / 2, height: `${Math.max(iHeight, 3)}%`, minHeight: 3 }} />
                          </View>
                          <Text style={{ fontSize: numLabels > 20 ? 7 : 9, color: '#9CA3AF', marginTop: 4, width: '100%', textAlign: 'center' }} numberOfLines={1}>
                            {numLabels > 20 && idx % 3 !== 0 ? '' : label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 40, color: '#9CA3AF' }}>No data available</Text>
            )}
          </View>

          {/* Item Distribution Donut Chart */}
          <View style={[styles.chartCard]}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <Ionicons name="pie-chart" size={18} color="#4B5563" />
                <Text style={styles.chartTitle}>Item Distribution</Text>
              </View>
            </View>
            {distributionData && distributionData.length > 0 ? (
              <View style={{ alignItems: 'center' }}>
                {/* Donut ring */}
                <View style={{ width: 160, height: 160, borderRadius: 80, borderWidth: 20, borderColor: distributionData[0]?.color || '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827' }}>{totalDistItems}</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Total Categories</Text>
                  </View>
                </View>
                {/* Legend */}
                <View style={{ width: '100%' }}>
                  {distributionData.map((item, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                        <Text style={{ fontSize: 13, color: '#4B5563' }}>{item.name}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{item.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 40, color: '#9CA3AF' }}>No data available</Text>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Time Range Modal */}
      {timeRangeModalVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%', maxWidth: 300 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#111827' }}>Select Time Range</Text>
            
            <TouchableOpacity onPress={() => { setTimeRange('7d'); setTimeRangeModalVisible(false); fetchDashboardData('7d'); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, color: timeRange === '7d' ? '#3B82F6' : '#4B5563', fontWeight: timeRange === '7d' ? '600' : '400' }}>Last 7 Days</Text>
              {timeRange === '7d' && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => { setTimeRange('30d'); setTimeRangeModalVisible(false); fetchDashboardData('30d'); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, color: timeRange === '30d' ? '#3B82F6' : '#4B5563', fontWeight: timeRange === '30d' ? '600' : '400' }}>Last 30 Days</Text>
              {timeRange === '30d' && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setTimeRange('1y'); setTimeRangeModalVisible(false); fetchDashboardData('1y'); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, color: timeRange === '1y' ? '#3B82F6' : '#4B5563', fontWeight: timeRange === '1y' ? '600' : '400' }}>Last Year</Text>
              {timeRange === '1y' && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTimeRangeModalVisible(false)} style={{ marginTop: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
              <Text style={{ color: '#4B5563', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
