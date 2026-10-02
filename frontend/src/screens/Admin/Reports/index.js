import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../api/client';
import styles from './styles';

export default function AdminReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await client.get('/admin/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching admin reports:', error);
      Alert.alert('Error', 'Failed to load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  // Counts
  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

  // Filtered list
  let filteredReports = reports;
  
  if (activeTab !== 'All') {
    filteredReports = filteredReports.filter(r => r.status === activeTab.toLowerCase());
  }
  
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    filteredReports = filteredReports.filter(r => 
      r.reason?.toLowerCase().includes(lowerQuery) ||
      r.target_info?.name?.toLowerCase().includes(lowerQuery) ||
      r.target_info?.full_name?.toLowerCase().includes(lowerQuery) ||
      r.reporter_id?.full_name?.toLowerCase().includes(lowerQuery)
    );
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending': return { bg: '#FFF7ED', text: '#D97706', icon: 'time', label: 'PENDING' };
      case 'resolved': return { bg: '#ECFDF5', text: '#059669', icon: 'checkmark-circle', label: 'RESOLVED' };
      case 'dismissed': return { bg: '#F3F4F6', text: '#6B7280', icon: 'link-outline', label: 'DISMISSED' };
      default: return { bg: '#F3F4F6', text: '#6B7280', icon: 'help-circle', label: status.toUpperCase() };
    }
  };

  const getReasonIcon = (reason) => {
    const lower = (reason || '').toLowerCase();
    if (lower.includes('spam')) return 'megaphone';
    if (lower.includes('scam') || lower.includes('fraud')) return 'alert-circle';
    if (lower.includes('inappropriate')) return 'person-remove';
    return 'flag';
  };

  const getReasonIconColor = (reason) => {
    const lower = (reason || '').toLowerCase();
    if (lower.includes('spam')) return '#EF4444';
    if (lower.includes('scam') || lower.includes('fraud')) return '#EF4444';
    if (lower.includes('inappropriate')) return '#F59E0B';
    return '#3B82F6';
  };

  const renderItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const targetName = item.target_info?.name || item.target_info?.full_name || 'Unknown Target';
    const reporterName = item.reporter_id?.full_name || 'Unknown User';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('AdminReportDetail', { 
          report: item,
          onStatusUpdate: () => fetchReports()
        })}
        activeOpacity={0.7}
      >
        {/* Card Top: Icon + Status + Date */}
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <View style={[styles.reasonIconWrapper, { backgroundColor: getReasonIconColor(item.reason) + '15' }]}>
              <Ionicons name={getReasonIcon(item.reason)} size={20} color={getReasonIconColor(item.reason)} />
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
              <Text style={[styles.statusChipText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}</Text>
          </View>
        </View>

        {/* Reason Title */}
        <Text style={styles.reasonText}>{item.reason}</Text>

        {/* Reporter Info */}
        <Text style={styles.reporterText}>
          Reported  <Text style={{ fontWeight: '700', color: '#111827' }}>{targetName}</Text>  by  <Text style={{ fontWeight: '600' }}>{reporterName}</Text>
        </Text>

        {/* View Report Link */}
        <TouchableOpacity 
          style={styles.viewReportBtn}
          onPress={() => navigation.navigate('AdminReportDetail', { 
            report: item,
            onStatusUpdate: () => fetchReports()
          })}
        >
          <Text style={styles.viewReportText}>View Report</Text>
          <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Management</Text>
        <View style={{ width: 40 }} />
      </View>


      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by reason, seller, reporter..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pill Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'All' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('All')}
          >
            {activeTab === 'All' && <Ionicons name="grid" size={14} color="#FFFFFF" />}
            <Text style={[styles.tabText, activeTab === 'All' && styles.tabTextActive]}>
              All ({reports.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'Pending' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('Pending')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Pending' ? '#FFFFFF' : '#F59E0B' }]} />
            <Text style={[styles.tabText, activeTab === 'Pending' && styles.tabTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'Resolved' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('Resolved')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Resolved' ? '#FFFFFF' : '#10B981' }]} />
            <Text style={[styles.tabText, activeTab === 'Resolved' && styles.tabTextActive]}>
              Resolved ({resolvedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'Dismissed' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('Dismissed')}
          >
            <View style={[styles.tabDot, { backgroundColor: activeTab === 'Dismissed' ? '#FFFFFF' : '#6B7280' }]} />
            <Text style={[styles.tabText, activeTab === 'Dismissed' && styles.tabTextActive]}>
              Dismissed ({dismissedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Reports List */}
      <FlatList
        data={filteredReports}
        renderItem={renderItem}
        keyExtractor={(item) => item._id || item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No reports found.</Text>
            <Text style={styles.emptySubText}>All clear!</Text>
          </View>
        }
      />
    </View>
  );
}
