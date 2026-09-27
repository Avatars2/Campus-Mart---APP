import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../api/client';
import styles from './styles';

export default function AdminReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const updateReportStatus = async (id, status) => {
    try {
      await client.put(`/admin/reports/${id}`, { status });
      // Update local state
      setReports(reports.map(r => r._id === id ? { ...r, status } : r));
    } catch (error) {
      console.error(`Error updating report status to ${status}:`, error);
      Alert.alert('Error', 'Failed to update report status.');
    }
  };

  const handleResolve = (id) => updateReportStatus(id, 'resolved');
  const handleDismiss = (id) => updateReportStatus(id, 'dismissed');

  const navigateToTarget = (report) => {
    if (report.target_type === 'item' && report.target_info && !report.target_info.error) {
      navigation.navigate('ProductDetail', { item: report.target_info });
    } else if (report.target_type === 'user' && report.target_info && !report.target_info.error) {
      // Navigate to user's store to inspect them
      navigation.navigate('SellerStore', {
        sellerId: report.target_id,
        sellerName: report.target_info.full_name,
        sellerImage: report.target_info.profile_photo_url || null
      });
    } else {
      Alert.alert('Not Found', 'The target of this report could not be found. It may have already been deleted.');
    }
  };

  const renderItem = ({ item }) => {
    const isPending = item.status === 'pending';
    const targetName = item.target_info?.name || item.target_info?.full_name || 'Unknown Target';
    const reporterName = item.reporter_id?.full_name || 'Unknown User';

    return (
      <TouchableOpacity 
        style={[styles.card, !isPending && styles.cardResolved]}
        onPress={() => navigation.navigate('AdminReportDetail', { 
          report: item,
          onStatusUpdate: (id, newStatus) => fetchReports() // Refresh list if status changed
        })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, item.target_type === 'user' ? styles.badgeUser : styles.badgeItem]}>
              <Ionicons name={item.target_type === 'user' ? 'person' : 'cube'} size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>{item.target_type === 'user' ? 'User' : 'Item'}</Text>
            </View>
            <View style={[styles.statusBadge, 
              item.status === 'resolved' ? styles.statusResolved : 
              item.status === 'dismissed' ? styles.statusDismissed : 
              styles.statusPending]}>
              <Text style={[styles.statusText, 
                item.status === 'resolved' ? styles.statusTextResolved : 
                item.status === 'dismissed' ? styles.statusTextDismissed : 
                styles.statusTextPending]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>

        <Text style={styles.reasonText}>{item.reason}</Text>
        <Text style={styles.targetText}>
          Reported <Text style={{fontWeight: '700'}}>{targetName}</Text> by {reporterName}
        </Text>
        
        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Text style={{ color: '#0052CC', fontWeight: '600', fontSize: 13, marginRight: 4 }}>View Report</Text>
          <Ionicons name="chevron-forward" size={16} color="#0052CC" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1F36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Management</Text>
      </View>

      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
