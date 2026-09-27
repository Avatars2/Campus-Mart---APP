import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../api/client';

export default function AdminReportDetailScreen({ route, navigation }) {
  const { report: initialReport, onStatusUpdate } = route.params;
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);

  const targetName = report.target_info?.full_name || report.target_info?.name || 'Unknown Target';
  const reporterName = report.reporter_id?.full_name || 'Unknown User';
  const isPending = report.status === 'pending';

  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      await client.put(`/admin/reports/${report._id || report.id}`, { status: newStatus });
      setReport({ ...report, status: newStatus });
      if (onStatusUpdate) onStatusUpdate(report._id || report.id, newStatus);
    } catch (error) {
      console.error('Failed to update status', error);
      Alert.alert('Error', 'Could not update report status.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToTarget = () => {
    if (report.target_type === 'item' && report.target_info && !report.target_info.error) {
      navigation.navigate('ProductDetail', { item: report.target_info });
    } else if (report.target_type === 'user' && report.target_info && !report.target_info.error) {
      navigation.navigate('SellerStore', { sellerId: report.target_info._id || report.target_info.id });
    } else {
      Alert.alert('Unavailable', 'The target could not be loaded.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'reviewed': return '#3B82F6';
      case 'resolved': return '#10B981';
      case 'dismissed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time';
      case 'reviewed': return 'eye';
      case 'resolved': return 'checkmark-circle';
      case 'dismissed': return 'close-circle';
      default: return 'help-circle';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review<Text style={{ color: '#007185' }}>Report</Text></Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.typeRow}>
              <Ionicons name={report.target_type === 'item' ? 'cube' : 'person'} size={20} color={report.target_type === 'item' ? '#8B5CF6' : '#EC4899'} />
              <Text style={styles.typeText}>Reported {report.target_type === 'item' ? 'Listing' : 'User'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '15' }]}>
              <Ionicons name={getStatusIcon(report.status)} size={14} color={getStatusColor(report.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                {report.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Submitted By</Text>
            <Text style={styles.targetName}>{reporterName}</Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Target Details</Text>
            <Text style={styles.targetName}>{targetName}</Text>
            <TouchableOpacity style={styles.inspectBtn} onPress={navigateToTarget}>
              <Ionicons name="eye-outline" size={16} color="#0052CC" />
              <Text style={styles.inspectBtnText}>Inspect Target</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Reason for Report</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={{ width: 4, height: 16, backgroundColor: '#DC2626', borderRadius: 2, marginRight: 8 }} />
              <Text style={styles.reasonText}>{report.reason}</Text>
            </View>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.descriptionText}>{report.description || 'No additional details provided.'}</Text>
          </View>

          {report.proof_image && (
            <View style={styles.infoGroup}>
              <Text style={styles.label}>Attached Proof</Text>
              <Image 
                source={{ uri: report.proof_image }} 
                style={{ width: '100%', height: 250, borderRadius: 8, marginTop: 8, backgroundColor: '#F3F4F6' }}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={styles.footerGroup}>
            <Text style={styles.label}>Date Submitted</Text>
            <Text style={styles.dateText}>{new Date(report.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.moderationCard}>
            <Text style={styles.modTitle}>Moderation Actions</Text>
            <Text style={styles.modDesc}>Resolve this report if appropriate action was taken, or dismiss it if it is invalid.</Text>
            
            <View style={styles.modButtons}>
              <TouchableOpacity 
                style={[styles.modBtn, { backgroundColor: '#F3F4F6', flex: 1, marginRight: 8 }]}
                onPress={() => updateStatus('dismissed')}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#4B5563" size="small" /> : <Text style={{ color: '#4B5563', fontWeight: '700' }}>Dismiss Report</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modBtn, { backgroundColor: '#10B981', flex: 1, marginLeft: 8 }]}
                onPress={() => updateStatus('resolved')}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Mark Resolved</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    position: 'absolute', left: 20, bottom: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0F1111' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 16,
  },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeText: { fontSize: 15, color: '#4B5563', fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  infoGroup: { marginBottom: 20 },
  label: { fontSize: 13, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  targetName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  reasonText: { fontSize: 16, fontWeight: '600', color: '#DC2626' },
  descriptionText: { fontSize: 15, color: '#374151', lineHeight: 22, marginTop: 4 },
  inspectBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#E0E7FF', alignSelf: 'flex-start', borderRadius: 8 },
  inspectBtnText: { color: '#0052CC', fontWeight: '600', marginLeft: 6, fontSize: 13 },
  footerGroup: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  dateText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  moderationCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  modTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  modDesc: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  modButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }
});
